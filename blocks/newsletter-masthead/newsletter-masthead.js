/*
 * Newsletter Masthead
 * The big issue number beside the issue's eyebrow line and title.
 *   | 01 | The newsletter · Issue #1 · 27 Sep 2026 / # Title with **accent** |
 * The number cell is optional; without it the number is read from "#1" in
 * the eyebrow. Bold text in the title renders in the accent colour.
 * Variant: `Newsletter Masthead (dark)`.
 */

export default function decorate(block) {
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const body = cells.find((cell) => cell.querySelector('h1, h2')) || cells[cells.length - 1];
  const numberCell = cells.find((cell) => cell !== body);

  const heading = body.querySelector('h1, h2');
  const eyebrow = [...body.querySelectorAll('p')].find((p) => !p.contains(heading));

  let number = numberCell?.textContent.trim();
  if (!number) number = eyebrow?.textContent.match(/#\s*(\d+)/)?.[1] || '';
  if (/^\d$/.test(number)) number = `0${number}`;

  const num = document.createElement('div');
  num.className = 'newsletter-masthead-number';
  num.textContent = number;
  num.setAttribute('aria-hidden', 'true');

  const text = document.createElement('div');
  text.className = 'newsletter-masthead-text';
  if (eyebrow) {
    eyebrow.className = 'newsletter-masthead-eyebrow';
    text.append(eyebrow);
  }
  if (heading) text.append(heading);

  block.replaceChildren(...(number ? [num] : []), text);
}
