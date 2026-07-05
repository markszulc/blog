/* Direction D stats bento.
 * Authored rows (each row = one tile):
 *   [ type | big-number-or-image | label | sub ]
 * type ∈ { dark, dark wide, tags, media, media big, media wide }
 * "wide" spans 2 columns and works on any type; "big" (media only) spans
 * 2 columns and 2 rows.
 */
import { createOptimizedPicture } from '../../scripts/aem.js';

// Same category → color-key mapping as the cards block, so a category
// name reads with the same color whether it's a card eyebrow or a tag
// chip here.
const CATS = {
  'home automation': 'home',
  '3d printing': 'print',
  energy: 'energy',
  cosmere: 'cosmere',
  adobe: 'adobe',
  maker: 'maker',
};

export default function decorate(block) {
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const type = (cells[0]?.textContent || '').trim().toLowerCase();
    row.className = 'stat';
    type.split(/\s+/).forEach((t) => t && row.classList.add(t));
    cells[0]?.remove();

    if (row.classList.contains('media')) {
      const img = row.querySelector('img');
      if (img) {
        const pic = createOptimizedPicture(img.src, img.alt, false, [{ width: '900' }]);
        row.replaceChildren(pic);
      }
      return;
    }

    const [first, second, third] = [...row.children];
    if (first) first.classList.add(row.classList.contains('tags') ? 'chips' : 'num');
    if (second) second.classList.add('label');
    if (third) third.classList.add('sub');

    if (row.classList.contains('tags') && first) {
      const words = first.textContent.split(/[,\n]/).map((w) => w.trim()).filter(Boolean);
      first.replaceChildren(...words.map((w) => {
        const s = document.createElement('span');
        const key = CATS[w.toLowerCase()];
        s.className = key ? `chip ${key}` : 'chip';
        s.textContent = w;
        return s;
      }));
    }
  });
}
