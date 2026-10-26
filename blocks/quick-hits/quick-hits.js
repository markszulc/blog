/*
 * Quick Hits
 * A warm panel of small update cards, each with a status tag.
 *   | ## Quick hits | Small wins & teasers |
 *   | Home office signage     | Deep dive soon | Started as an experiment... |
 *   | Matter, finally working | Fixed          | The culprit: Thread border... |
 * The first row is the panel heading and an optional tagline. Each other row
 * is a card: title, status, description. "Fixed", "Done", "Shipped" and
 * "Live" statuses render as a green tag; anything else is an outline tag.
 */

const DONE = /^(fixed|done|shipped|live|solved|working)$/i;

export default function decorate(block) {
  const rows = [...block.children];
  const headRow = rows[0]?.querySelector('h1, h2, h3') ? rows.shift() : null;

  const parts = [];
  if (headRow) {
    const [titleCell, taglineCell] = [...headRow.children];
    const head = document.createElement('div');
    head.className = 'quick-hits-head';
    const heading = titleCell.querySelector('h1, h2, h3');
    head.append(heading);
    if (taglineCell?.textContent.trim()) {
      const tagline = document.createElement('span');
      tagline.className = 'quick-hits-tagline';
      tagline.textContent = taglineCell.textContent.trim();
      head.append(tagline);
    }
    parts.push(head);
  }

  const list = document.createElement('ul');
  list.className = 'quick-hits-list';
  rows.forEach((row) => {
    // title | status | description, or just title | description
    const cells = [...row.children];
    const titleCell = cells[0];
    const desc = cells.length > 1 ? cells[cells.length - 1] : null;
    const status = cells.length > 2 ? cells[1].textContent.trim() : '';

    const li = document.createElement('li');
    const top = document.createElement('div');
    top.className = 'quick-hits-top';
    const title = document.createElement('span');
    title.className = 'quick-hits-title';
    title.textContent = titleCell.textContent.trim();
    top.append(title);
    if (status) {
      const tag = document.createElement('span');
      tag.className = `quick-hits-status${DONE.test(status) ? ' done' : ''}`;
      tag.textContent = status;
      top.append(tag);
    }
    li.append(top);
    if (desc) {
      const p = document.createElement('p');
      p.innerHTML = desc.querySelector('p')?.innerHTML ?? desc.innerHTML;
      li.append(p);
    }
    list.append(li);
  });
  parts.push(list);

  block.replaceChildren(...parts);
}
