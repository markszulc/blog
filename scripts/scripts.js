import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';

/**
 * Helix only emits a fresh top-level <div> in <main> when the source doc has
 * an <hr>. Some upstream converters (DOCX → Google Docs in particular) drop
 * the horizontal lines, collapsing the whole page into one wrapper. When that
 * happens, multiple .section-metadata blocks end up in the same section —
 * decorateSections processes only the first, leaving the others as broken
 * block stubs that 404 against /blocks/section-metadata/, and bleeds the
 * wrong variant across the page.
 *
 * Split the single wrapper at every .section-metadata boundary so each one
 * gets its own section. Pages that already use explicit <hr>s (multiple
 * top-level divs in main) are untouched.
 * @param {Element} main The container element
 */
function splitImplicitSectionsByMetadata(main) {
  if (main.children.length !== 1) return;
  const wrapper = main.firstElementChild;
  if (wrapper.tagName !== 'DIV') return;
  const metadata = [...wrapper.querySelectorAll(':scope > .section-metadata')];
  if (metadata.length === 0) return;

  // Once the author has signalled section-level styling with any metadata,
  // also split at every H2 — that's the natural editorial boundary the author
  // would have separated with an <hr> if the converter hadn't dropped them.
  // Pages with zero metadata (legacy articles) are left alone above.
  const groups = [[]];
  [...wrapper.children].forEach((el) => {
    if (el.tagName === 'H2' && groups[groups.length - 1].length > 0) {
      groups.push([]);
    }
    groups[groups.length - 1].push(el);
    if (el.classList.contains('section-metadata')) groups.push([]);
  });
  if (!groups[groups.length - 1].length) groups.pop();
  if (groups.length < 2) return;

  const newWrappers = groups.map((group) => {
    const div = document.createElement('div');
    group.forEach((el) => div.appendChild(el));
    return div;
  });
  wrapper.replaceWith(...newWrappers);
}

/**
 * Builds the Direction D split-bento hero from a leading H1 + picture.
 * Text cell  = H1 + following <p>/<ul> siblings (lead paragraph, button link)
 * Media cell = the picture (or its wrapping <p>)
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  if (!h1 || !picture) return;

  // collect H1 + following sibling text content (stops at next heading or block)
  const textEls = [h1];
  let n = h1.nextElementSibling;
  while (n && !/^H[1-6]$/.test(n.tagName) && !n.classList.contains('section-metadata')) {
    if (n.contains(picture) || n === picture) break;
    textEls.push(n);
    n = n.nextElementSibling;
  }

  const textCell = document.createElement('div');
  textCell.append(...textEls);

  const mediaCell = document.createElement('div');
  mediaCell.append(picture.closest('p') || picture);

  const section = document.createElement('div');
  section.append(buildBlock('hero', [[textCell, mediaCell]]));
  main.prepend(section);
}

/**
 * Turns "Heading followed by a solo plain-text link" into a heading row —
 * heading left, link right-aligned as a plain underlined "view all" link.
 * EDS auto-wraps every standalone link as a filled `.button`; a *plain*
 * link (no bold/italic wrapper) placed directly after a heading opts out
 * of that and gets the DESIGN.md "view all" treatment instead. Bold/italic
 * links keep behaving as primary/secondary buttons everywhere else.
 *
 * Makes the heading itself the flex container (wrapping its own text in a
 * <span>, then appending the link) rather than introducing a new <div>.
 * decorateBlocks() treats any <div> sitting directly under
 * .default-content-wrapper as a candidate block and tries to fetch
 * /blocks/<name>/<name>.js for it — an extra wrapper div here would get
 * caught by that and 404. Heading tags are never matched, so this sidesteps
 * it entirely.
 *
 * Runs after decorateSections so `.default-content-wrapper` already exists.
 * @param {Element} main The container element
 */
function decorateSectionHeadingLinks(main) {
  main.querySelectorAll('.default-content-wrapper > h2, .default-content-wrapper > h3').forEach((heading) => {
    const next = heading.nextElementSibling;
    if (!next || !next.classList.contains('button-container') || next.children.length !== 1) return;
    const link = next.querySelector(':scope > a.button');
    if (!link || link.classList.contains('primary') || link.classList.contains('secondary')) return;

    const label = document.createElement('span');
    label.append(...heading.childNodes);
    heading.append(label, link);
    heading.classList.add('section-heading-row');

    link.classList.remove('button');
    link.classList.add('view-all');
    next.remove();
  });
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    splitImplicitSectionsByMetadata(main);
    buildHeroBlock(main);
    // Drop top-level wrappers left empty by the auto-blocking above (e.g. the
    // original wrapper after buildHeroBlock pulls h1 + lead + button + picture
    // out into a freshly prepended hero section).
    [...main.children].forEach((div) => {
      if (div.tagName === 'DIV' && !div.children.length && !div.textContent.trim()) {
        div.remove();
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateSectionHeadingLinks(main);
  decorateBlocks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
