/* Direction D newsletter CTA.
 * Authored as a 2-cell row inside a Newsletter block:
 *   [ heading + description | placeholder | subscribe-endpoint-link | footnote ]
 * Right cell, line-by-line:
 *   1. plain text  → email input placeholder
 *   2. link        → subscribe endpoint URL (the worker in /cloudflare-worker) + button label
 *   3+ paragraphs  → footnote (rendered below the form, muted)
 *
 * Submissions are posted as JSON to the endpoint, which proxies to the beehiiv
 * API (see /cloudflare-worker/README.md). beehiiv is configured for double
 * opt-in, so a successful response means a confirmation email is on its way,
 * not that the subscription is active yet.
 */

const COOKIE_NAME = 'ms_newsletter_subscribed';
const COOKIE_MAX_AGE_DAYS = 365;

function getCookie(name) {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];
}

function setCookie(name, value, days) {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
}

function renderConfirmed(container) {
  container.replaceChildren();
  const message = document.createElement('p');
  message.className = 'newsletter-confirmed';
  message.textContent = 'Thanks for being a subscriber!';
  container.append(message);
}

function renderPendingConfirmation(container) {
  container.replaceChildren();
  const message = document.createElement('p');
  message.className = 'newsletter-confirmed';
  message.textContent = 'Thanks for being a subscriber! Check your inbox to confirm your email address.';
  container.append(message);
}

export default function decorate(block) {
  const row = block.firstElementChild;
  if (!row) return;
  const [leftCell, rightCell] = [...row.children];

  if (leftCell) leftCell.classList.add('newsletter-text');
  if (!rightCell) return;

  rightCell.classList.add('newsletter-form-col');

  // Returning subscriber: skip the form entirely.
  if (getCookie(COOKIE_NAME)) {
    renderConfirmed(rightCell);
    return;
  }

  const paragraphs = [...rightCell.children];

  const placeholderEl = paragraphs[0];
  const placeholder = placeholderEl ? placeholderEl.textContent.trim() : 'you@example.com';

  const linkPara = paragraphs[1];
  const link = linkPara ? linkPara.querySelector('a') : null;
  let buttonText = 'Subscribe';
  if (link) buttonText = link.textContent.trim();
  else if (linkPara) buttonText = linkPara.textContent.trim();
  const endpoint = link ? link.href : '';

  const form = document.createElement('form');
  form.className = 'newsletter-form';
  form.noValidate = true;

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

  const status = document.createElement('p');
  status.className = 'newsletter-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.hidden = true;

  rightCell.replaceChildren(form, status);
  paragraphs.slice(2).forEach((p) => {
    p.classList.add('newsletter-footnote');
    rightCell.append(p);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!endpoint || !input.reportValidity()) return;

    const email = input.value.trim();
    input.disabled = true;
    button.disabled = true;
    button.textContent = 'Subscribing…';
    status.hidden = true;
    status.classList.remove('newsletter-status-error');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'subscribe_failed');
      }

      setCookie(COOKIE_NAME, data.status || 'pending', COOKIE_MAX_AGE_DAYS);
      if (data.status === 'active') {
        renderConfirmed(rightCell);
      } else {
        renderPendingConfirmation(rightCell);
      }
    } catch (error) {
      status.textContent = 'Something went wrong — please try again.';
      status.classList.add('newsletter-status-error');
      status.hidden = false;
      input.disabled = false;
      button.disabled = false;
      button.textContent = buttonText;
    }
  });
}
