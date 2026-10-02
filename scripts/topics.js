/*
 * Newsletter topics — maps a topic name an author types ("AI", "Smart Home",
 * "Maker", "Music") to a slug. Blocks add `topic-<slug>` as a class, and
 * styles.css turns that into `--topic` / `--topic-fg` custom properties, so
 * chips, dots and tinted panels all pick up the story's colour.
 */

const TOPICS = [
  { slug: 'ai', match: /\b(ai|adobe)\b/ },
  { slug: 'smart-home', match: /smart home|home automation|energy|solar|\bev\b/ },
  { slug: 'maker', match: /maker|3d print|droid|workshop/ },
  { slug: 'music', match: /music|song|suno/ },
];

export function topicSlug(text) {
  const t = (text || '').trim().toLowerCase();
  return TOPICS.find(({ match }) => match.test(t))?.slug || 'default';
}

export function applyTopic(el, text) {
  const slug = topicSlug(text);
  el.classList.add(`topic-${slug}`);
  el.dataset.topic = slug;
  return slug;
}

// The topic of the nearest story-header above `block` in the page, so a
// figure or callout inside a story picks up that story's colour. Story
// headers decorate in page order, but read the raw first cell as a fallback
// in case this block runs first.
export function precedingTopic(block) {
  const headers = [...document.querySelectorAll('main .story-header')]
    // eslint-disable-next-line no-bitwise
    .filter((h) => h.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING);
  const header = headers.pop();
  if (!header) return 'default';
  if (header.dataset.topic) return header.dataset.topic;
  return topicSlug(header.querySelector(':scope > div > div')?.textContent);
}

export function applyPrecedingTopic(block) {
  const slug = precedingTopic(block);
  block.classList.add(`topic-${slug}`);
  return slug;
}

// decorateButtons() turns lone links into .button pills before blocks run;
// these blocks style their own links, so undo that.
export function unbutton(el) {
  el.querySelectorAll('a.button').forEach((a) => a.classList.remove('button', 'primary', 'secondary'));
  el.querySelectorAll('.button-container').forEach((c) => c.classList.remove('button-container'));
}
