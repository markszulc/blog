/*
 * Figure
 * A full-width rounded image with a caption.
 *   | [picture] | Caption text |
 * The caption can also sit under the picture in the same cell. The caption
 * dot takes the colour of the story it's in.
 */
import { createOptimizedPicture } from '../../scripts/aem.js';
import { applyPrecedingTopic } from '../../scripts/topics.js';

export default function decorate(block) {
  applyPrecedingTopic(block);
  const img = block.querySelector('img');
  const caption = block.textContent.trim();

  const figure = document.createElement('figure');
  const frame = document.createElement('div');
  frame.className = 'figure-frame';
  if (img) frame.append(createOptimizedPicture(img.src, img.alt, false, [{ media: '(min-width: 600px)', width: '1600' }, { width: '750' }]));
  figure.append(frame);

  if (caption) {
    const figcaption = document.createElement('figcaption');
    figcaption.textContent = caption;
    figure.append(figcaption);
  }
  block.replaceChildren(figure);
}
