/*
 * Bench Lesson
 * A dark callout for a lesson learned.
 *   | Lesson from the bench | Check the wiring before you **rewrite the code**. / Paragraph |
 * The label cell is optional. The title is the first heading, or the first
 * paragraph; bold or italic text in it takes the story's colour.
 */
import { applyPrecedingTopic } from '../../scripts/topics.js';

export default function decorate(block) {
  applyPrecedingTopic(block);
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const body = cells[cells.length - 1];

  const label = document.createElement('div');
  label.className = 'bench-lesson-label';
  label.textContent = cells.length > 1 ? cells[0].textContent.trim() : 'Lesson from the bench';

  const titleSource = body.querySelector('h2, h3, h4') || body.querySelector('p');
  const title = document.createElement('div');
  title.className = 'bench-lesson-title';
  if (titleSource) {
    title.append(...titleSource.childNodes);
    titleSource.remove();
  }

  const content = document.createElement('div');
  content.append(title, ...body.children);
  block.replaceChildren(label, content);
}
