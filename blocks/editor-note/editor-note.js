/*
 * Editor Note
 * The issue's opening note with a byline underneath.
 *   | Lead paragraph / more paragraphs...                        |
 *   | [photo] Mark Szulc / 6 min read | Short note on the right |
 * The first paragraph renders as a larger lead. The byline row is optional;
 * without a photo the avatar shows the author's initials.
 */

export default function decorate(block) {
  const [bodyRow, bylineRow] = [...block.children];

  const body = document.createElement('div');
  body.className = 'editor-note-body';
  body.append(...bodyRow.firstElementChild.children);
  body.querySelector('p')?.classList.add('editor-note-lead');

  const parts = [body];
  if (bylineRow) {
    const [who, note] = [...bylineRow.children];
    const lines = [...who.querySelectorAll('p')].filter((p) => !p.querySelector('picture'));
    const picture = who.querySelector('picture');
    const name = (lines[0] || who).textContent.trim();

    const avatar = document.createElement('div');
    avatar.className = 'editor-note-avatar';
    if (picture) avatar.append(picture);
    else avatar.textContent = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2);

    const meta = document.createElement('div');
    meta.className = 'editor-note-meta';
    meta.innerHTML = '<div class="editor-note-name"></div><div class="editor-note-detail"></div>';
    meta.children[0].textContent = name;
    meta.children[1].textContent = lines[1]?.textContent.trim() || '';

    const byline = document.createElement('div');
    byline.className = 'editor-note-byline';
    byline.append(avatar, meta);
    if (note && note.textContent.trim()) {
      note.className = 'editor-note-aside';
      byline.append(note);
    }
    parts.push(byline);
  }
  block.replaceChildren(...parts);
}
