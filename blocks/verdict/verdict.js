/*
 * Verdict
 * A soft-blue panel with the bottom-line takeaway.
 *   | Verdict | **Mostly hype and novelty — for now.** / Supporting paragraph |
 * The label cell is optional (defaults to "Verdict"). The title is the first
 * heading, or the first paragraph if there's no heading.
 */

export default function decorate(block) {
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const body = cells[cells.length - 1];
  const labelText = cells.length > 1 ? cells[0].textContent.trim() : 'Verdict';

  const label = document.createElement('div');
  label.className = 'verdict-label';
  label.textContent = labelText;

  const titleSource = body.querySelector('h2, h3, h4') || body.querySelector('p');
  const title = document.createElement('div');
  title.className = 'verdict-title';
  if (titleSource) {
    title.textContent = titleSource.textContent.trim();
    titleSource.remove();
  }

  const content = document.createElement('div');
  content.append(title, ...body.children);

  const panel = document.createElement('div');
  panel.className = 'verdict-panel';
  panel.append(label, content);
  block.replaceChildren(panel);
}
