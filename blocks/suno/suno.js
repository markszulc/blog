/*
 * Suno Block
 * A Suno player with a playlist of songs underneath. Each row is one song:
 *   | [cover image] | Song title | Description | https://suno.com/song/<id> |
 * Image, title and description are optional; the first text cell is the
 * title, the second the description. Suno doesn't expose song metadata to the
 * browser (no CORS), so titles and art come from the document.
 * Share short links (suno.com/s/...) can't be resolved client-side — use
 * the full /song/<id> link from the song page.
 */

const SUNO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getSongId = (href) => {
  try {
    const url = new URL(href);
    if (!url.hostname.endsWith('suno.com')) return null;
    const id = url.pathname.split('/').filter(Boolean).pop();
    return SUNO_ID.test(id) ? id : null;
  } catch (e) {
    return null;
  }
};

const SUNO_URL = /https?:\/\/(?:www\.)?suno\.com\/\S+/i;

// The song URL may be a hyperlink or plain text pasted into a cell.
const findUrlCell = (row) => [...row.children].find((cell) => cell.querySelector('a[href*="suno.com"]') || SUNO_URL.test(cell.textContent));

const parseSongs = (block) => [...block.children].map((row) => {
  const urlCell = findUrlCell(row);
  if (!urlCell) return null;
  const link = urlCell.querySelector('a[href*="suno.com"]');
  const href = link ? link.href : urlCell.textContent.match(SUNO_URL)[0];
  const id = getSongId(href);
  if (!id) {
    // eslint-disable-next-line no-console
    console.warn(`suno: can't embed ${href} — share links (suno.com/s/...) don't work, use the full suno.com/song/<id> link`);
    return null;
  }
  const picture = row.querySelector('picture');
  const [title, description] = [...row.children]
    .filter((cell) => cell !== urlCell && !cell.querySelector('picture'))
    .map((cell) => cell.textContent.trim())
    .filter(Boolean);
  const linkText = link ? link.textContent.trim() : '';
  return {
    id,
    href: `https://suno.com/song/${id}`,
    title: title || (linkText && !SUNO_URL.test(linkText) ? linkText : ''),
    description,
    picture,
  };
}).filter(Boolean);

const createPlayer = (song) => {
  const iframe = document.createElement('iframe');
  iframe.src = `https://suno.com/embed/${song.id}`;
  iframe.title = song.title ? `${song.title} on Suno` : 'Song on Suno';
  iframe.allow = 'autoplay; encrypted-media';
  iframe.loading = 'lazy';
  return iframe;
};

export default function decorate(block) {
  const songs = parseSongs(block);
  block.textContent = '';
  if (!songs.length) return;

  const player = document.createElement('div');
  player.className = 'suno-player';
  block.append(player);

  // Defer the iframe until the block is near the viewport.
  let iframe;
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      observer.disconnect();
      if (!iframe) {
        iframe = createPlayer(songs[0]);
        player.append(iframe);
      }
    }
  }, { rootMargin: '200px' });
  observer.observe(block);

  if (songs.length < 2) return;

  const list = document.createElement('ol');
  list.className = 'suno-list';

  const select = (index, button) => {
    const song = songs[index];
    if (!iframe) {
      observer.disconnect();
      iframe = createPlayer(song);
      player.append(iframe);
    } else {
      iframe.src = `https://suno.com/embed/${song.id}`;
      iframe.title = song.title ? `${song.title} on Suno` : 'Song on Suno';
    }
    list.querySelectorAll('[aria-current]').forEach((b) => b.removeAttribute('aria-current'));
    button.setAttribute('aria-current', 'true');
    const { top } = player.getBoundingClientRect();
    if (top < 0) player.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  songs.forEach((song, index) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'suno-track';
    if (index === 0) button.setAttribute('aria-current', 'true');

    const num = document.createElement('span');
    num.className = 'suno-track-num';
    num.textContent = String(index + 1).padStart(2, '0');

    const art = document.createElement('span');
    art.className = 'suno-track-art';
    if (song.picture) art.append(song.picture);

    const text = document.createElement('span');
    text.className = 'suno-track-text';
    const name = document.createElement('span');
    name.className = 'suno-track-title';
    name.textContent = song.title || `Track ${index + 1}`;
    text.append(name);
    if (song.description) {
      const desc = document.createElement('span');
      desc.className = 'suno-track-desc';
      desc.textContent = song.description;
      text.append(desc);
    }

    button.append(num, art, text);
    button.addEventListener('click', () => select(index, button));

    const open = document.createElement('a');
    open.className = 'suno-track-open';
    open.href = song.href;
    open.target = '_blank';
    open.rel = 'noopener';
    open.setAttribute('aria-label', `Open ${name.textContent} on Suno`);
    open.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>';

    li.append(button, open);
    list.append(li);
  });

  block.append(list);
}
