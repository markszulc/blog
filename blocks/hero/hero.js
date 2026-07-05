/* Direction D split-bento hero.
 * Authored as a 2-cell block: [ text content | image ]
 * Or auto-blocked from a leading H1 + picture (see scripts.js buildHeroBlock).
 */
export default function decorate(block) {
  const row = block.firstElementChild;
  if (!row) return;
  const cols = [...row.children];
  const text = cols[0];
  const media = cols[1];

  if (text) text.classList.add('hero-text');
  if (media) {
    media.classList.add('hero-media');
    const pic = media.querySelector('picture');
    if (pic) media.replaceChildren(pic, ...[...media.children].filter((c) => c !== pic));
  }

  block.replaceChildren(...cols);
}
