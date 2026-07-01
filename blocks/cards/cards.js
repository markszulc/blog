import { createOptimizedPicture } from '../../scripts/aem.js';

const CATS = {
  'home automation': 'home',
  '3d printing': 'print',
  energy: 'energy',
  cosmere: 'cosmere',
};

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.innerHTML = row.innerHTML;
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'cards-card-image';
        const notch = document.createElement('div');
        notch.className = 'notch-r';
        div.append(notch);
      } else {
        div.className = 'cards-card-body';
        const eyebrow = div.querySelector('p, span');
        if (eyebrow) {
          // Match on a leading category name regardless of what separator
          // (·, •, -, or none) an author types before the reading time.
          const text = eyebrow.textContent.trim().toLowerCase();
          const key = Object.keys(CATS).find((cat) => text.startsWith(cat));
          if (key) eyebrow.classList.add('category', CATS[key]);
        }
      }
    });
    ul.append(li);
  });
  ul.querySelectorAll('img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
  block.textContent = '';
  block.append(ul);
}
