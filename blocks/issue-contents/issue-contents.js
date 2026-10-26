/*
 * Issue Contents
 * A row of numbered cards that jump to each story in the issue.
 *   | AI | [Meet Ralph, my always-on agent](#meet-ralph...) |
 * One row per story: topic, then title. If the title isn't linked, the card
 * links to the matching story-header (first row → first story, and so on).
 */
import { applyTopic } from '../../scripts/topics.js';

export default function decorate(block) {
  const storyHeadings = [...document.querySelectorAll('main .story-header')]
    .map((header) => header.querySelector('h2[id], h3[id]'));

  const list = document.createElement('ol');
  [...block.children].forEach((row, i) => {
    const cells = [...row.children];
    const titleCell = cells[cells.length - 1];
    const topic = cells.length > 1 ? cells[0].textContent.trim() : '';
    const link = titleCell.querySelector('a');
    const target = storyHeadings[i];

    const card = document.createElement('a');
    card.className = 'issue-contents-card';
    if (link) card.href = link.getAttribute('href');
    else if (target) card.href = `#${target.id}`;
    applyTopic(card, topic);

    const top = document.createElement('div');
    top.className = 'issue-contents-top';
    top.innerHTML = `<span class="issue-contents-num">${String(i + 1).padStart(2, '0')}</span><span class="issue-contents-dot"></span>`;

    const text = document.createElement('div');
    const topicEl = document.createElement('div');
    topicEl.className = 'issue-contents-topic';
    topicEl.textContent = topic;
    const title = document.createElement('div');
    title.className = 'issue-contents-title';
    title.textContent = titleCell.textContent.trim();
    text.append(topicEl, title);

    card.append(top, text);
    const li = document.createElement('li');
    li.append(card);
    list.append(li);
  });
  block.replaceChildren(list);
}
