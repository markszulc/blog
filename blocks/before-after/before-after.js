/*
 * Before / After
 * Two linked cards comparing versions, joined by an arrow. The second card
 * is the dark "after" card.
 *   | Before · 2020 demo | Something Missing / Bedroom demo, one-line vocal | [SoundCloud](https://...) |
 *   | After · 2026 Suno  | Something Missing / Full vocals and mix           | [Suno](https://...)       |
 * Cells: label, then title and subtitle, then the link (its text is the
 * platform name shown top-right).
 */
import { unbutton } from '../../scripts/topics.js';

function buildCard(row, index) {
  unbutton(row);
  const cells = [...row.children];
  const link = row.querySelector('a');
  const label = cells.length > 1 ? cells[0] : null;
  const lines = cells.slice(label ? 1 : 0)
    .flatMap((cell) => [...cell.querySelectorAll('p, h2, h3, h4')])
    .filter((p) => !p.contains(link))
    .map((p) => p.textContent.trim())
    .filter(Boolean);

  const card = document.createElement(link ? 'a' : 'div');
  card.className = `before-after-card ${index === 0 ? 'before' : 'after'}`;
  if (link) card.href = link.href;

  const top = document.createElement('div');
  top.className = 'before-after-top';
  top.innerHTML = '<span class="before-after-label"></span><span class="before-after-platform"></span>';
  top.children[0].textContent = label?.textContent.trim() || (index === 0 ? 'Before' : 'After');
  top.children[1].textContent = link ? `${link.textContent.trim()} ↗` : '';

  const main = document.createElement('div');
  main.className = 'before-after-main';
  main.innerHTML = '<span class="before-after-play" aria-hidden="true"></span><div><div class="before-after-title"></div><div class="before-after-sub"></div></div>';
  main.querySelector('.before-after-title').textContent = lines[0] || '';
  main.querySelector('.before-after-sub').textContent = lines.slice(1).join(' ');

  card.append(top, main);
  return card;
}

export default function decorate(block) {
  const [before, after] = [...block.children].map(buildCard);
  const arrow = document.createElement('div');
  arrow.className = 'before-after-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '→';
  block.replaceChildren(...[before, arrow, after].filter(Boolean));
}
