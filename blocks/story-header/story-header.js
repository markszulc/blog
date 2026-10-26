/*
 * Story Header
 * Opens a story: number, topic chip, heading and intro paragraphs.
 *   | AI                                 |
 *   | ## Heading / intro paragraphs...   |
 * Add a second cell with a picture (and an optional caption under it) to
 * show a portrait image beside the text:
 *   | ## Heading / paragraphs... | [picture] / Caption |
 * Stories are numbered in page order. The topic colours the chip and any
 * figure, media-split, coming-up or bench-lesson that follows.
 */
import { applyTopic } from '../../scripts/topics.js';

function buildFigure(cell) {
  const figure = document.createElement('figure');
  figure.className = 'story-header-figure';
  const frame = document.createElement('div');
  frame.className = 'story-header-frame';
  frame.append(cell.querySelector('picture'));
  figure.append(frame);
  const caption = cell.textContent.trim();
  if (caption) {
    const figcaption = document.createElement('figcaption');
    figcaption.textContent = caption;
    figure.append(figcaption);
  }
  return figure;
}

export default function decorate(block) {
  const rows = [...block.children];
  const topicRow = rows.length > 1 && !rows[0].querySelector('h1, h2, h3, picture') ? rows.shift() : null;
  const topic = topicRow?.textContent.trim() || '';
  applyTopic(block, topic);

  const cells = rows.flatMap((row) => [...row.children]);
  const figureCell = cells.find((cell) => cell.querySelector('picture') && !cell.querySelector('h1, h2, h3'));

  const index = [...document.querySelectorAll('main .story-header')].indexOf(block) + 1;
  const meta = document.createElement('div');
  meta.className = 'story-header-meta';
  meta.innerHTML = `<span class="story-header-num">${String(index).padStart(2, '0')}</span><span class="story-header-rule"></span>`;
  if (topic) {
    const chip = document.createElement('span');
    chip.className = 'story-header-chip';
    chip.textContent = topic;
    meta.append(chip);
  }

  const text = document.createElement('div');
  text.className = 'story-header-text';
  text.append(meta);
  cells.filter((cell) => cell !== figureCell).forEach((cell) => text.append(...cell.children));

  if (figureCell) {
    block.classList.add('portrait');
    block.replaceChildren(text, buildFigure(figureCell));
  } else {
    block.replaceChildren(text);
  }
}
