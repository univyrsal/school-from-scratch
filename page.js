// Shared by every menu page (people.html, cost.html, ...) and 404.html.
// Each page file names itself in <body data-page="...">; 404.html works it out
// from the address instead, so an option added in settings.md still gets a
// working page on a web server before its own file exists.

// A word settings.md can use: LAYOUT_SEED = random
window.random = 'random';

function loadSettings() {
  return fetch('settings.md', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status))))
    .then((text) => {
      // Only the ``` code blocks are settings; the rest is notes. Each block
      // runs on its own, so a mistake in one only skips that block.
      const blocks = [...text.replace(/\r\n?/g, '\n').matchAll(/^```[^\n]*\n([\s\S]*?)^```/gm)];
      for (const [, code] of blocks) {
        try {
          (0, eval)(code); // runs as plain page-wide code: NAME = value sets NAME
        } catch (err) {
          console.error('settings.md: skipped a code block with a mistake (' + err.message + '):\n' + code);
        }
      }
    })
    .catch((err) => console.warn('settings.md could not be loaded (' + err.message + '); using the built-in defaults.'));
}

// Fonts are fetched from Google Fonts by name. Asking for a weight a family
// doesn't have gets the whole family turned down — Archivo Black, say, comes
// in one weight only — and the words then fall back to Georgia or Segoe UI
// with nothing said about it. So each family is checked once the sheet has
// arrived, and any that didn't turn up is asked for again without naming a
// weight, which every family on Google Fonts can answer.
//
// Each one is { family: "Jost", weights: [600] }; an empty family is skipped.
function loadGoogleFonts(wanted) {
  const listed = wanted.filter((f) => f && f.family);
  if (!listed.length) return;
  const address = (parts) => 'https://fonts.googleapis.com/css2?' + parts.map((p) =>
    'family=' + encodeURIComponent(p.family) +
    (p.weights && p.weights.length ? ':wght@' + p.weights.join(';') : '')).join('&') + '&display=swap';
  const add = (url) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
    return link;
  };
  // Which faces of a family turned up. A variable font answers with a range
  // ("100 900") rather than a single weight.
  const facesOf = (family) => [...(document.fonts || [])]
    .filter((f) => String(f.family).replace(/^["']|["']$/g, '') === family);
  const hasWeight = (faces, want) => faces.some((f) => {
    const ends = String(f.weight).split(/\s+/).map(Number);
    return ends.length > 1 ? want >= ends[0] && want <= ends[1] : ends[0] === want;
  });

  const first = add(address(listed));
  const checkUp = () => {
    if (!document.fonts) return;
    // Trouble is a family that didn't turn up at all, or turned up without
    // some weight that was asked for — in which case the browser is left
    // choosing among the ones it did get, which can be a good deal heavier
    // or lighter than intended.
    const trouble = [];
    for (const p of listed) {
      const faces = facesOf(p.family);
      const absent = faces.length
        ? (p.weights || []).filter((w) => !hasWeight(faces, Number(w)))
        : (p.weights || []);
      if (!faces.length || absent.length) trouble.push({ family: p.family, absent, came: faces.length > 0 });
    }
    if (!trouble.length) return;
    // Asked for plainly, any family Google Fonts has will answer, with the
    // weights it actually keeps. One that still doesn't answer isn't there
    // at all — nearly always a misspelling.
    const again = add(address(trouble.map((p) => ({ family: p.family }))));
    const lastWord = () => {
      for (const p of trouble) {
        const faces = facesOf(p.family);
        if (!faces.length) {
          console.warn('There is no font called "' + p.family + '" on Google Fonts, so the page fell ' +
            'back to its ordinary font. Check the spelling against fonts.google.com — it has to match exactly.');
        } else {
          const have = [...new Set(faces.map((f) => String(f.weight)))].join(', ');
          console.warn('The font "' + p.family + '" hasn\'t got weight ' + p.absent.join(' or ') +
            ' on Google Fonts. It has ' + have + ', and the nearest of those is being used instead.');
        }
      }
    };
    again.addEventListener('load', lastWord);
    again.addEventListener('error', lastWord);
  };
  first.addEventListener('load', checkUp);
  first.addEventListener('error', checkUp); // turned down outright
}

function setting(name, fallback) {
  const value = window[name];
  if (value === undefined || typeof value !== typeof fallback) return fallback;
  return value;
}

// "Parent-Learning" -> "parent-learning", "FAQs" -> "faqs". Must match
// pageSlug() in index.html.
function pageSlug(name) {
  return String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Does this address lead to the play's page? With PLAY_PAGE_ENABLED off,
// anything that does is hidden. Must match leadsToPlay() in index.html.
function leadsToPlay(address) {
  return /(^|\/)is_nirmal_normal(\.html)?([?#]|$)/i.test(String(address).trim());
}

// Other scripts on a page (payments.js) wait on this before reading settings.
window.settingsLoaded = loadSettings();

window.settingsLoaded.then(() => {
  // The play's page, while it's switched off (PLAY_PAGE_ENABLED), sends
  // anyone who arrives on it to the home page.
  const PLAY_OFF = setting('PLAY_PAGE_ENABLED', true) === false;
  if (PLAY_OFF && leadsToPlay(location.pathname)) {
    location.replace('index.html');
    return;
  }

  const root = document.documentElement.style;
  root.setProperty('--bg', setting('BACKGROUND_COLOR', '#000000'));
  root.setProperty('--fg', setting('TEXT_COLOR', '#ffffff'));
  root.setProperty('--accent', setting('ACCENT_COLOR', '#dfeac0'));

  const HEADING_FONT = setting('HEADING_FONT', 'Lora');
  const HEADING_WEIGHT = setting('HEADING_FONT_WEIGHT', 600);
  const BODY_FONT = setting('BODY_FONT', 'Quicksand');
  const BODY_WEIGHT = setting('BODY_FONT_WEIGHT', 500);
  loadGoogleFonts([
    { family: HEADING_FONT, weights: [HEADING_WEIGHT] },
    { family: BODY_FONT, weights: [BODY_WEIGHT] },
  ]);
  root.setProperty('--heading-font', `'${HEADING_FONT}', Georgia, serif`);
  root.setProperty('--heading-weight', HEADING_WEIGHT);
  root.setProperty('--body-font', `'${BODY_FONT}', 'Segoe UI', sans-serif`);
  root.setProperty('--body-weight', BODY_WEIGHT);
  root.setProperty('--heading-size', Math.max(8, setting('HEADING_FONT_SIZE', 64)) + 'px');
  root.setProperty('--body-size', Math.max(8, setting('BODY_FONT_SIZE', 24)) + 'px');
  // Two columns in a text file (Role — Name): how far apart they sit, and
  // whether the dash between them shows.
  // The scrollbar down the side of the window.
  document.documentElement.classList.toggle('show-scrollbar', setting('SHOW_SCROLLBAR', false) === true);
  root.setProperty('--pair-gap', Math.max(0, setting('TWO_COLUMN_GAP', 64)) + 'px');
  // The mark that stands in the gutter: false or "" for none, true for an em
  // dash, or any characters of your own. This one is read straight from the
  // settings rather than through setting(), which keeps a value only when it
  // is the same kind of thing as the fallback — and this one is deliberately
  // either a yes/no or some words.
  const gutterMark = window.TWO_COLUMN_DASH;
  const markText = gutterMark === true ? '—' : (typeof gutterMark === 'string' ? gutterMark : '');
  document.documentElement.classList.toggle('two-column-dash', markText !== '');
  if (markText) root.setProperty('--pair-dash-char', JSON.stringify(markText));

  // The menu bar across the top, on pages that have one (payments.html).
  // Its options lead to their section on the home page.
  const quickNav = document.getElementById('quick-nav');
  if (quickNav) {
    root.setProperty('--top-menu-height', Math.max(24, setting('TOP_MENU_HEIGHT', 64)) + 'px');
    root.setProperty('--top-menu-text-size', Math.max(8, setting('TOP_MENU_TEXT_SIZE', 17)) + 'px');
    root.setProperty('--top-menu-slide-ms', Math.max(0, setting('TOP_MENU_SLIDE_MS', 350)) + 'ms');
    root.setProperty('--top-menu-hover-spacing', setting('TOP_MENU_HOVER_LETTER_SPACING', 0.3) + 'em');
    root.setProperty('--top-menu-hover-ms', Math.max(0, setting('TOP_MENU_HOVER_SPEED_MS', 250)) + 'ms');
    root.setProperty('--menu-spacing-hover', setting('MENU_LETTER_SPACING_HOVER', 0.06) + 'em');
    root.setProperty('--top-underline-thickness', Math.max(0, setting('TOP_MENU_UNDERLINE_THICKNESS', 2)) + 'px');
    document.documentElement.classList.toggle('no-top-menu-animation', !setting('TOP_MENU_ANIMATION', true));
    const quickList = quickNav.querySelector('#quick-list');
    const home = document.createElement('a');
    home.href = 'index.html';
    home.textContent = String(setting('TOP_MENU_HOME_LABEL', 'Home')).trim() || 'Home';
    // The menu's options, then any that belong only to the bar.
    const inBar = [...setting('MENU_ITEMS', []), ...setting('TOP_MENU_EXTRA_ITEMS', [])];
    // An option with its own address (MENU_LINKS) goes there; the rest
    // lead to their section on the home page.
    const ownAddress = (label) => String((setting('MENU_LINKS', {}) || {})[label] || '').trim();
    quickList.replaceChildren(home, ...inBar
      .map((item) => String(item).trim()).filter(Boolean)
      // An option leading to the play's page is left out while it's off.
      .filter((label) => !(PLAY_OFF && leadsToPlay(ownAddress(label))))
      .map((label) => {
        const link = document.createElement('a');
        link.href = ownAddress(label) || 'index.html#' + pageSlug(label);
        link.textContent = label;
        return link;
      }));
    quickList.classList.toggle('underline', setting('TOP_MENU_UNDERLINE_ON_HOVER', true));
    requestAnimationFrame(() => quickNav.classList.add('show'));
  }

  // Which page is this? The file's own name, or (on 404.html) the address.
  const own = document.body.dataset.page;
  const slug = own ? pageSlug(own) : pageSlug(decodeURIComponent(location.pathname.split('/').pop().replace(/\.html$/i, '')));
  const menuName = setting('MENU_ITEMS', []).find((item) => pageSlug(item) === slug);
  const name = menuName || own;

  const titleEl = document.getElementById('title');
  const statusEl = document.getElementById('status');
  if (!name) {
    titleEl.textContent = 'Page not found';
    statusEl.textContent = '';
    const digits = document.getElementById('digits');
    if (digits) digits.hidden = false; // notfound.js makes them pushable

    document.title = 'Page not found · ' + setting('MENU_TITLE', 'The School From Scratch');
    return;
  }
  titleEl.textContent = name;
  document.title = name + ' · ' + setting('MENU_TITLE', 'The School From Scratch');

  // Contact details (phone number and Venmo logo) on the pages named in
  // CONTACT_PAGES.
  const contactPages = setting('CONTACT_PAGES', ['Cost']).map(pageSlug);
  if (!contactPages.includes(slug)) return;
  const phone = setting('PHONE_NUMBER', '+1 (805) 798-5098').trim();
  const showVenmo = setting('SHOW_VENMO_LOGO', true);
  const venmoLink = setting('VENMO_LINK', '').trim();

  const phoneEl = document.getElementById('phone');
  if (phone) {
    phoneEl.textContent = phone;
    phoneEl.href = 'tel:' + phone.replace(/[^\d+]/g, '');
  } else {
    phoneEl.remove();
  }
  const venmoEl = document.getElementById('venmo-link');
  if (!showVenmo) {
    venmoEl.remove();
  } else if (/^https:\/\//i.test(venmoLink)) {
    venmoEl.href = venmoLink;
    venmoEl.target = '_blank';
    venmoEl.rel = 'noopener';
  }
  if (phone || showVenmo) document.getElementById('contact').hidden = false;
});
