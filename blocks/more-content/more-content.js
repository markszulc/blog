/*
 * More Content
 * A heading row plus tinted cards linking to topic hubs.
 *   | ## Go deeper | [All issues →](/newsletter/archive) |
 *   | [Adobe & AI](/adobe) | Agents, CMS and brand visibility. | Topic hub |
 *   | [Smart Home](/smart-home) | Solar, EVs and Home Assistant. |
 * The first row is optional. Each card row: linked title, description, and
 * an optional eyebrow (defaults to "Topic hub"). Cards are tinted by topic,
 * matched from the title.
 */
import { applyTopic, unbutton } from '../../scripts/topics.js';

export default function decorate(block) {
  unbutton(block);
  const rows = [...block.children];
  const headRow = rows[0]?.querySelector('h1, h2, h3') ? rows.shift() : null;

  const parts = [];
  if (headRow) {
    const head = document.createElement('div');
    head.className = 'more-content-head';
    head.append(headRow.querySelector('h1, h2, h3'));
    const link = headRow.querySelector('a');
    if (link) {
      link.className = 'more-content-all';
      head.append(link);
    }
    parts.push(head);
  }

  const list = document.createElement('ul');
  list.className = 'more-content-list';
  rows.forEach((row) => {
    const [titleCell, descCell, eyebrowCell] = [...row.children];
    const link = titleCell.querySelector('a');
    const titleText = titleCell.textContent.trim();

    const card = document.createElement(link ? 'a' : 'div');
    card.className = 'more-content-card';
    if (link) card.href = link.getAttribute('href');
    applyTopic(card, titleText);

    const eyebrow = document.createElement('span');
    eyebrow.className = 'more-content-eyebrow';
    eyebrow.textContent = eyebrowCell?.textContent.trim() || 'Topic hub';

    const text = document.createElement('div');
    text.innerHTML = '<div class="more-content-title"></div><div class="more-content-desc"></div>';
    text.children[0].textContent = titleText;
    text.children[1].textContent = descCell?.textContent.trim() || '';

    card.append(eyebrow, text);
    const li = document.createElement('li');
    li.append(card);
    list.append(li);
  });
  parts.push(list);

  block.replaceChildren(...parts);
}
