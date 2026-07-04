/* Bluesky block — a 3D stacked-card carousel of the latest Bluesky posts.
 *
 * Data comes from the edge-cached bluesky-feed worker (see
 * /cloudflare-worker-bluesky), which returns a small, pre-trimmed JSON. The
 * block decorates in the lazy phase and stays off the critical path:
 *   - the stage reserves a fixed height up front, so nothing shifts (CLS = 0),
 *   - the deck animates with transform/opacity only (GPU-cheap, no layout),
 *   - every image is lazy-loaded; all post text is set via textContent.
 *
 * The front card is largest and centred; the rest recede behind it, smaller
 * and dimmer, for depth. Drag / swipe (or the arrow buttons / keys) flick
 * through them with a smooth settle.
 *
 * Authoring (single cell — hyperlinks OR bare text both work, any order):
 *   1. plain text            → section heading (optional; defaults below)
 *   2. worker URL            → data source (the URL that is NOT bsky.app)
 *   3. bsky.app URL / @handle → "Follow" CTA (optional; derived if omitted)
 */

const DEFAULT_HEADING = 'Latest from Bluesky';
const DISPLAY_COUNT = 6; // cards in the deck
const MAX_DEPTH = 3; // how many cards peek out behind the front one
const SWIPE_THRESHOLD = 56; // px of drag needed to advance
const CLICK_SLOP = 8; // movement under this still counts as a tap/click
const HOVER_GROW = 1.045; // scale bump on hover, a nudge to signal "clickable"

function icon(paths) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

const HEART = icon('<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>');
const REPOST = icon('<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>');
const ARROW = icon('<path d="m15 18-6-6 6-6"/>');
const PLAY = '<span class="bluesky-play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span>';
// Bluesky's official butterfly mark (simple-icons "bluesky.svg"), single fill path.
const BLUESKY_LOGO = '<svg class="bluesky-logo" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'
  + '<path d="M5.202 2.857C7.954 4.922 10.913 9.11 12 11.358c1.087-2.247 4.046-6.436 6.798-8.501C20.783 1.366 24 .213 24 3.883'
  + 'c0 .732-.42 6.156-.667 7.037-.856 3.061-3.978 3.842-6.755 3.37 4.854.826 6.089 3.562 3.422 6.299-5.065 5.196-7.28-1.304'
  + '-7.847-2.97-.104-.305-.152-.448-.153-.327 0-.121-.05.022-.153.327-.568 1.666-2.782 8.166-7.847 2.97-2.667-2.737-1.432'
  + '-5.473 3.422-6.3-2.777.473-5.899-.308-6.755-3.369C.42 10.04 0 4.615 0 3.883c0-3.67 3.217-2.517 5.202-1.026"/></svg>';

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

function statsMarkup(post) {
  return `<span class="bluesky-stat">${HEART}${formatCount(post.likeCount)}</span>`
    + `<span class="bluesky-stat">${REPOST}${formatCount(post.repostCount)}</span>`;
}

// Media that fills the card width. Reserves space via aspect-ratio so the lazy
// image never shifts once it decodes.
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
    img.draggable = false;
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
    img.draggable = false;
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
  link.draggable = false;
  const who = post.author.displayName || post.author.handle;
  link.setAttribute('aria-label', `Post by ${who} on Bluesky`);

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
    av.draggable = false;
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
  if (post.repostBy) {
    const rp = document.createElement('span');
    rp.className = 'bluesky-repost';
    rp.innerHTML = REPOST;
    rp.title = 'Reposted';
    header.append(rp);
  }
  link.append(header);

  const media = mediaEl(post);
  const hasMedia = Boolean(media);

  if (post.text) {
    const text = document.createElement('p');
    text.className = 'bluesky-text';
    if (!hasMedia) text.classList.add('bluesky-text-long');
    text.textContent = post.text;
    link.append(text);
  }

  if (hasMedia) {
    media.classList.add('bluesky-fill');
    const overlay = document.createElement('figcaption');
    overlay.className = 'bluesky-overlay';
    overlay.innerHTML = `<span class="bluesky-date">${formatDate(post.createdAt)}</span>`
      + `<span class="bluesky-stats">${statsMarkup(post)}</span>`;
    media.append(overlay);
    link.append(media);
  } else {
    if (post.external) link.append(externalEl(post.external));
    const footer = document.createElement('span');
    footer.className = 'bluesky-foot';
    footer.innerHTML = `<span class="bluesky-date">${formatDate(post.createdAt)}</span>`
      + `<span class="bluesky-stats">${statsMarkup(post)}</span>`;
    link.append(footer);
  }

  li.append(link);
  return li;
}

function skeletonCard() {
  const li = document.createElement('li');
  li.className = 'bluesky-post bluesky-skeleton';
  li.setAttribute('aria-hidden', 'true');
  li.innerHTML = '<span class="bluesky-head"><span class="sk sk-avatar"></span>'
    + '<span class="bluesky-meta"><span class="sk sk-line sk-name"></span><span class="sk sk-line sk-handle"></span></span></span>'
    + '<span class="sk sk-line"></span><span class="sk sk-line sk-short"></span>'
    + '<span class="sk sk-media"></span>';
  return li;
}

function isDesktop() {
  return window.matchMedia('(min-width: 900px)').matches;
}

// Signed shortest distance from the active card (0 = centre, -1 = left, +1 = right).
function signedOffset(i, active, n) {
  let off = (i - active) % n;
  if (off > n / 2) off -= n;
  if (off < -n / 2) off += n;
  return off;
}

// Mobile: a receding deck — cards stack behind the front one, lifted and dimmed.
// dx is a live drag offset on the front card. Transform/opacity only, no layout.
function placeStack(card, depth, dx, rot, hovered) {
  const scale = Math.max(0.7, 1 - depth * 0.07) * (hovered ? HOVER_GROW : 1);
  const lift = depth * 30;
  card.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% - ${lift}px)) scale(${scale}) rotate(${rot}deg)`;
  card.style.opacity = depth > MAX_DEPTH ? '0' : String(Math.max(0, 1 - depth * 0.26));
  card.style.zIndex = String(100 - depth);
  card.style.pointerEvents = depth === 0 ? '' : 'none';
  card.setAttribute('aria-hidden', depth === 0 ? 'false' : 'true');
}

// Desktop: symmetric coverflow — active card centred and largest, neighbours
// fanned out across the width, smaller and tilted for depth. off can be
// fractional while dragging so the whole fan scrubs smoothly.
function placeFlow(card, off, spread, hovered) {
  const abs = Math.abs(off);
  const x = off * spread;
  const scale = Math.max(0.72, 1 - abs * 0.11) * (hovered ? HOVER_GROW : 1);
  const rotY = Math.max(-22, Math.min(22, -off * 11));
  const z = -abs * 40;
  card.style.transform = `translate(-50%, -50%) translate3d(${x}px, 0, ${z}px) rotateY(${rotY}deg) scale(${scale})`;
  // Visible cards stay fully opaque (depth reads from scale + overlap + z-order);
  // only cards past the fan fade right out.
  const visible = abs <= 2.4;
  card.style.opacity = visible ? '1' : '0';
  card.style.zIndex = String(100 - Math.round(abs * 10));
  card.style.pointerEvents = visible ? '' : 'none';
  card.setAttribute('aria-hidden', abs < 0.5 ? 'false' : 'true');
}

function initDeck(root, stage, feed, cards) {
  const n = cards.length;
  let active = 0;
  let dragging = false;
  let startX = 0;
  let moved = 0;
  let hovered = null;

  function spreadPx() {
    // A fixed fraction of the card width, so neighbours always overlap the
    // active card by the same amount — the fan looks identical on first paint
    // and after every step (no "spreading apart" when a button is pressed).
    const cardW = cards[0].offsetWidth || 360;
    return cardW * 0.66;
  }

  function layout(dragDx = 0) {
    if (isDesktop()) {
      const spread = spreadPx();
      cards.forEach((card, i) => {
        const off = signedOffset(i, active, n) + (spread ? dragDx / spread : 0);
        placeFlow(card, off, spread, card === hovered);
      });
    } else {
      cards.forEach((card, i) => {
        const depth = (i - active + n) % n;
        const dx = depth === 0 ? dragDx : 0;
        const rot = depth === 0 ? dragDx * 0.02 : 0;
        placeStack(card, depth, dx, rot, card === hovered);
      });
    }
  }

  function go(delta) {
    active = (active + delta + n) % n;
    layout();
  }

  function onDown(event) {
    if (n < 2 || event.button > 0) return;
    dragging = true;
    startX = event.clientX;
    moved = 0;
    feed.classList.add('is-dragging');
    if (feed.setPointerCapture) feed.setPointerCapture(event.pointerId);
  }

  function onMove(event) {
    if (!dragging) return;
    moved = event.clientX - startX;
    layout(moved);
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    feed.classList.remove('is-dragging');
    const threshold = isDesktop() ? Math.max(44, spreadPx() * 0.28) : SWIPE_THRESHOLD;
    if (moved <= -threshold) go(1);
    else if (moved >= threshold) go(-1);
    else layout();
  }

  feed.addEventListener('pointerdown', onDown);
  feed.addEventListener('pointermove', onMove);
  feed.addEventListener('pointerup', onUp);
  feed.addEventListener('pointercancel', onUp);
  // A real drag shouldn't open a link; a click on a neighbour re-centres it.
  feed.addEventListener('click', (event) => {
    if (Math.abs(moved) > CLICK_SLOP) { event.preventDefault(); return; }
    const li = event.target.closest('.bluesky-post');
    if (!li) return;
    const idx = cards.indexOf(li);
    if (idx !== -1 && idx !== active) {
      event.preventDefault();
      active = idx;
      layout();
    }
  }, true);

  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') { go(-1); event.preventDefault(); } else if (event.key === 'ArrowRight') { go(1); event.preventDefault(); }
  });

  // Grow the card under the pointer a touch, so it reads as interactive.
  // Real-mouse only — touch has no hover state to fake.
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    cards.forEach((card) => {
      card.addEventListener('mouseenter', () => {
        if (dragging) return;
        hovered = card;
        layout();
      });
      card.addEventListener('mouseleave', () => {
        if (hovered === card) { hovered = null; layout(); }
      });
    });
  }

  window.addEventListener('resize', () => layout());

  layout();
  return { next: () => go(1), prev: () => go(-1) };
}

export default async function decorate(block) {
  // Accept either real hyperlinks or bare-text URLs/handles — authors don't
  // always remember to hyperlink the worker URL in the source document.
  const links = [...block.querySelectorAll('a')];
  const urls = [...links.map((a) => a.href), ...(block.textContent.match(/https?:\/\/[^\s<]+/g) || [])];

  const endpoint = urls.find((u) => !u.includes('bsky.app'));

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

  // --- shell (built before any network work, with reserved height) ---
  block.replaceChildren();
  block.setAttribute('role', 'group');
  block.setAttribute('aria-roledescription', 'carousel');
  block.setAttribute('aria-label', heading);
  block.tabIndex = 0;

  const head = document.createElement('div');
  head.className = 'bluesky-header';
  const h2 = document.createElement('h2');
  h2.textContent = heading;
  head.append(h2);

  const follow = document.createElement('a');
  follow.className = 'bluesky-follow';
  follow.target = '_blank';
  follow.rel = 'noopener';
  const followLabel = document.createElement('span');
  followLabel.textContent = profileLabel;
  follow.innerHTML = BLUESKY_LOGO;
  follow.append(followLabel);
  if (profileUrl) {
    follow.href = profileUrl;
    head.append(follow);
  }

  const carousel = document.createElement('div');
  carousel.className = 'bluesky-carousel';
  const stage = document.createElement('div');
  stage.className = 'bluesky-stage';
  const feed = document.createElement('ul');
  feed.className = 'bluesky-feed';
  stage.append(feed);
  carousel.append(stage);

  // skeleton deck (3 stacked) so the loading state already reads as 3D
  const skels = [];
  for (let i = 0; i < 3; i += 1) {
    const s = skeletonCard();
    feed.append(s);
    skels.push(s);
  }
  skels.forEach((s, i) => placeStack(s, i, 0, 0));

  block.append(head, carousel);

  if (!endpoint) {
    carousel.remove();
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
      carousel.remove();
      return;
    }

    const cards = posts.map(postCard);
    feed.replaceChildren(...cards);

    // prev / next flank the deck on the left and right edges
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'bluesky-nav bluesky-prev';
    prev.setAttribute('aria-label', 'Previous post');
    prev.innerHTML = ARROW;
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'bluesky-nav bluesky-next';
    next.setAttribute('aria-label', 'Next post');
    next.innerHTML = ARROW;
    carousel.append(prev, next);

    const deck = initDeck(block, stage, feed, cards);
    prev.addEventListener('click', deck.prev);
    next.addEventListener('click', deck.next);
    if (cards.length < 2) {
      prev.hidden = true;
      next.hidden = true;
    }
  } catch (error) {
    carousel.remove();
  }
}
