/* Bluesky block — a responsive grid of the latest posts from a Bluesky feed.
 *
 * Data comes from the edge-cached bluesky-feed worker (see
 * /cloudflare-worker-bluesky), which returns a small, pre-trimmed JSON. The
 * block decorates in the lazy phase and never sits on the critical path:
 *   - it paints skeleton cards with reserved height immediately, so swapping
 *     in real posts causes no layout shift (CLS = 0),
 *   - every image is lazy-loaded with an explicit aspect-ratio,
 *   - all post text is rendered via textContent (never innerHTML).
 *
 * Authoring (single cell, one line each — order-independent):
 *   1. plain text            → section heading (optional; defaults below)
 *   2. link to worker URL    → data source (the one link that is NOT bsky.app)
 *   3. link to bsky.app/...  → "Follow" CTA (optional; label = link text)
 */

const DEFAULT_HEADING = 'Latest from Bluesky';
const DISPLAY_COUNT = 6; // cards shown (and skeletons reserved)

function icon(paths, extra = '') {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${paths}</svg>`;
}

const HEART = icon('<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>');
const REPOST = icon('<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>');
const PLAY = '<span class="bluesky-play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span>';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCount(n) {
  if (!n) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

// Build a media <figure> that reserves its space via aspect-ratio so it never
// shifts layout once the lazy image decodes.
function mediaEl(post) {
  const shots = post.video ? [post.video] : post.images;
  if (!shots || !shots.length) return null;

  const figure = document.createElement('figure');
  figure.className = `bluesky-media bluesky-media-${Math.min(shots.length, 4)}`;

  shots.slice(0, 4).forEach((im) => {
    const frame = document.createElement('div');
    frame.className = 'bluesky-frame';
    if (im.width && im.height) frame.style.setProperty('--ar', `${im.width} / ${im.height}`);

    const img = document.createElement('img');
    img.src = im.thumb;
    img.alt = im.alt || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    if (im.width) img.width = im.width;
    if (im.height) img.height = im.height;
    frame.append(img);

    if (post.video) frame.insertAdjacentHTML('beforeend', PLAY);
    figure.append(frame);
  });
  return figure;
}

function externalEl(ext) {
  const wrap = document.createElement('span');
  wrap.className = 'bluesky-external';
  if (ext.thumb) {
    const img = document.createElement('img');
    img.src = ext.thumb;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    wrap.append(img);
  }
  const body = document.createElement('span');
  body.className = 'bluesky-external-body';
  const title = document.createElement('span');
  title.className = 'bluesky-external-title';
  title.textContent = ext.title || ext.uri;
  const host = document.createElement('span');
  host.className = 'bluesky-external-host';
  try {
    host.textContent = new URL(ext.uri).hostname.replace(/^www\./, '');
  } catch {
    host.textContent = '';
  }
  body.append(title, host);
  wrap.append(body);
  return wrap;
}

function postCard(post) {
  const li = document.createElement('li');
  li.className = 'bluesky-post';

  const link = document.createElement('a');
  link.className = 'bluesky-post-link';
  link.href = post.url;
  link.target = '_blank';
  link.rel = 'noopener';
  const who = post.author.displayName || post.author.handle;
  link.setAttribute('aria-label', `Post by ${who} on Bluesky`);

  // header: avatar + name/handle (+ repost note)
  const header = document.createElement('span');
  header.className = 'bluesky-head';
  if (post.author.avatar) {
    const av = document.createElement('img');
    av.className = 'bluesky-avatar';
    av.src = post.author.avatar;
    av.alt = '';
    av.width = 40;
    av.height = 40;
    av.loading = 'lazy';
    av.decoding = 'async';
    header.append(av);
  }
  const meta = document.createElement('span');
  meta.className = 'bluesky-meta';
  const name = document.createElement('span');
  name.className = 'bluesky-name';
  name.textContent = who;
  const handle = document.createElement('span');
  handle.className = 'bluesky-handle';
  handle.textContent = `@${post.author.handle}`;
  meta.append(name, handle);
  header.append(meta);
  link.append(header);

  if (post.repostBy) {
    const rp = document.createElement('span');
    rp.className = 'bluesky-repost';
    rp.innerHTML = `${REPOST}<span>Reposted</span>`;
    link.append(rp);
  }

  if (post.text) {
    const text = document.createElement('p');
    text.className = 'bluesky-text';
    text.textContent = post.text;
    link.append(text);
  }

  const media = mediaEl(post);
  if (media) link.append(media);
  else if (post.external) link.append(externalEl(post.external));

  // footer: date + like/repost counts
  const footer = document.createElement('span');
  footer.className = 'bluesky-foot';
  const date = document.createElement('span');
  date.className = 'bluesky-date';
  date.textContent = formatDate(post.createdAt);
  const stats = document.createElement('span');
  stats.className = 'bluesky-stats';
  stats.innerHTML = `<span class="bluesky-stat">${HEART}${formatCount(post.likeCount)}</span>`
    + `<span class="bluesky-stat">${REPOST}${formatCount(post.repostCount)}</span>`;
  footer.append(date, stats);
  link.append(footer);

  li.append(link);
  return li;
}

function skeletonCard() {
  const li = document.createElement('li');
  li.className = 'bluesky-post bluesky-skeleton';
  li.innerHTML = '<span class="bluesky-head"><span class="sk sk-avatar"></span>'
    + '<span class="bluesky-meta"><span class="sk sk-line sk-name"></span><span class="sk sk-line sk-handle"></span></span></span>'
    + '<span class="sk sk-line"></span><span class="sk sk-line"></span><span class="sk sk-line sk-short"></span>'
    + '<span class="sk sk-media"></span>';
  li.setAttribute('aria-hidden', 'true');
  return li;
}

export default async function decorate(block) {
  // Accept either real hyperlinks or bare-text URLs/handles — authors don't
  // always remember to hyperlink the worker URL in the source document.
  const links = [...block.querySelectorAll('a')];
  const urls = [...links.map((a) => a.href), ...(block.textContent.match(/https?:\/\/[^\s<]+/g) || [])];

  // Data source: the one URL that isn't a bsky.app link.
  const endpoint = urls.find((u) => !u.includes('bsky.app'));

  // Follow target: a bsky.app URL, else derived from an @handle in the text.
  const profileLink = links.find((a) => a.href.includes('bsky.app'));
  const handleMatch = block.textContent.match(/@([a-z0-9.-]+\.[a-z]{2,})/i);
  let profileUrl = urls.find((u) => u.includes('bsky.app'))
    || (handleMatch && `https://bsky.app/profile/${handleMatch[1]}`)
    || null;

  const textLines = [...block.querySelectorAll('p, h1, h2, h3, h4, li')]
    .map((el) => el.textContent.trim())
    .filter(Boolean);
  const isMeta = (t) => /^https?:\/\//i.test(t) || /^follow\b/i.test(t) || t.startsWith('@');
  const heading = textLines.find((t) => !isMeta(t)) || DEFAULT_HEADING;

  const followText = textLines.find((t) => /^follow\b/i.test(t) || t.startsWith('@'));
  const profileLabel = (profileLink && profileLink.textContent.trim()) || followText || 'Follow on Bluesky';

  // Build the shell with reserved-height skeletons before any network work.
  block.replaceChildren();

  const head = document.createElement('div');
  head.className = 'bluesky-header';
  const h2 = document.createElement('h2');
  h2.textContent = heading;
  head.append(h2);

  const follow = document.createElement('a');
  follow.className = 'bluesky-follow';
  follow.target = '_blank';
  follow.rel = 'noopener';
  follow.textContent = profileLabel;
  if (profileUrl) {
    follow.href = profileUrl;
    head.append(follow);
  }

  const list = document.createElement('ul');
  list.className = 'bluesky-feed';
  for (let i = 0; i < DISPLAY_COUNT; i += 1) list.append(skeletonCard());

  block.append(head, list);

  if (!endpoint) {
    // Nothing to fetch — leave skeletons out and just keep the follow CTA.
    list.remove();
    return;
  }

  try {
    const res = await fetch(endpoint, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    const posts = (data.posts || []).slice(0, DISPLAY_COUNT);

    if (!profileUrl && data.profile) {
      profileUrl = data.profile;
      follow.href = profileUrl;
      if (!follow.isConnected) head.append(follow);
    }

    if (!posts.length) {
      list.remove();
      return;
    }

    const frag = document.createDocumentFragment();
    posts.forEach((p) => frag.append(postCard(p)));
    list.replaceChildren(frag);
  } catch (error) {
    // Fail quietly: drop the skeletons, keep the heading + follow link.
    list.remove();
  }
}
