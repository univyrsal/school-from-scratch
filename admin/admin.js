// The admin page: edit the words of every page, and every setting, then save
// them to the website.
//
// It loads everything fresh from GitHub through /admin/api/load, and saves
// one page (or a batch of settings) at a time through /admin/api/save, which
// checks the sign-in, checks the changes, and commits them. The page itself
// only ever shows and sends; the server decides what's allowed.
//
// The home screen and menu work like the site's home page (index.html):
// the same letters that drift and settle on hover, the same glide down to a
// section, and the same bar across the top once the menu is out of view.
// That code is repeated here, rather than shared, so the admin can change
// without any risk to the real home page.

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, props = {}, ...kids) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v === true ? '' : v);
    }
    node.append(...kids.filter((k) => k !== null && k !== undefined));
    return node;
  };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Same as pageSlug() in index.html: "Parent-Learning" -> "parent-learning".
  const pageSlug = (name) => String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  // ---- State ----------------------------------------------------------------

  const files = new Map();     // path -> { path, sha, text }
  let settingsFile = null;     // the settings.md entry, with .settings
  let values = {};             // setting name -> value as saved on GitHub
  let options = [];            // [{ label, id, file, page }] in menu order
  let sectionEls = [];

  // A setting's saved value, or the fallback when it's missing or the wrong
  // kind of thing (the same rule as setting() in index.html).
  function setting(name, fallback) {
    const value = values[name];
    if (value === undefined) return fallback;
    const ok = typeof fallback === 'number' ? Number.isFinite(value)
      : Array.isArray(fallback) ? Array.isArray(value)
      : typeof value === typeof fallback;
    return ok ? value : fallback;
  }

  // ---- Talking to the server ------------------------------------------------

  // A plain-words error for anything that goes wrong on the way.
  async function call(url, init) {
    let res;
    try {
      res = await fetch(url, { cache: 'no-store', credentials: 'same-origin', ...init });
    } catch (e) {
      // Usually an expired sign-in: Cloudflare Access answers with its
      // sign-in page on another address, which the browser won't follow here.
      throw new Error('The website couldn\'t be reached. Your sign-in may have run out: open the admin in a new tab to sign in again, then come back here and try once more. Nothing you typed here has been lost.');
    }
    let data = null;
    try { data = await res.json(); } catch (e) { /* not JSON */ }
    if (!res.ok || !data || data.error) {
      const err = new Error((data && data.error) || (res.status === 403
        ? 'Your sign-in couldn\'t be confirmed. Open the admin in a new tab to sign in again, then come back here and try once more.'
        : `Something went wrong (status ${res.status}). Please try again in a minute.`));
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // ---- Look: colors, fonts and sizes from settings.md -----------------------

  function applyLook() {
    const root = document.documentElement.style;
    const px = (name, fallback, min = 0) => Math.max(min, setting(name, fallback)) + 'px';
    root.setProperty('--bg', setting('BACKGROUND_COLOR', '#fffff8'));
    root.setProperty('--fg', setting('TEXT_COLOR', '#111111'));
    root.setProperty('--accent', setting('ACCENT_COLOR', '#e8f0d4'));
    const headingFont = setting('HEADING_FONT', 'Lora');
    const headingWeight = setting('HEADING_FONT_WEIGHT', 600);
    const bodyFont = setting('BODY_FONT', 'Quicksand');
    const bodyWeight = setting('BODY_FONT_WEIGHT', 500);
    const family = (f, weights) => 'family=' + encodeURIComponent(f) + ':wght@' + [...new Set(weights)].sort((a, b) => a - b).join(';');
    document.head.appendChild(el('link', {
      rel: 'stylesheet',
      href: `https://fonts.googleapis.com/css2?${family(headingFont, [headingWeight])}&${family(bodyFont, [bodyWeight, 700])}&display=swap`,
    }));
    root.setProperty('--heading-font', `'${headingFont}', Georgia, serif`);
    root.setProperty('--heading-weight', headingWeight);
    root.setProperty('--body-font', `'${bodyFont}', 'Segoe UI', sans-serif`);
    root.setProperty('--body-weight', bodyWeight);
    root.setProperty('--body-size', px('BODY_FONT_SIZE', 24, 8));
    root.setProperty('--title-gap', px('TITLE_GAP', 72));
    root.setProperty('--title-size', px('MENU_TITLE_SIZE', 76, 8));
    root.setProperty('--subtitle-size', px('MENU_SUBTITLE_SIZE', 24, 8));
    root.setProperty('--subtitle-gap', px('SUBTITLE_GAP', 16));
    root.setProperty('--menu-spacing-start', setting('MENU_LETTER_SPACING', 0.3) + 'em');
    root.setProperty('--menu-spacing-hover', setting('MENU_LETTER_SPACING_HOVER', 0.06) + 'em');
    root.setProperty('--menu-spacing-ms', px('MENU_HOVER_SPEED_MS', 450).replace('px', 'ms'));
    root.setProperty('--underline-thickness', px('MENU_UNDERLINE_THICKNESS', 1));
    root.setProperty('--underline-ms', Math.max(0, setting('MENU_UNDERLINE_SPEED_MS', 220)) + 'ms');
    root.setProperty('--top-menu-slide-ms', Math.max(0, setting('TOP_MENU_SLIDE_MS', 350)) + 'ms');
    root.setProperty('--top-menu-height', px('TOP_MENU_HEIGHT', 64, 24));
    root.setProperty('--top-menu-text-size', px('TOP_MENU_TEXT_SIZE', 17, 8));
    root.setProperty('--top-menu-hover-spacing', setting('TOP_MENU_HOVER_LETTER_SPACING', 0.3) + 'em');
    root.setProperty('--top-menu-hover-ms', Math.max(0, setting('TOP_MENU_HOVER_SPEED_MS', 250)) + 'ms');
    root.setProperty('--top-underline-thickness', px('TOP_MENU_UNDERLINE_THICKNESS', 2));
    root.setProperty('--top-arrow-half', px('TOP_MENU_ARROW_SIZE', 10, 1));
    document.documentElement.classList.toggle('no-top-menu-animation', !setting('TOP_MENU_ANIMATION', true));
    $('#quick-list').classList.toggle('underline', setting('TOP_MENU_UNDERLINE_ON_HOVER', true));
    $('#quick-list').classList.toggle('arrow-up', setting('TOP_MENU_ARROW_WHEN_MOVING_UP', true));
    // Section text, as on the home page.
    root.setProperty('--section-width', px('SECTION_TEXT_WIDTH', 720, 200));
    root.setProperty('--section-heading-size', px('SECTION_HEADING_SIZE', 44, 8));
    root.setProperty('--section-text-size', px('SECTION_TEXT_SIZE', 19, 8));
    root.setProperty('--section-scroll-margin', px('SECTION_SCROLL_MARGIN', 96));
    const paragraph = Math.max(0, setting('SECTION_PARAGRAPH_WIDTH', 0));
    root.setProperty('--paragraph-width', paragraph ? paragraph + 'px' : 'none');
    root.setProperty('--section-image-width', px('SECTION_PICTURE_WIDTH', 200, 20));
    root.setProperty('--section-image-height', px('SECTION_PICTURE_HEIGHT', 0));
    root.setProperty('--section-image-radius', (setting('PHOTO_ROUNDED_CORNERS', true) ? Math.max(0, setting('PHOTO_CORNER_RADIUS', 12)) : 0) +
      (String(setting('PHOTO_CORNER_RADIUS_UNIT', 'pixels')).trim().toLowerCase().startsWith('percent') ? '%' : 'px'));
    root.setProperty('--pair-gap', px('TWO_COLUMN_GAP', 64));
    const mark = values.TWO_COLUMN_DASH;
    const markText = mark === true ? '—' : (typeof mark === 'string' ? mark : '');
    document.documentElement.classList.toggle('two-column-dash', markText !== '');
    if (markText) root.setProperty('--pair-dash-char', JSON.stringify(markText));
    root.setProperty('--step-circle', px('PAYMENT_STEP_CIRCLE_SIZE', 36, 16));
    root.setProperty('--step-gap', px('PAYMENT_STEP_SPACING', 28));
    root.setProperty('--section-gap', px('ADMIN_SPACE_BETWEEN_SECTIONS', 160));
    root.setProperty('--nudge-ms', Math.max(0, setting('MENU_CLICK_NUDGE_SPEED_MS', 300)) + 'ms');
    root.setProperty('--word-shift', Math.max(0, setting('MENU_CLICK_MOVE_AMOUNT', 0.4)) + 'em');
    root.setProperty('--glow-color', setting('MENU_CLICK_GLOW_COLOR', '#9fc25a'));
    root.setProperty('--glow-ms', Math.max(0, setting('MENU_CLICK_GLOW_MS', 1200)) + 'ms');
  }

  function applyTitle() {
    const menu = $('#menu');
    $('h1', menu).textContent = String(setting('ADMIN_TITLE', '')).trim() || String(setting('MENU_TITLE', 'The School From Scratch')).trim();
    const subtitle = String(setting('ADMIN_SUBTITLE', '')).trim();
    const sub = $('.subtitle', menu);
    sub.textContent = subtitle;
    sub.hidden = !subtitle;
    menu.classList.toggle('has-subtitle', !!subtitle);
    menu.classList.toggle('title-accent', setting('MENU_TITLE_IN_ACCENT_COLOR', true));
  }

  // ---- Which pages there are ------------------------------------------------

  // Every editable file becomes an option: the home page's menu first, in its
  // order; then the pages of their own (Payments, Contact) in the top bar's
  // order; then any other page file; then the settings.
  function workOutOptions() {
    const links = setting('MENU_LINKS', {});
    const taken = new Set();
    const list = [];
    // A page of its own (payments.html) keeps its words in
    // sections/payments/payments.md.
    const fileForPage = (address) => {
      const page = String(address || '').trim().split(/[?#]/)[0].replace(/^\.?\//, '');
      if (!/^[\w-]+\.html$/.test(page)) return null;
      const name = page.replace(/\.html$/, '');
      const path = `sections/${name}/${name}.md`;
      return files.has(path) ? { path, page } : null;
    };
    const add = (label, path, page) => {
      if (!path || taken.has(path)) return;
      taken.add(path);
      list.push({ label, file: path, page: page || '' });
    };
    const addOption = (label) => {
      label = String(label).trim();
      if (!label) return;
      if (links[label]) {
        const found = fileForPage(links[label]);
        if (found) add(label, found.path, found.page);
      } else {
        const path = `sections/${pageSlug(label)}.md`;
        if (files.has(path)) add(label, path);
        else {
          const own = fileForPage(pageSlug(label) + '.html');
          if (own) add(label, own.path, own.page);
        }
      }
    };
    setting('MENU_ITEMS', []).forEach(addOption);
    setting('TOP_MENU_EXTRA_ITEMS', []).forEach(addOption);
    Object.keys(links).forEach(addOption);
    // Anything left: named after its file (is_nirmal_normal -> Is Nirmal Normal).
    for (const path of files.keys()) {
      if (path === 'settings.md' || taken.has(path)) continue;
      const parts = path.replace(/\.md$/, '').split('/');
      const name = parts[parts.length - 1];
      const words = name.replace(/[_-]+/g, ' ').trim();
      const page = parts.length === 3 && parts[1] === name ? name + '.html' : '';
      add(words.replace(/\b\w/g, (c) => c.toUpperCase()), path, page);
    }
    if (settingsFile) list.push({ label: String(setting('ADMIN_SETTINGS_LABEL', 'Settings')).trim() || 'Settings', file: 'settings.md', page: '' });
    // Each gets its own address on this page (#people), never repeated.
    const ids = new Set(['home', 'menu', 'sections', 'review', 'toast']);
    for (const o of list) {
      let id = pageSlug(o.label) || 'page', n = 2;
      while (ids.has(id)) id = pageSlug(o.label) + '-' + n++;
      ids.add(id);
      o.id = id;
    }
    return list;
  }

  // ---- Showing a page's words the way the site does -------------------------

  // Pages of their own fill in {SETTING_NAME} with that setting (pagetext.js).
  const fillIn = (text) => text.replace(/\{([A-Z][A-Z0-9_]*)\}/g, (all, name) =>
    (typeof values[name] === 'string' || typeof values[name] === 'number' ? String(values[name]) : all));

  function renderInto(box, text, option) {
    const words = option.page ? fillIn(text) : text;
    if (!words.trim()) {
      box.innerHTML = '<p class="status">Under Development</p>';
      return;
    }
    box.innerHTML = withEmbeds(markdownToHtml(words), setting('EMBEDS', {}), Math.max(40, setting('EMBED_HEIGHT', 420)),
      setting('EMBEDS_YOU_CAN_TOUCH', []), setting('EMBED_WAKE_LABEL', 'Click to use'));
    // The words are written for pages at the top of the site, so a picture
    // at assets/... is really at /assets/...
    for (const node of box.querySelectorAll('[src], a[href]')) {
      const attr = node.hasAttribute('src') ? 'src' : 'href';
      const value = node.getAttribute(attr);
      if (value && !/^([a-z][a-z0-9+.-]*:|\/|#)/i.test(value)) node.setAttribute(attr, '/' + value.replace(/^\.\//, ''));
    }
    // A link opens in a new tab, so nothing typed here is lost by clicking it.
    for (const a of box.querySelectorAll('a[href]')) {
      if (a.getAttribute('href').startsWith('#')) continue;
      a.target = '_blank';
      a.rel = 'noopener';
    }
  }

  // ---- A page's section: read, then edit ------------------------------------

  const unsaved = new Set(); // things with changes not yet saved

  function buildPageSection(option) {
    const file = files.get(option.file);
    const section = el('section', { class: 'section' + (setting('SECTION_PICTURE_HEIGHT', 0) ? ' set-picture-height' : ''), id: option.id });
    const heading = el('h2', { text: option.label });
    const note = el('p', { class: 'file-note', text: option.page ? `Its own page: ${option.page}` : 'On the home page' });
    const view = el('div', { class: 'view page-text' });
    const editButton = el('button', { type: 'button', class: 'button primary', text: 'Edit' });
    const viewActions = el('div', { class: 'actions' }, editButton);
    const textBox = el('textarea', { class: 'edit-text', spellcheck: 'true', 'aria-label': `Words for ${option.label}` });
    const preview = el('div', { class: 'preview page-text' });
    const cancel = el('button', { type: 'button', class: 'button', text: 'Cancel' });
    const review = el('button', { type: 'button', class: 'button primary', text: 'Review & save' });
    const editor = el('div', { class: 'editor', hidden: true },
      el('div', { class: 'edit-panes' },
        el('div', {}, el('label', { class: 'pane-label', text: 'Words' }), textBox),
        el('div', {}, el('span', { class: 'pane-label', text: 'How it will look' }), preview)),
      el('p', { class: 'edit-help', html:
        '<code>**bold**</code> &nbsp; <code>*italic*</code> &nbsp; <code>[words](address)</code> for a link &nbsp; ' +
        '<code>## </code> or <code>### </code> at the start of a line for a heading &nbsp; <code>- </code> for a list. ' +
        'A blank line starts a new paragraph.' }),
      el('div', { class: 'actions' }, cancel, review));

    const show = () => renderInto(view, files.get(option.file).text, option);
    show();

    let queued = 0;
    const refreshPreview = () => {
      cancelAnimationFrame(queued);
      queued = requestAnimationFrame(() => renderInto(preview, textBox.value, option));
      const changed = textBox.value.replace(/\r\n?/g, '\n') !== files.get(option.file).text;
      review.disabled = !changed;
      if (changed) unsaved.add(option.file); else unsaved.delete(option.file);
    };
    textBox.addEventListener('input', refreshPreview);

    const open = () => {
      textBox.value = files.get(option.file).text;
      section.classList.add('editing');
      view.hidden = true;
      viewActions.hidden = true;
      editor.hidden = false;
      refreshPreview();
      textBox.scrollTop = 0;
      textBox.focus({ preventScroll: true });
      textBox.setSelectionRange(0, 0);
    };
    const close = () => {
      section.classList.remove('editing');
      editor.hidden = true;
      view.hidden = false;
      viewActions.hidden = false;
      unsaved.delete(option.file);
      show();
    };
    editButton.addEventListener('click', open);
    cancel.addEventListener('click', () => {
      if (unsaved.has(option.file) && !confirm('Throw away the changes you made to ' + option.label + '?')) return;
      close();
    });
    review.addEventListener('click', () => {
      const before = files.get(option.file).text;
      const after = textBox.value.replace(/\r\n?/g, '\n');
      openReview({
        title: `Save ${option.label}?`,
        intro: 'Words in green are being added; words in red are being taken out. Once saved, the website shows the change in about a minute.',
        body: diffView(before, after),
        save: async () => {
          const done = await call('/admin/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: option.file, sha: files.get(option.file).sha, text: after }),
          });
          files.set(option.file, { ...files.get(option.file), sha: done.sha, text: after });
          close();
          return done.message;
        },
      });
    });

    section.append(heading, note, view, viewActions, editor);
    return section;
  }

  // ---- The settings section --------------------------------------------------

  const edits = new Map(); // setting name -> { entry, read(), reset(), row }

  // ACCENT_COLOR -> "Accent color"; RSVP stays RSVP.
  const KEEP_CAPITALS = new Set(['RSVP', 'URL', 'FAQ', 'FAQS', 'ID', 'PHP', 'HTML', 'JSON']);
  function niceName(name) {
    const words = name.split('_').filter(Boolean).map((w, i) => {
      if (KEEP_CAPITALS.has(w)) return w === 'FAQS' ? 'FAQs' : w;
      if (w === 'MS') return '(ms)';
      const lower = w.toLowerCase();
      return i === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
    });
    return words.join(' ');
  }

  function buildSettingsSection(option) {
    const section = el('section', { class: 'section', id: option.id });
    section.append(
      el('h2', { text: option.label }),
      el('p', { class: 'file-note', text: 'Everything else about the website, from settings.md' }),
      el('p', { class: 'settings-intro', text: 'Open a group to see its settings. Changed settings are highlighted; nothing is saved until you choose Review & save at the bottom of the screen.' }));
    const search = el('input', { type: 'search', class: 'settings-search', placeholder: 'Find a setting by name or description', 'aria-label': 'Find a setting' });
    section.append(search);

    // Groups follow the ## headings in settings.md; within a group, each code
    // block keeps the notes written above it.
    const groups = [];
    for (const entry of settingsFile.settings) {
      let group = groups[groups.length - 1];
      if (!group || group.heading !== entry.heading) groups.push(group = { heading: entry.heading, blocks: [] });
      if (entry.notes || !group.blocks.length) group.blocks.push({ notes: entry.notes, entries: [] });
      group.blocks[group.blocks.length - 1].entries.push(entry);
    }
    const groupEls = [];
    for (const group of groups) {
      const count = el('span', { class: 'count' });
      const details = el('details', { class: 'settings-group' }, el('summary', {}, el('span', { text: group.heading || 'General' }), count));
      const names = [];
      for (const block of group.blocks) {
        const blockEl = el('div', { class: 'settings-block' });
        // The notes above a block, minus the group's heading and anything
        // above that (the top of the file explains editing it by hand,
        // which the form does instead).
        const notesText = block.notes.split(/^#{1,2} .*$/m).pop().trim();
        if (notesText) {
          const notes = el('div', { class: 'notes' });
          // `CODE` in the notes shows as code.
          notes.innerHTML = markdownToHtml(notesText).replace(/`([^`<]+)`/g, '<code>$1</code>');
          blockEl.append(notes);
        }
        // Words whose notes list their choices ("read" = ..., "explore" =
        // ...) get those choices as a dropdown.
        const choices = [...notesText.matchAll(/^[-*] +`"([^"`]*)"` *=/gm)].map((m) => m[1]);
        for (const entry of block.entries) {
          const offered = block.entries.length === 1 && entry.kind === 'text' && choices.length > 1 && choices.includes(entry.value);
          blockEl.append(buildSettingRow(offered ? { ...entry, kind: 'choice', choices } : entry));
          names.push(entry.name);
        }
        details.append(blockEl);
      }
      details._names = names;
      details._count = count;
      details._label = group.heading;
      groupEls.push(details);
      section.append(details);
    }
    const updateCounts = () => {
      for (const d of groupEls) {
        const changed = d._names.filter((n) => edits.get(n).changed()).length;
        d._count.textContent = changed ? `${changed} changed` : `${d._names.length} setting${d._names.length === 1 ? '' : 's'}`;
        d._count.classList.toggle('changed', changed > 0);
      }
    };
    section.addEventListener('settings-changed', updateCounts);
    updateCounts();

    // Searching shows only the settings that match, with their groups open.
    const wasOpen = new Map();
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      for (const d of groupEls) {
        if (!wasOpen.has(d)) wasOpen.set(d, d.open);
        let any = false;
        for (const block of d.querySelectorAll('.settings-block')) {
          const notes = (block.querySelector('.notes') || { textContent: '' }).textContent.toLowerCase();
          let blockAny = false;
          for (const row of block.querySelectorAll('.setting')) {
            const hit = !q || row._search.includes(q) || notes.includes(q) || (d._label || '').toLowerCase().includes(q);
            row.classList.toggle('hidden-by-search', !hit);
            blockAny = blockAny || hit;
          }
          block.classList.toggle('hidden-by-search', !blockAny);
          any = any || blockAny;
        }
        d.classList.toggle('hidden-by-search', !any);
        d.open = q ? any : wasOpen.get(d);
        if (!q) wasOpen.delete(d);
      }
    });
    return section;
  }

  // One setting: its name, a control that suits its kind, and an Undo.
  function buildSettingRow(entry) {
    const id = 'set-' + entry.name;
    const control = el('div', { class: 'setting-control' });
    const problem = el('p', { class: 'problem', role: 'alert' });
    const undo = el('button', { type: 'button', class: 'undo-one', text: 'Undo', hidden: true });
    let read = () => entry.value;   // the control's value, or throws a plain-words problem
    let reset = () => {};
    const input = (props) => el('input', { id, ...props });

    switch (entry.kind) {
      case 'toggle': {
        const box = input({ type: 'checkbox' });
        const word = el('span');
        const sync = () => { word.textContent = box.checked ? 'On' : 'Off'; };
        control.append(el('label', { class: 'switch' }, box, el('span', { class: 'track' }), word));
        read = () => box.checked;
        reset = () => { box.checked = entry.value; sync(); };
        box.addEventListener('change', sync);
        break;
      }
      case 'number': {
        const box = input({ type: 'number', step: 'any', inputmode: 'decimal' });
        control.append(box);
        read = () => {
          const v = box.value.trim();
          if (v === '' || !Number.isFinite(Number(v))) throw new Error('This has to be a number.');
          return Number(v);
        };
        reset = () => { box.value = entry.value; };
        break;
      }
      case 'seed': {
        const box = input({ type: 'number', step: '1', inputmode: 'numeric' });
        const random = el('input', { type: 'checkbox' });
        const sync = () => { box.disabled = random.checked; };
        control.append(box, el('label', { class: 'switch' }, random, el('span', { class: 'track' }), el('span', { text: 'Different every visit' })));
        read = () => {
          if (random.checked) return 'random';
          const v = box.value.trim();
          if (v === '' || !Number.isFinite(Number(v))) throw new Error('This has to be a number, or switched to "Different every visit".');
          return Number(v);
        };
        reset = () => { random.checked = entry.value === 'random'; box.value = entry.value === 'random' ? '' : entry.value; sync(); };
        random.addEventListener('change', sync);
        break;
      }
      case 'color': {
        const text = input({ type: 'text', class: 'color-text', spellcheck: 'false', autocomplete: 'off' });
        const picker = el('input', { type: 'color', 'aria-label': 'Pick a color' });
        const full = (hex) => {
          const h = hex.trim().replace('#', '');
          if (/^[0-9a-f]{3}$/i.test(h)) return '#' + h.split('').map((c) => c + c).join('');
          if (/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(h)) return '#' + h.slice(0, 6);
          return null;
        };
        picker.addEventListener('input', () => { text.value = picker.value; text.dispatchEvent(new Event('input', { bubbles: true })); });
        text.addEventListener('input', () => { const f = full(text.value); if (f) picker.value = f; });
        control.append(picker, text);
        read = () => {
          const v = text.value.trim();
          if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) throw new Error('Write the color like #2f5d3a, or pick one from the square.');
          return v;
        };
        reset = () => { text.value = entry.value; picker.value = full(entry.value) || '#000000'; };
        break;
      }
      case 'text': {
        const box = input({ type: 'text' });
        control.append(box);
        read = () => box.value;
        reset = () => { box.value = entry.value; };
        break;
      }
      case 'choice': {
        const box = el('select', { id }, ...entry.choices.map((c) => el('option', { value: c, text: c })));
        control.append(box);
        read = () => box.value;
        reset = () => { box.value = entry.value; };
        break;
      }
      case 'longtext': {
        const box = el('textarea', { id, rows: Math.min(14, Math.max(4, String(entry.value).split('\n').length + 1)) });
        control.append(box);
        read = () => box.value.replace(/\r\n?/g, '\n');
        reset = () => { box.value = entry.value; };
        break;
      }
      case 'list': {
        const box = el('textarea', { id, rows: Math.min(14, Math.max(3, entry.value.length + 1)) });
        control.append(box, el('p', { class: 'hint', text: 'One per line.' }));
        read = () => box.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
        reset = () => { box.value = entry.value.join('\n'); };
        break;
      }
      case 'data': {
        const box = el('textarea', { id, class: 'code', spellcheck: 'false', rows: 10 });
        control.append(box, el('p', { class: 'hint', text: 'Written as JSON: names and words in "double quotes", a comma between items.' }));
        read = () => {
          let v;
          try { v = JSON.parse(box.value); } catch (e) { throw new Error('This isn\'t written quite right (' + e.message.replace(/^JSON\.parse: /, '') + ').'); }
          if (v === null || typeof v !== 'object' || Array.isArray(v) !== Array.isArray(entry.value)) {
            throw new Error(Array.isArray(entry.value) ? 'This has to stay a list, in [ ].' : 'This has to stay a group, in { }.');
          }
          return v;
        };
        reset = () => { box.value = JSON.stringify(entry.value, null, 2); };
        break;
      }
      default: {
        control.append(el('pre', { text: String(entry.value) }),
          el('p', { class: 'hint', text: 'This one is written in a way the admin can\'t edit. Ask Maxwell to change it in settings.md.' }));
      }
    }
    control.append(problem, undo);

    const label = el('label', { class: 'setting-label', for: id }, niceName(entry.name), el('code', { text: entry.name }));
    const row = el('div', { class: 'setting', 'data-name': entry.name }, label, control);
    row._search = (entry.name + ' ' + niceName(entry.name)).toLowerCase();

    const state = {
      entry,
      row,
      value() { return read(); },
      changed() {
        try { return !sameJson(read(), entry.value); } catch (e) { return true; }
      },
      reset() { reset(); refresh(); },
    };
    const refresh = () => {
      let changed = false;
      try {
        changed = !sameJson(read(), entry.value);
        problem.textContent = '';
      } catch (e) {
        changed = true;
        problem.textContent = e.message;
      }
      row.classList.toggle('changed', changed);
      undo.hidden = !changed;
      if (changed) unsaved.add('setting:' + entry.name); else unsaved.delete('setting:' + entry.name);
      row.dispatchEvent(new CustomEvent('settings-changed', { bubbles: true }));
      updateSettingsBar();
    };
    control.addEventListener('input', refresh);
    control.addEventListener('change', refresh);
    undo.addEventListener('click', () => state.reset());
    reset();
    edits.set(entry.name, state);
    return row;
  }

  function changedSettings() {
    return [...edits.values()].filter((s) => s.changed());
  }

  function updateSettingsBar() {
    const n = changedSettings().length;
    $('#settings-bar').hidden = n === 0;
    $('#settings-count').textContent = `${n} setting${n === 1 ? '' : 's'} changed`;
  }

  $('#settings-undo').addEventListener('click', () => {
    if (!confirm('Put every changed setting back the way it was?')) return;
    changedSettings().forEach((s) => s.reset());
  });

  $('#settings-review').addEventListener('click', () => {
    const changed = changedSettings();
    const problems = [];
    const changes = {};
    for (const s of changed) {
      try { changes[s.entry.name] = s.value(); } catch (e) { problems.push(`${niceName(s.entry.name)}: ${e.message}`); }
    }
    if (problems.length) {
      toast('Some settings need fixing first — they are marked in red.');
      const first = changed.find((s) => { try { s.value(); return false; } catch (e) { return true; } });
      if (first) {
        first.row.closest('details').open = true;
        first.row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      return;
    }
    const list = el('ul', { class: 'change-list' });
    for (const s of changed) list.append(changeItem(s.entry, changes[s.entry.name]));
    openReview({
      title: `Save ${changed.length} setting${changed.length === 1 ? '' : 's'}?`,
      intro: 'Old values are in red, new ones in green. Once saved, the website shows the change in about a minute.',
      body: list,
      save: async () => {
        const done = await call('/admin/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: 'settings.md', sha: settingsFile.sha, changes }),
        });
        // Take the new values as the saved ones, and read the new version's
        // sha so the next save starts from it.
        settingsFile.sha = done.sha;
        for (const s of changed) {
          s.entry.value = changes[s.entry.name];
          values[s.entry.name] = changes[s.entry.name];
          s.reset();
        }
        applyTitle();
        return done.message;
      },
    });
  });

  // One line of the settings review: the name, then old -> new.
  function changeItem(entry, value) {
    const shown = (v) => {
      if (entry.kind === 'toggle') return v ? 'On' : 'Off';
      if (entry.kind === 'seed' && v === 'random') return 'Different every visit';
      if (typeof v === 'string') return v === '' ? '(empty)' : v;
      return JSON.stringify(v);
    };
    const item = el('li', {}, el('div', { class: 'change-name' }, niceName(entry.name), el('code', { text: entry.name })));
    if (entry.kind === 'longtext' || entry.kind === 'list' || entry.kind === 'data') {
      const text = (v) => (entry.kind === 'list' ? v.join('\n') : entry.kind === 'data' ? JSON.stringify(v, null, 2) : v);
      item.append(diffView(text(entry.value), text(value)));
    } else {
      const swatch = (v) => (entry.kind === 'color' ? el('span', { class: 'swatch', style: `background:${v}` }) : null);
      item.append(el('div', { class: 'change-values' },
        el('span', { class: 'old' }, swatch(entry.value), shown(entry.value)),
        el('span', { text: '→' }),
        el('span', { class: 'new' }, swatch(value), shown(value))));
    }
    return item;
  }

  // ---- Showing what changed ---------------------------------------------------

  // What two lists share (the longest common run), and the rest as taken out
  // ('del') or put in ('add'), taken-out first.
  function compare(a, b) {
    const n = a.length, m = b.length;
    const table = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
      }
    }
    const out = [];
    let i = 0, j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && a[i] === b[j]) { out.push(['same', a[i]]); i++; j++; }
      else if (i < n && (j >= m || table[i + 1][j] >= table[i][j + 1])) { out.push(['del', a[i]]); i++; }
      else { out.push(['add', b[j]]); j++; }
    }
    return out;
  }

  // One line changed in place, with the words taken out and put in marked.
  function wordChange(before, after) {
    const line = el('div', { class: 'changed' });
    for (const [type, word] of compare(before.split(/(\s+)/), after.split(/(\s+)/))) {
      line.append(type === 'same' ? word : el(type === 'add' ? 'ins' : 'del', { text: word }));
    }
    return line;
  }

  // Line by line. A run of lines taken out followed by as many put in reads
  // as those lines changed in place, so only the changed words stand out.
  // Unchanged stretches are folded down to a line or two.
  function diffView(before, after) {
    const raw = compare(before.split('\n'), after.split('\n'));
    const lines = [];
    for (let k = 0; k < raw.length;) {
      let d = k;
      while (d < raw.length && raw[d][0] === 'del') d++;
      let e = d;
      while (e < raw.length && raw[e][0] === 'add') e++;
      if (d > k && e - d === d - k) {
        for (let x = 0; x < d - k; x++) lines.push(['changed', raw[k + x][1], raw[d + x][1]]);
        k = e;
      } else if (d > k) {
        lines.push(...raw.slice(k, d));
        k = d;
      } else {
        lines.push(raw[k]);
        k++;
      }
    }
    const near = (k) => lines.slice(Math.max(0, k - 1), k + 2).some(([t]) => t !== 'same');
    const box = el('div', { class: 'diff' });
    let skipped = 0;
    lines.forEach(([type, text, newText], k) => {
      if (type === 'same' && !near(k)) { skipped++; return; }
      if (skipped) { box.append(el('div', { class: 'gap', text: `… ${skipped} unchanged line${skipped === 1 ? '' : 's'} …` })); skipped = 0; }
      box.append(type === 'changed' ? wordChange(text, newText) : el('div', { class: type === 'same' ? '' : type, text: text || ' ' }));
    });
    if (skipped) box.append(el('div', { class: 'gap', text: `… ${skipped} unchanged line${skipped === 1 ? '' : 's'} …` }));
    if (!lines.some(([t]) => t !== 'same')) box.replaceChildren(el('div', { class: 'gap', text: 'Only spacing at the ends of lines has changed.' }));
    return box;
  }

  // ---- The review dialog -----------------------------------------------------

  const dialog = $('#review');
  let pending = null;
  function openReview({ title, intro, body, save }) {
    pending = save;
    $('#review-title').textContent = title;
    $('#review-intro').textContent = intro;
    $('#review-body').replaceChildren(body);
    $('#review-error').hidden = true;
    $('#review-save').disabled = false;
    $('#review-save').textContent = 'Save to the website';
    dialog.showModal();
  }
  $('#review-cancel').addEventListener('click', () => dialog.close());
  $('#review-save').addEventListener('click', async () => {
    const button = $('#review-save');
    button.disabled = true;
    button.textContent = 'Saving…';
    $('#review-error').hidden = true;
    try {
      const message = await pending();
      dialog.close();
      toast(message || 'Saved.');
    } catch (e) {
      $('#review-error').textContent = e.message;
      $('#review-error').hidden = false;
      button.disabled = false;
      button.textContent = 'Try again';
    }
  });

  let toastTimer = 0;
  function toast(message) {
    const t = $('#toast');
    t.textContent = message;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 6000);
  }

  // Leaving with unsaved changes asks first.
  window.addEventListener('beforeunload', (e) => {
    if (unsaved.size) { e.preventDefault(); e.returnValue = ''; }
  });

  // ---- The menu: letters that drift and settle (as on the home page) ----------

  const menuEl = $('#menu');
  let menuLinks = [];
  let farthestTravel = 1;
  let letterSettings;

  function readLetterSettings() {
    const seed = values.MENU_LETTER_SEED;
    letterSettings = {
      spread: setting('MENU_LETTERS_SPREAD_SIDEWAYS', true)
        ? Math.max(0, setting('MENU_LETTER_SPACING', 0.3) - setting('MENU_LETTER_SPACING_HOVER', 0.06)) : 0,
      offset: setting('MENU_LETTERS_NUDGE_UP_DOWN', true) ? Math.max(0, setting('MENU_LETTER_OFFSET', 0.12)) : 0,
      hoverMs: Math.max(0, setting('MENU_HOVER_SPEED_MS', 450)),
      even: setting('MENU_LETTERS_EVEN_SPEED', true),
      stagger: Math.max(0, setting('MENU_LETTER_STAGGER_MS', 70)),
      underlineDelay: Math.max(0, setting('MENU_UNDERLINE_DELAY_MS', 80)),
      seed: Number.isFinite(seed) ? seed | 0 : Math.floor(Math.random() * 2147483647),
    };
    menuEl.classList.toggle('underline', setting('MENU_UNDERLINE_ON_HOVER', true));
    menuEl.classList.toggle('hover-expands', setting('MENU_HOVER_EXPANDS', false));
  }

  const letterTravel = (chars, spread, jitter) => Math.hypot(((chars - 1) / 2) * spread, jitter);

  function layOutLetters(link, linkIndex) {
    const L = letterSettings;
    const label = link.dataset.label;
    const chars = [...label];
    const size = parseFloat(getComputedStyle(link).fontSize) || 18;
    const spread = L.spread * size, jitter = L.offset * size;
    const wobble = (i) => {
      let h = Math.imul(i + 1, 2654435761) ^ Math.imul(linkIndex + 1, 374761393) ^ Math.imul(L.seed, 2246822519);
      h = Math.imul(h ^ (h >>> 15), 2246822519);
      h = Math.imul(h ^ (h >>> 13), 3266489917);
      return (((h ^ (h >>> 16)) >>> 0) / 4294967296) * 2 - 1;
    };
    const shifts = chars.map((ch, i) => (i - (chars.length - 1) / 2) * spread);
    const middle = shifts.reduce((a, b) => a + b, 0) / (shifts.length || 1);
    let settledAt = 0;
    link.replaceChildren(...chars.map((ch, i) => {
      const span = el('span', { class: 'menu-letter', text: ch === ' ' ? ' ' : ch });
      const dx = shifts[i] - middle, dy = wobble(i) * jitter;
      span.style.setProperty('--dx', dx.toFixed(2) + 'px');
      span.style.setProperty('--dy', dy.toFixed(2) + 'px');
      const ms = L.even ? Math.max(40, Math.round(L.hoverMs * Math.hypot(dx, dy) / farthestTravel)) : L.hoverMs;
      const delay = Math.round(Math.abs(wobble(i)) * L.stagger);
      span.style.setProperty('--ms', ms + 'ms');
      span.style.setProperty('--delay', delay + 'ms');
      settledAt = Math.max(settledAt, ms + delay);
      return span;
    }));
    link.style.setProperty('--underline-delay', settledAt + L.underlineDelay + 'ms');
    const room = Math.max(...shifts.map((v) => Math.abs(v - middle)));
    link.style.setProperty('--spread-room', room.toFixed(1) + 'px');
    link.style.paddingLeft = link.style.paddingRight = (8 + room).toFixed(1) + 'px';
  }

  function centerLetters() {
    const box = menuEl.getBoundingClientRect();
    const mid = box.left + box.width / 2;
    menuEl.classList.add('measuring');
    for (const link of menuLinks) {
      link.style.transform = 'none';
      const boxes = [...link.querySelectorAll('.menu-letter')].map((s) => s.getBoundingClientRect());
      if (!boxes.length) continue;
      const left = Math.min(...boxes.map((b) => b.left)), right = Math.max(...boxes.map((b) => b.right));
      link.style.transform = `translateX(${(mid - (left + right) / 2).toFixed(2)}px)`;
      link.style.setProperty('--word-width', (right - left).toFixed(1) + 'px');
    }
    menuEl.classList.remove('measuring');
  }

  function layOutMenu() {
    if (!menuLinks.length) return;
    const size = parseFloat(getComputedStyle(menuLinks[0]).fontSize) || 18;
    const longest = Math.max(...menuLinks.map((a) => a.dataset.label.length), 1);
    farthestTravel = Math.max(1, letterTravel(longest, letterSettings.spread * size, letterSettings.offset * size));
    menuLinks.forEach((link, i) => layOutLetters(link, i));
    centerLetters();
  }

  function buildMenus() {
    const nav = $('nav', menuEl);
    menuLinks = options.map((o) => el('a', { href: '#' + o.id, 'data-label': o.label }));
    nav.replaceChildren(...menuLinks);
    layOutMenu();
    if (document.fonts) document.fonts.ready.then(layOutMenu);
    let resizeTimer = 0;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(layOutMenu, 150); });

    // The bar across the top: Home, then every option.
    const barLetters = (text) => [...text].map((ch) => el('span', { class: 'bar-letter', text: ch === ' ' ? ' ' : ch }));
    const homeLabel = String(setting('TOP_MENU_HOME_LABEL', 'Home')).trim() || 'Home';
    const home = el('a', { href: '#', 'aria-label': homeLabel }, ...barLetters(homeLabel));
    $('#quick-list').replaceChildren(home, ...options.map((o) => el('a', { href: '#' + o.id, 'aria-label': o.label }, ...barLetters(o.label))));

    // Shown once the menu has scrolled out of view.
    const bar = $('#quick-nav');
    new IntersectionObserver(([e]) => bar.classList.toggle('show', !e.isIntersecting)).observe(nav);
  }

  // ---- Gliding to a section (as on the home page) ------------------------------

  let glideFrame = 0, glideDone = null;
  function endGlide() {
    cancelAnimationFrame(glideFrame);
    glideFrame = 0;
    const done = glideDone;
    glideDone = null;
    if (done) done();
  }
  function glideTo(top, ms, done) {
    endGlide();
    const from = window.scrollY, distance = top - from;
    if (!setting('SECTION_LINKS_SCROLL_SMOOTHLY', true) || ms <= 0 || Math.abs(distance) < 2) {
      window.scrollTo({ top, behavior: 'instant' });
      if (done) setTimeout(done, Math.max(0, setting('MENU_CLICK_NUDGE_SPEED_MS', 300)) * 2);
      return;
    }
    glideDone = done || null;
    const start = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now) => {
      const t = Math.min(1, (now - start) / ms);
      window.scrollTo({ top: from + distance * ease(t), behavior: 'instant' });
      if (t < 1) glideFrame = requestAnimationFrame(step);
      else { glideFrame = 0; endGlide(); }
    };
    glideFrame = requestAnimationFrame(step);
  }
  for (const type of ['wheel', 'touchstart', 'keydown']) {
    window.addEventListener(type, () => { if (glideFrame) endGlide(); }, { passive: true });
  }
  const sectionTop = (s) => Math.max(0, s.getBoundingClientRect().top + window.scrollY - Math.max(0, setting('SECTION_SCROLL_MARGIN', 96)));

  function scrollToHash(glide, done) {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = id && document.getElementById(id);
    const top = target && sectionEls.includes(target) ? sectionTop(target) : 0;
    const ms = target ? Math.max(0, setting('SECTION_SCROLL_MS', 1000)) : Math.max(1, setting('HOME_TRAVEL_MS', 800));
    if (glide) glideTo(top, ms, done);
    else window.scrollTo({ top, behavior: 'instant' });
  }

  // A chosen option's letters jump about until the page arrives (nudge),
  // spread (expand), and the word leans the way the page is going (move).
  let nudgedLinks = [], nudgeId = 0;
  function settleNudge() {
    nudgedLinks.forEach((link) => link.classList.remove('nudged', 'heading-down', 'heading-up'));
    nudgedLinks = [];
  }
  function nudge(link, direction) {
    settleNudge();
    const id = ++nudgeId;
    const settle = () => { if (id === nudgeId) settleNudge(); };
    const NUDGE_ON = setting('MENU_CLICK_NUDGE', true), EXPAND_ON = setting('MENU_CLICK_EXPAND', true), MOVE_ON = setting('MENU_CLICK_MOVE_TOWARD_SECTION', true);
    if (!NUDGE_ON && !EXPAND_ON && !MOVE_ON) return settle;
    const NUDGE_EM = Math.max(0, setting('MENU_CLICK_NUDGE_AMOUNT', 0.2)), EXPAND_EM = Math.max(0, setting('MENU_CLICK_EXPAND_AMOUNT', 0.12));
    const letters = [...link.querySelectorAll('.menu-letter, .bar-letter')];
    const middle = (letters.length - 1) / 2;
    letters.forEach((letter, i) => {
      const y = NUDGE_ON ? (0.4 + 0.6 * Math.random()) * NUDGE_EM * (i % 2 ? 1 : -1) : 0;
      const x = EXPAND_ON ? (i - middle) * EXPAND_EM : 0;
      letter.style.setProperty('--ny', y.toFixed(3) + 'em');
      letter.style.setProperty('--nx', x.toFixed(3) + 'em');
    });
    link.classList.add('nudged');
    if (MOVE_ON && direction) link.classList.add(direction > 0 ? 'heading-down' : 'heading-up');
    nudgedLinks = [link];
    return settle;
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest('#menu nav a, #quick-list a');
    if (!link || e.defaultPrevented || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (setting('MENU_CLICK_GLOW', true)) {
      link.classList.remove('glow');
      void link.offsetWidth;
      link.classList.add('glow');
    }
    const hash = link.getAttribute('href');
    const url = location.pathname + (hash === '#' ? '' : hash);
    if (location.pathname + location.hash !== url) history.pushState(null, '', url);
    const target = hash.length > 1 && document.getElementById(hash.slice(1));
    const top = target ? sectionTop(target) : 0;
    scrollToHash(true, nudge(link, Math.sign(top - window.scrollY)));
  });
  document.addEventListener('animationend', (e) => {
    if (e.animationName === 'menu-glow') e.target.classList.remove('glow');
  });
  window.addEventListener('popstate', () => scrollToHash(true));

  // ---- Start ------------------------------------------------------------------

  async function start() {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    const status = $('#status');
    let data;
    try {
      data = await call('/admin/api/load');
    } catch (e) {
      status.textContent = e.message;
      status.append(' ', el('button', { type: 'button', class: 'button', text: 'Try again', onclick: () => location.reload() }));
      return;
    }
    for (const f of data.files) files.set(f.path, f);
    settingsFile = files.get('settings.md') || null;
    values = settingsFile ? Object.fromEntries(settingsFile.settings.map((s) => [s.name, s.value])) : {};

    applyLook();
    applyTitle();
    readLetterSettings();
    options = workOutOptions();
    sectionEls = options.map((o) => (o.file === 'settings.md' ? buildSettingsSection(o) : buildPageSection(o)));
    $('#sections').replaceChildren(...sectionEls);
    buildMenus();
    status.textContent = '';
    if (location.hash) {
      scrollToHash(false);
      if (document.fonts) document.fonts.ready.then(() => scrollToHash(false));
    }
  }

  start();
})();
