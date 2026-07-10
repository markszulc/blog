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

// Checkbox label -> exact beehiiv "Interest" custom field option string.
// Keep in sync with the list-type custom field's options in beehiiv.
const INTERESTS = [
  { label: 'Adobe', value: 'Adobe' },
  { label: 'Smart Home', value: 'Smart Home / Home Assistant' },
  { label: 'Maker', value: 'Maker Projects' },
];

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
  form.id = `newsletter-form-${Math.random().toString(36).slice(2, 9)}`;
  form.noValidate = true;

  const input = document.createElement('input');
  input.type = 'email';
  input.name = 'email';
  input.required = true;
  input.placeholder = placeholder;
  input.setAttribute('aria-label', 'Email address');

  const button = document.createElement('button');
  button.type = 'submit';
  button.className = 'newsletter-submit';
  // Set explicitly so the button still submits the form after being moved
  // out of it (into the expand panel) once the user focuses the email field.
  button.setAttribute('form', form.id);
  button.textContent = buttonText;

  form.append(input);

  // Expanding panel: hidden until the user focuses the email field, then
  // reveals optional fields for a more personalized newsletter.
  const expand = document.createElement('div');
  expand.className = 'newsletter-expand';

  const expandInner = document.createElement('div');
  expandInner.className = 'newsletter-expand-inner';

  const expandIntro = document.createElement('p');
  expandIntro.className = 'newsletter-expand-intro';
  expandIntro.textContent = "Tell me a bit more (totally optional) so I can tailor what I send you.";

  const firstNameLabel = document.createElement('label');
  firstNameLabel.className = 'newsletter-field-label';
  firstNameLabel.textContent = 'First name';
  const firstNameInput = document.createElement('input');
  firstNameInput.type = 'text';
  firstNameInput.name = 'firstName';
  firstNameInput.autocomplete = 'given-name';
  firstNameInput.placeholder = 'Larry';
  firstNameLabel.append(firstNameInput);

  const interestFieldset = document.createElement('fieldset');
  interestFieldset.className = 'newsletter-interests';
  const interestLegend = document.createElement('legend');
  interestLegend.textContent = "What are you interested in?";
  const interestHint = document.createElement('p');
  interestHint.className = 'newsletter-interest-hint';
  interestHint.textContent = "I write about a few different topics — pick any that interest you and I'll make sure those show up more often.";
  interestFieldset.append(interestLegend, interestHint);

  const interestCheckboxes = INTERESTS.map(({ label, value }) => {
    const optionLabel = document.createElement('label');
    optionLabel.className = 'newsletter-interest-option';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'interest';
    checkbox.value = value;
    optionLabel.append(checkbox, document.createTextNode(label));
    interestFieldset.append(optionLabel);
    return checkbox;
  });

  expandInner.append(expandIntro, firstNameLabel, interestFieldset);
  expand.append(expandInner);

  // Grid shell: column 1 (input, then expand panel below it) sized against
  // column 2 (the button), so expanded fields line up under the email
  // input. The button's own grid cell never changes size or column — on
  // expand it just slides down via transform to trail the new bottom edge.
  const formShell = document.createElement('div');
  formShell.className = 'newsletter-form-shell';
  formShell.append(form, expand, button);

  const BUTTON_GAP = 16;

  input.addEventListener('focus', () => {
    // Measure before expanding: however the button is placed by CSS at this
    // breakpoint (beside the input, or stacked below it), this lands it
    // just under the expand panel's eventual bottom edge either way.
    const expandTop = expand.getBoundingClientRect().top;
    const buttonTop = button.getBoundingClientRect().top;
    const buttonHeight = button.getBoundingClientRect().height;
    const targetTop = expandTop + expandInner.scrollHeight + BUTTON_GAP;

    expand.classList.add('is-expanded');
    button.style.transform = `translateY(${targetTop - buttonTop}px)`;
    // The transform is purely visual and doesn't push the shell's own
    // height out, so reserve real space for where the button lands —
    // otherwise it overlaps whatever renders after the shell (status text,
    // footnote).
    formShell.style.paddingBottom = `${buttonHeight + BUTTON_GAP}px`;
  }, { once: true });

  const status = document.createElement('p');
  status.className = 'newsletter-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.hidden = true;

  rightCell.replaceChildren(formShell, status);
  paragraphs.slice(2).forEach((p) => {
    p.classList.add('newsletter-footnote');
    rightCell.append(p);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!endpoint || !input.reportValidity()) return;

    const email = input.value.trim();
    const firstName = firstNameInput.value.trim();
    const interests = interestCheckboxes
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);

    input.disabled = true;
    button.disabled = true;
    button.textContent = 'Subscribing…';
    status.hidden = true;
    status.classList.remove('newsletter-status-error');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          ...(firstName && { firstName }),
          ...(interests.length && { interests }),
        }),
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
