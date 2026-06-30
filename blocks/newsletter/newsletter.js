/* Direction D newsletter CTA.
 * Authored as a 2-cell row inside a Newsletter block:
 *   [ heading + description | placeholder | subscribe-link | footnote ]
 * Right cell, line-by-line:
 *   1. plain text  → email input placeholder
 *   2. link        → form action + button label
 *   3+ paragraphs  → footnote (rendered below the form, muted)
 */
export default function decorate(block) {
  const row = block.firstElementChild;
  if (!row) return;
  const [leftCell, rightCell] = [...row.children];

  if (leftCell) leftCell.classList.add('newsletter-text');
  if (!rightCell) return;

  rightCell.classList.add('newsletter-form-col');
  const paragraphs = [...rightCell.children];

  const placeholderEl = paragraphs[0];
  const placeholder = placeholderEl ? placeholderEl.textContent.trim() : 'you@example.com';

  const linkPara = paragraphs[1];
  const link = linkPara ? linkPara.querySelector('a') : null;
  let buttonText = 'Subscribe';
  if (link) buttonText = link.textContent.trim();
  else if (linkPara) buttonText = linkPara.textContent.trim();
  const action = link ? link.href : '';

  const form = document.createElement('form');
  form.className = 'newsletter-form';
  if (action) form.action = action;
  form.method = 'post';

  const input = document.createElement('input');
  input.type = 'email';
  input.name = 'email';
  input.required = true;
  input.placeholder = placeholder;
  input.setAttribute('aria-label', 'Email address');

  const button = document.createElement('button');
  button.type = 'submit';
  button.textContent = buttonText;

  form.append(input, button);

  rightCell.replaceChildren(form);
  paragraphs.slice(2).forEach((p) => {
    p.classList.add('newsletter-footnote');
    rightCell.append(p);
  });
}
