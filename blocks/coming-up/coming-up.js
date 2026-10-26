/*
 * Coming Up
 * A dashed teaser strip for an upcoming series.
 *   | Series · Coming soon / **Going electric** |
 *   | Pt 1 | Choosing the EV |
 *   | Pt 2 | Upgrading solar |
 * The first row is the eyebrow and series title. Each following row is one
 * part; leave out the label cell and it's numbered "Pt 1", "Pt 2"...
 */
import { applyPrecedingTopic } from '../../scripts/topics.js';

export default function decorate(block) {
  applyPrecedingTopic(block);
  const [introRow, ...partRows] = [...block.children];

  const intro = document.createElement('div');
  intro.className = 'coming-up-intro';
  const lines = [...introRow.querySelectorAll('p, h2, h3, h4')];
  const [eyebrow, title] = lines.length > 1 ? lines : [null, lines[0]];
  if (eyebrow) {
    const el = document.createElement('div');
    el.className = 'coming-up-eyebrow';
    el.textContent = eyebrow.textContent.trim();
    intro.append(el);
  }
  if (title) {
    const el = document.createElement('div');
    el.className = 'coming-up-title';
    el.textContent = title.textContent.trim();
    intro.append(el);
  }

  const parts = document.createElement('ol');
  parts.className = 'coming-up-parts';
  partRows.forEach((row, i) => {
    const cells = [...row.children];
    const li = document.createElement('li');
    li.innerHTML = '<span class="coming-up-label"></span><span class="coming-up-part"></span>';
    li.children[0].textContent = cells.length > 1 ? cells[0].textContent.trim() : `Pt ${i + 1}`;
    li.children[1].textContent = cells[cells.length - 1].textContent.trim();
    parts.append(li);
  });

  block.replaceChildren(intro, parts);
}
