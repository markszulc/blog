/*
 * Media Split
 * A photo beside a tinted "how it works" panel with numbered steps.
 *   | [picture] / Caption | Favourite experiment / ### Title / 1. step 2. step |
 * The panel is tinted with the colour of the story it's in. Steps come from
 * an ordered (or unordered) list.
 */
import { createOptimizedPicture } from '../../scripts/aem.js';
import { applyPrecedingTopic } from '../../scripts/topics.js';

export default function decorate(block) {
  applyPrecedingTopic(block);
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const mediaCell = cells.find((cell) => cell.querySelector('picture')) || cells[0];
  const panelCell = cells.find((cell) => cell !== mediaCell);

  const figure = document.createElement('figure');
  figure.className = 'media-split-media';
  const img = mediaCell.querySelector('img');
  if (img) figure.append(createOptimizedPicture(img.src, img.alt, false, [{ width: '900' }]));
  const caption = mediaCell.textContent.trim();
  if (caption) {
    const figcaption = document.createElement('figcaption');
    figcaption.textContent = caption;
    figure.append(figcaption);
  }

  const panel = document.createElement('div');
  panel.className = 'media-split-panel';
  if (panelCell) {
    const list = panelCell.querySelector('ol, ul');
    const heading = panelCell.querySelector('h2, h3, h4');
    const paras = [...panelCell.querySelectorAll(':scope > p')];
    // the eyebrow is the paragraph above the heading (or the first one)
    const beforeHeading = (p) => heading && p.nextElementSibling === heading;
    const eyebrow = heading ? paras.find(beforeHeading) : paras.shift();
    const title = heading || paras.shift();

    if (eyebrow) {
      eyebrow.className = 'media-split-eyebrow';
      panel.append(eyebrow);
    }
    if (title) {
      title.classList.add('media-split-title');
      panel.append(title);
    }
    if (list) {
      const ol = document.createElement('ol');
      ol.className = 'media-split-steps';
      [...list.children].forEach((item) => {
        const li = document.createElement('li');
        li.append(...item.childNodes);
        ol.append(li);
      });
      panel.append(ol);
    }
    paras.filter((p) => p !== eyebrow && p !== title).forEach((p) => panel.append(p));
  }

  block.replaceChildren(figure, panel);
}
