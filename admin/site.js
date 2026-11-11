// The site editor: the admin laid out like the website itself. The real
// site fills the window (in a frame), and things are changed by clicking
// them there:
//
//   - a section's words: click them, and they turn into the text file
//     they're written in, right where they were. Click away (or Done) to see
//     them as they'll look.
//   - the photos scattered around: click one for "Add/Remove photos".
//   - the title and menu at the top: click for the menu or the title.
//   - everything else: the gear in the top-right corner (Settings, Photos,
//     Menu, the formatting key, and the way back to the classic layout).
//
// Nothing is saved until "Save & Publish", in the box that appears at the
// bottom of the screen once something has changed.
//
// admin.js loads the files and hands over its parts (the same settings,
// photos and menu as the classic layout, and the same saving), so this file
// is only the layout. ADMIN_LAYOUT = "classic" in settings.md (or
// /admin/?layout=classic) brings the classic layout back.
//
// The page in the frame reads its settings and words from here
// (window.siteEditor.textFor, used by /editorhook.js), so it always shows
// the latest saved version plus whatever hasn't been saved yet.

window.startSiteEditor = function startSiteEditor(P) {
  const { $, el, toast } = P;
  document.body.classList.add('site-editor');
  // The editor's own on/off settings, as the switches in Settings are now
  // (saved or not), so each one changes the moment it's flipped.
  const liveSetting = (name, fallback) => {
    let value = P.setting(name, fallback);
    const row = P.edits.get(name);
    if (row) { try { value = row.value(); } catch (e) { /* keep the saved one */ } }
    return value;
  };
  const switchOn = (name, fallback) => liveSetting(name, fallback) === true;

  // ADMIN_GEAR_OUTLINE: "always", "never", or "over the bar" (only while the
  // site's menu bar is behind the gear). The gear's "Settings" label follows
  // the gear. (true / false, from before there were three, still work.)
  let gearOverBar = false;
  const applyGearOutline = () => {
    const mode = liveSetting('ADMIN_GEAR_OUTLINE', 'never');
    const word = String(mode).trim().toLowerCase();
    const on = mode === true || word === 'always' || (word === 'over the bar' && gearOverBar);
    document.body.classList.toggle('gear-outline', on);
  };

  const applySwitches = () => {
    applyGearOutline();
    document.body.classList.toggle('panel-slide-in', switchOn('ADMIN_PANEL_SLIDE_IN', false));
    document.body.classList.toggle('tabs-spread-letters', switchOn('ADMIN_TABS_SPREAD_LETTERS', true));
    document.body.classList.toggle('settings-arrow-animation', switchOn('ADMIN_SETTINGS_ARROW_ANIMATION', false));
    // The outline round what can be edited lives in the page in the frame.
    if (frameDoc && frameDoc.documentElement) {
      frameDoc.documentElement.classList.toggle('sfs-outline-fade', switchOn('ADMIN_OUTLINE_FADE', false));
    }
  };
  // The gear lines up with the site's menu bar.
  document.documentElement.style.setProperty('--site-bar-height', Math.max(24, P.setting('TOP_MENU_HEIGHT', 64)) + 'px');

  // ---- What's changed and not saved ----------------------------------------

  // A page's words being changed: path -> { text, pending }, where pending
  // holds pictures added to the words and not saved yet (address -> picture).
  const drafts = new Map();
  // Pictures saved a moment ago, shown from this visit until the website has
  // them (address -> picture).
  const recent = new Map();
  const savedText = (path) => (P.files.has(path) ? P.files.get(path).text : null);
  const draftText = (path) => (drafts.has(path) ? drafts.get(path).text : savedText(path));
  const picturesInUse = (draft) => [...draft.pending.values()].filter((p) => draft.text.includes('(' + p.path + ')'));

  function setDraft(path, text, pending) {
    text = text.replace(/\r\n?/g, '\n');
    const draft = { text, pending };
    if (text === savedText(path) && !picturesInUse(draft).length) {
      drafts.delete(path);
      P.unsaved.delete(path);
    } else {
      drafts.set(path, draft);
      P.unsaved.add(path);
    }
    updatePublish();
  }

  // ---- What the page in the frame reads -------------------------------------

  // settings.md as saved, then every setting as the admin now has it (a photo
  // just added, say), then the changes not saved yet. Later lines win.
  function settingsText() {
    const file = P.settingsFile;
    if (!file) return null;
    const line = (name, value) => `${name} = ${JSON.stringify(value)}`;
    const now = file.settings.filter((s) => s.kind !== 'unreadable').map((s) => line(s.name, s.value));
    const { changes } = P.settingChanges();
    const unsaved = Object.entries(changes).map(([name, value]) => line(name, value));
    return file.text + '\n\n```js\n' + now.join('\n') + '\n```\n\n```js\n' + unsaved.join('\n') + '\n```\n';
  }
  window.siteEditor = {
    textFor(path) {
      if (path === 'settings.md') return settingsText();
      return P.files.has(path) ? draftText(path) : null;
    },
  };

  // ---- The layout -------------------------------------------------------------

  const frame = el('iframe', { id: 'site-frame', title: 'The website, as it will look', src: '/' });
  const gear = el('button', { type: 'button', id: 'gear', 'aria-label': 'Settings' });
  // Its name, shown beside it while the pointer is over it.
  const gearTag = el('div', { id: 'gear-tag', text: 'Settings', 'aria-hidden': 'true' });
  const panelBody = el('div', { class: 'panel-body' });
  const tabs = el('nav', { class: 'panel-tabs', 'aria-label': 'Settings and more' });
  const panel = el('aside', { id: 'panel', hidden: true, 'aria-label': 'Settings' },
    el('div', { class: 'panel-top' }, tabs),
    panelBody);
  const publishWhat = el('p', { class: 'publish-what' });
  const publishDetails = el('div', { class: 'publish-details', hidden: true });
  const publishError = el('p', { class: 'publish-error', role: 'alert', hidden: true });
  const seeButton = el('button', { type: 'button', class: 'button', text: 'See changes' });
  const discardButton = el('button', { type: 'button', class: 'button', text: 'Discard' });
  const publishButton = el('button', { type: 'button', class: 'button primary', text: 'Save & Publish' });
  const publish = el('div', { id: 'publish', hidden: true, role: 'region', 'aria-label': 'Unsaved changes' },
    publishWhat, publishDetails, publishError,
    el('div', { class: 'publish-actions' }, seeButton, discardButton, publishButton));
  const spot = el('div', { id: 'spot-menu', hidden: true, role: 'menu' });
  // "Click to edit", following the pointer over anything that can be edited.
  const hoverTag = el('div', { id: 'hover-tag', hidden: true, text: 'Click to edit', 'aria-hidden': 'true' });
  document.body.append(frame, gear, gearTag, panel, publish, spot, hoverTag);

  // The gear: assets/gear-icon-vector.svg, put straight into the page so it
  // can take the site's colors (the accent color, outlined in the text
  // color, so it shows on the page and on the accent-colored menu bar alike).
  fetch('/assets/gear-icon-vector.svg')
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status))))
    .then((svg) => {
      gear.innerHTML = svg;
      const icon = gear.querySelector('svg');
      if (!icon) throw new Error('no picture in it');
      icon.removeAttribute('width');
      icon.removeAttribute('height');
      icon.setAttribute('aria-hidden', 'true');
      icon.removeAttribute('role');
      icon.removeAttribute('aria-label');
      // The gear sits in the middle of a much bigger blank picture: show just
      // the gear, so it fills the button.
      const box = icon.getBBox();
      if (box.width && box.height) {
        const pad = Math.max(box.width, box.height) * 0.04;
        icon.setAttribute('viewBox', [box.x - pad, box.y - pad, box.width + 2 * pad, box.height + 2 * pad].map((n) => n.toFixed(1)).join(' '));
      }
    })
    .catch(() => { gear.textContent = '⚙'; });

  // ---- The panel: Settings, Photos, Menu, Formatting key ----------------------

  const optionFor = (file) => P.options.find((o) => o.file === file);
  const kinds = [
    ['settings', optionFor('settings.md'), (o) => P.buildSettingsSection(o)],
    ['photos', optionFor('photos'), (o) => P.buildPhotosSection(o)],
    ['menu', optionFor('menu'), (o) => P.buildMenuSection(o)],
    ['key', { label: 'Formatting key' }, () => P.buildKey()],
  ].filter(([, option]) => option);
  const built = new Map();
  // Built now, so changes to settings can be followed from the start.
  const buildKind = (kind) => {
    if (!built.has(kind)) {
      const [, option, make] = kinds.find(([k]) => k === kind);
      built.set(kind, make(option));
    }
    return built.get(kind);
  };
  if (kinds.some(([k]) => k === 'settings')) {
    const intro = $('.settings-intro', buildKind('settings'));
    if (intro) intro.textContent = 'Open a group to see its settings. Changed settings are highlighted; nothing is saved until you choose Save & Publish at the bottom of the screen. Close this panel to see the website with your changes first.';
    // Any setting changing (in the panel, or put back by Discard).
    buildKind('settings').addEventListener('settings-changed', () => { updatePublish(); applySwitches(); });
  }
  const tabButtons = new Map(kinds.map(([kind, option]) => [kind,
    el('button', { type: 'button', class: 'panel-tab', text: option.label, onclick: () => openPanel(kind) })]));
  tabs.append(...tabButtons.values());

  let panelKind = null, panelOpenedWith = null;
  // What the page in the frame was last shown with, so closing the panel
  // after changing a setting (or the photos) shows the site with it.
  const lookKey = () => JSON.stringify([P.settingChanges().changes, P.values.PHOTOS]);
  let shownLook = lookKey();

  function openPanel(kind, find) {
    if (!kinds.some(([k]) => k === kind)) return;
    hideSpot();
    finishEditing();
    if (panel.hidden) panelOpenedWith = shownLook;
    panelKind = kind;
    for (const [k, b] of tabButtons) b.classList.toggle('current', k === kind);
    panelBody.replaceChildren(buildKind(kind));
    panel.hidden = false;
    document.body.classList.add('panel-open');
    checkGearOverBar();
    panelBody.scrollTop = 0;
    // Straight to one setting (the title, say).
    if (find && kind === 'settings') {
      const search = $('.settings-search', panelBody);
      if (search) {
        search.value = find;
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }
  function closePanel() {
    if (panel.hidden) return;
    panel.hidden = true;
    panelKind = null;
    document.body.classList.remove('panel-open');
    checkGearOverBar();
    const search = $('.settings-search', built.get('settings') || document.createElement('div'));
    if (search && search.value) {
      search.value = '';
      search.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (lookKey() !== panelOpenedWith) reloadFrame();
  }
  // The gear opens Settings, and closes the panel whichever part of it is
  // showing. A click anywhere outside the panel closes it too.
  gear.addEventListener('click', () => (panel.hidden ? openPanel('settings') : closePanel()));
  document.addEventListener('click', (e) => {
    if (panel.hidden || !e.isTrusted) return;
    const t = e.target;
    if (panel.contains(t) || gear.contains(t) || publish.contains(t) || spot.contains(t) || t.closest('dialog, #toast')) return;
    closePanel();
  });
  // In the settings, "Reorder, add or delete them in Menu" and the like
  // lead to that part of the panel.
  panelBody.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    const found = kinds.find(([, option]) => option.id === id);
    if (found) { e.preventDefault(); openPanel(found[0]); }
    else if (id === 'formatting') { e.preventDefault(); openPanel('key'); }
  });
  panelBody.addEventListener('settings-changed', (e) => { if (!built.get('settings') || !built.get('settings').contains(e.target)) updatePublish(); });

  // ---- The page in the frame ------------------------------------------------------

  let frameDoc = null, frameWin = null, keepScroll = null;
  applySwitches();

  // Is the site's menu bar behind the gear right now? (Asked of the page in
  // the frame, at the gear's middle; the frame fills the window, so a spot
  // here is the same spot there.) With the panel open, the panel is behind
  // the gear instead.
  function checkGearOverBar() {
    let over = false;
    if (frameDoc && panel.hidden) {
      const r = gear.getBoundingClientRect();
      try {
        const hit = frameDoc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        over = !!(hit && hit.closest('#quick-nav'));
      } catch (e) { over = false; }
    }
    if (over !== gearOverBar) {
      gearOverBar = over;
      applyGearOutline();
    }
  }
  // The bar slides in and out (TOP_MENU_SLIDE_MS), so keep asking for a
  // moment after anything that might move it.
  let barWatchUntil = 0, barWatchFrame = 0;
  function watchBar() {
    barWatchUntil = performance.now() + Math.max(0, Number(P.setting('TOP_MENU_SLIDE_MS', 350)) || 0) + 250;
    if (barWatchFrame) return;
    const tick = () => {
      checkGearOverBar();
      barWatchFrame = performance.now() < barWatchUntil ? requestAnimationFrame(tick) : 0;
    };
    barWatchFrame = requestAnimationFrame(tick);
  }
  window.addEventListener('resize', watchBar);

  function reloadFrame() {
    finishEditing();
    try { keepScroll = frameWin ? frameWin.scrollY : null; } catch (e) { keepScroll = null; }
    shownLook = lookKey();
    try { frame.contentWindow.location.reload(); } catch (e) { frame.src = frame.src; }
  }

  frame.addEventListener('load', () => {
    editing = null;
    hideSpot();
    try {
      frameWin = frame.contentWindow;
      frameDoc = frame.contentDocument;
    } catch (e) {
      frameWin = frameDoc = null;
    }
    if (!frameDoc || !frameDoc.documentElement) return; // another website
    shownLook = lookKey();
    const style = frameDoc.createElement('style');
    style.textContent = FRAME_CSS;
    frameDoc.head.appendChild(style);
    applySwitches();
    frameDoc.addEventListener('click', onFrameClick, true);
    frameDoc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { hideSpot(); finishEditing(); }
    });
    frameWin.addEventListener('scroll', hideSpot, { passive: true });
    frameWin.addEventListener('scroll', watchBar, { passive: true });
    watchBar();
    // "Click to edit" follows the pointer over words that can be edited (not
    // the ones being edited) and over the photos. The frame fills the window,
    // so a spot in it is the same spot out here.
    const tagAt = (e) => {
      const t = e.target;
      const over = panel.hidden && t instanceof frameWin.Element && !t.closest('.sfs-editor, .sfs-editing')
        && (editableAt(t) || t.closest('.read-photo') || titleSettingAt(t));
      hoverTag.hidden = !over;
      if (over) hoverTag.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 18}px)`;
    };
    frameDoc.addEventListener('mousemove', tagAt, { passive: true });
    frameWin.addEventListener('scroll', () => { hoverTag.hidden = true; }, { passive: true });
    frameDoc.documentElement.addEventListener('mouseleave', () => { hoverTag.hidden = true; });
    // Pictures not on the website yet are shown from this visit.
    showPictures(frameDoc);
    new MutationObserver((list) => {
      for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1) showPictures(n);
    }).observe(frameDoc.documentElement, { childList: true, subtree: true });
    // Back where it was, after the page was reloaded to show a change.
    if (keepScroll !== null) {
      const y = keepScroll;
      keepScroll = null;
      const back = () => frameWin.scrollTo({ top: y, behavior: 'instant' });
      setTimeout(back, 300);
      setTimeout(back, 1200);
    }
  });

  function showPictures(root) {
    const imgs = root.tagName === 'IMG' ? [root] : [...root.querySelectorAll('img[src]')];
    for (const img of imgs) {
      const src = (img.getAttribute('src') || '').replace(/^\.?\//, '');
      const all = [...recent, ...[...drafts.values()].flatMap((d) => [...d.pending])];
      const found = all.find(([path]) => path === src);
      if (found) img.src = found[1].preview;
    }
  }

  // What a click on the page in the frame does.
  function onFrameClick(e) {
    if (e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const t = e.target;
    if (!(t instanceof frameWin.Element)) return;
    if (t.closest('.sfs-editor')) return; // typing in the words
    hideSpot();
    // With the panel open, a click on the site only closes the panel.
    if (!panel.hidden) {
      e.preventDefault();
      e.stopPropagation();
      closePanel();
      return;
    }
    const box = editableAt(t);
    if (box) {
      e.preventDefault();
      e.stopPropagation();
      if (!editing || editing.box.el !== box.el) startEditing(box);
      hoverTag.hidden = true;
      return;
    }
    finishEditing();
    // A photo: straight to the photos.
    if (t.closest('.read-photo')) {
      e.preventDefault();
      e.stopPropagation();
      hoverTag.hidden = true;
      openPanel('photos');
      return;
    }
    // The title, or the line under it: straight to its settings.
    const titleSetting = titleSettingAt(t);
    if (titleSetting) {
      e.preventDefault();
      e.stopPropagation();
      hoverTag.hidden = true;
      openPanel('settings', titleSetting);
      return;
    }
    // A link to another website opens in a new tab, so the editor stays.
    const link = t.closest('a[href]');
    if (link) {
      let url;
      try { url = new URL(link.href, frameWin.location.href); } catch (err) { return; }
      if (url.origin !== location.origin || /^\/admin(\/|$)/.test(url.pathname)) {
        e.preventDefault();
        e.stopPropagation();
        window.open(url.href, '_blank', 'noopener');
      }
    }
  }

  // The home screen's title (MENU_TITLE) or the line under it (MENU_SUBTITLE)
  // under the pointer: the setting it's written in.
  function titleSettingAt(t) {
    if (t.closest('#menu h1')) return 'MENU_TITLE';
    if (t.closest('#menu .subtitle')) return 'MENU_SUBTITLE';
    return null;
  }

  // The words under a click: a section on the home page, or the words of a
  // page of its own (Contact, Payments, the play).
  function editableAt(t) {
    const section = t.closest('#sections > section.section');
    if (section) {
      const path = `sections/${section.id}.md`;
      const body = section.querySelector(':scope > div');
      if (!P.files.has(path) || !body) return null;
      return { el: section, body, path, option: optionFor(path) || { label: section.id, file: path, page: '' } };
    }
    const own = t.closest('[data-text-file], #pay-content');
    if (own) {
      const path = (own.dataset.textFile || String(frameWin.PAYMENTS_TEXT_FILE || 'sections/payments/payments.md')).trim().replace(/^\.?\//, '');
      if (!P.files.has(path)) return null;
      return { el: own, body: own, path, option: optionFor(path) || { label: path, file: path, page: 'page' } };
    }
    return null;
  }

  // ---- Editing words in place --------------------------------------------------------

  let editing = null;

  function startEditing(box) {
    finishEditing();
    const doc = box.el.ownerDocument;
    const make = (tag, props = {}) => Object.assign(doc.createElement(tag), props);
    const draft = drafts.get(box.path);
    const pending = draft ? draft.pending : new Map();
    const textBox = make('textarea', { className: 'sfs-text', spellcheck: true, value: draftText(box.path) || '' });
    textBox.setAttribute('aria-label', `Words for ${box.option.label}`);
    const chooser = make('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: true, hidden: true });
    const button = (text, onclick, primary) => {
      const b = make('button', { type: 'button', className: 'sfs-button' + (primary ? ' primary' : ''), textContent: text });
      b.addEventListener('click', onclick);
      return b;
    };
    const tools = make('div', { className: 'sfs-tools' });
    tools.append(
      button('Add a picture', () => chooser.click()),
      button('Formatting key', () => openPanel('key')),
      button('Done', () => finishEditing(), true),
      chooser);
    const hint = make('p', { className: 'sfs-hint', textContent: 'You\'re editing the text file these words are written in. Click Done, or anywhere outside it, to see how they\'ll look.' });
    const editorEl = make('div', { className: 'sfs-editor' });
    editorEl.append(hint, textBox, tools);
    box.body.classList.add('sfs-hidden');
    box.body.after(editorEl);
    box.el.classList.add('sfs-editing');

    const grow = () => {
      textBox.style.height = 'auto';
      textBox.style.height = textBox.scrollHeight + 4 + 'px';
    };
    textBox.addEventListener('input', () => {
      grow();
      setDraft(box.path, textBox.value, pending);
    });
    // Keys typed here are for the words, not for the page (which has a
    // shortcut or two of its own).
    textBox.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') finishEditing();
    });
    chooser.addEventListener('change', async () => {
      const chosen = [...chooser.files];
      chooser.value = '';
      const taken = (name) => P.sitePaths.has(P.photoFolder() + name)
        || [...drafts.values(), { pending }].some((d) => [...d.pending.values()].some((q) => q.name === name));
      const problems = [];
      let insert = '';
      for (const file of chosen) {
        try {
          const p = await P.preparePicture(file, taken);
          pending.set(p.path, p);
          insert += `![${P.photoTitle(p.name)}](${p.path})\n`;
        } catch (err) {
          problems.push(`${file.name}: ${err.message}`);
        }
      }
      if (problems.length) toast(problems.join(' '));
      if (!insert) return;
      // On a line of its own, where the cursor is.
      const at = textBox.selectionStart, value = textBox.value;
      const before = value.slice(0, at), after = value.slice(textBox.selectionEnd);
      const text = (before && !before.endsWith('\n') ? '\n' : '') + insert + (after && !after.startsWith('\n') ? '\n' : '');
      textBox.focus();
      textBox.setRangeText(text, at, textBox.selectionEnd, 'end');
      grow();
      setDraft(box.path, textBox.value, pending);
    });

    editing = { box, editorEl, textBox, pending };
    grow();
    textBox.focus({ preventScroll: true });
    textBox.setSelectionRange(0, 0);
  }

  function finishEditing() {
    if (!editing) return;
    const { box, editorEl, textBox, pending } = editing;
    editing = null;
    setDraft(box.path, textBox.value, pending);
    editorEl.remove();
    box.body.classList.remove('sfs-hidden');
    box.el.classList.remove('sfs-editing');
    showWords(box);
  }

  // The words drawn the way the site draws them (the home page's sections
  // keep their phone number and Venmo logo, which aren't part of the words).
  function showWords(box) {
    const text = draftText(box.path) || '';
    const keep = [...box.body.querySelectorAll(':scope > .contact')];
    const draft = drafts.get(box.path);
    const pictures = new Map([...recent, ...(draft ? draft.pending : [])]);
    P.renderInto(box.body, text, box.option, pictures);
    box.body.append(...keep);
  }

  // ---- The little menu where something was clicked ----------------------------------

  function showSpot(e, items) {
    spot.replaceChildren(...items.map(([text, act]) => el('button', {
      type: 'button', role: 'menuitem', text, onclick: () => { hideSpot(); act(); },
    })));
    spot.hidden = false;
    // The frame fills the window, so a spot in the frame is the same spot here.
    const x = Math.min(e.clientX + 6, window.innerWidth - spot.offsetWidth - 8);
    const y = Math.min(e.clientY + 6, window.innerHeight - spot.offsetHeight - 8);
    spot.style.left = Math.max(8, x) + 'px';
    spot.style.top = Math.max(8, y) + 'px';
    spot.querySelector('button').focus({ preventScroll: true });
  }
  function hideSpot() { spot.hidden = true; }
  document.addEventListener('click', (e) => { if (!spot.contains(e.target)) hideSpot(); });
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!spot.hidden) hideSpot();
    else if (!panel.hidden && !$('#review').open) closePanel();
  });

  // ---- Save & Publish ------------------------------------------------------------------

  const labelFor = (path) => (optionFor(path) || { label: path }).label;

  function updatePublish() {
    const pages = [...drafts.keys()].map(labelFor);
    const settings = P.changedSettings().length;
    const parts = [...pages];
    if (settings) parts.push(`${settings} setting${settings === 1 ? '' : 's'}`);
    publish.hidden = parts.length === 0;
    document.body.classList.toggle('has-changes', parts.length > 0);
    if (!parts.length) {
      publishDetails.hidden = true;
      seeButton.textContent = 'See changes';
      publishError.hidden = true;
      return;
    }
    publishWhat.replaceChildren('Unsaved changes: ', el('strong', { text: listWords(parts) }));
    if (!publishDetails.hidden) fillDetails();
  }
  const listWords = (items) => (items.length < 2 ? items.join('')
    : items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1]);

  // What's changed, as in the classic layout: words added in green, taken
  // out in red; settings old -> new.
  function fillDetails() {
    const blocks = [];
    for (const [path, draft] of drafts) {
      blocks.push(el('div', { class: 'publish-item' },
        el('h3', { text: labelFor(path) }),
        P.diffView(savedText(path) || '', draft.text),
        picturesInUse(draft).length ? el('p', { class: 'hint', text: `With ${picturesInUse(draft).length} new picture${picturesInUse(draft).length === 1 ? '' : 's'}.` }) : null));
    }
    const { changed, changes, problems } = P.settingChanges();
    if (changed.length) {
      const list = el('ul', { class: 'change-list' });
      for (const s of changed) {
        if (s.entry.name in changes) list.append(P.changeItem(s.entry, changes[s.entry.name]));
        else list.append(el('li', {}, el('div', { class: 'change-name' }, P.niceName(s.entry.name)), el('p', { class: 'problem', text: 'This setting needs fixing first (in Settings).' })));
      }
      blocks.push(el('div', { class: 'publish-item' }, el('h3', { text: 'Settings' }), list));
    }
    if (problems.length) blocks.push(el('p', { class: 'review-error', text: 'Fix these in Settings first: ' + problems.join(' ') }));
    publishDetails.replaceChildren(...blocks);
  }

  seeButton.addEventListener('click', () => {
    finishEditing();
    publishDetails.hidden = !publishDetails.hidden;
    seeButton.textContent = publishDetails.hidden ? 'See changes' : 'Hide changes';
    if (!publishDetails.hidden) fillDetails();
  });

  discardButton.addEventListener('click', () => {
    if (!confirm('Throw away every change that hasn\'t been published?')) return;
    const wasEditing = editing;
    editing = null;
    if (wasEditing) {
      wasEditing.editorEl.remove();
      wasEditing.box.body.classList.remove('sfs-hidden');
      wasEditing.box.el.classList.remove('sfs-editing');
    }
    for (const path of drafts.keys()) P.unsaved.delete(path);
    drafts.clear();
    P.changedSettings().forEach((s) => s.reset());
    updatePublish();
    reloadFrame();
  });

  publishButton.addEventListener('click', async () => {
    finishEditing();
    const { changed, changes, problems } = P.settingChanges();
    if (problems.length) {
      showError('Some settings need fixing first — they are marked in red in Settings.');
      openPanel('settings');
      return;
    }
    publishButton.disabled = discardButton.disabled = true;
    publishError.hidden = true;
    const total = drafts.size + (changed.length ? 1 : 0);
    let done = 0;
    try {
      for (const [path, draft] of [...drafts]) {
        publishButton.textContent = total > 1 ? `Publishing ${done + 1} of ${total}…` : 'Publishing…';
        const pictures = picturesInUse(draft);
        const reply = await P.call('/admin/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path, sha: P.files.get(path).sha, text: draft.text,
            pictures: pictures.map((p) => ({ name: p.name, data: p.data })) }),
        });
        for (const p of pictures) {
          P.sitePaths.add(p.path);
          recent.set(p.path, p);
        }
        P.files.set(path, { ...P.files.get(path), sha: reply.sha, text: reply.text !== undefined ? reply.text : draft.text });
        drafts.delete(path);
        P.unsaved.delete(path);
        done++;
      }
      if (changed.length) {
        publishButton.textContent = total > 1 ? `Publishing ${done + 1} of ${total}…` : 'Publishing…';
        await P.saveSettings(changed, changes);
        done++;
      }
      toast('Published. The website shows the changes in about a minute; they\'re already shown here.');
      updatePublish();
      reloadFrame();
    } catch (err) {
      showError(err.message + (done ? ` (${done} of ${total} were published.)` : ''));
      updatePublish();
    } finally {
      publishButton.disabled = discardButton.disabled = false;
      publishButton.textContent = 'Save & Publish';
    }
  });

  function showError(message) {
    publishError.textContent = message;
    publishError.hidden = false;
  }

  updatePublish();
};

// Added to the page in the frame: what can be clicked, and the editor that
// takes the place of a section's words. Uses the page's own colors.
const FRAME_CSS = `
  /* Everything that can be clicked to edit it: a section's words, a page's
     own words, the photos, the title and the line under it. A plain line
     round it while the pointer is over it, with square corners. (A photo's
     line is drawn on a box laid over it, so it stays square even though the
     photo's corners are rounded.) */
  html.in-site-editor #sections > section.section,
  html.in-site-editor [data-text-file],
  html.in-site-editor #pay-content,
  html.in-site-editor #read-photos .read-photo::after,
  html.in-site-editor #menu h1,
  html.in-site-editor #menu .subtitle {
    cursor: pointer;
    outline: 2px solid transparent;
    outline-offset: 14px;
  }
  html.in-site-editor #read-photos .read-photo::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 0;
    pointer-events: none;
  }
  html.in-site-editor #read-photos .read-photo { cursor: pointer; }
  /* ADMIN_OUTLINE_FADE: the line fades in instead of appearing at once. */
  html.in-site-editor.sfs-outline-fade #sections > section.section,
  html.in-site-editor.sfs-outline-fade [data-text-file],
  html.in-site-editor.sfs-outline-fade #pay-content,
  html.in-site-editor.sfs-outline-fade #menu h1,
  html.in-site-editor.sfs-outline-fade #menu .subtitle {
    transition: outline-color 150ms ease;
  }
  html.in-site-editor.sfs-outline-fade #read-photos .read-photo::after {
    transition: outline-color 150ms ease;
  }
  html.in-site-editor #sections > section.section:hover,
  html.in-site-editor [data-text-file]:hover,
  html.in-site-editor #pay-content:hover,
  html.in-site-editor #read-photos .read-photo:hover::after,
  html.in-site-editor #menu h1:hover,
  html.in-site-editor #menu .subtitle:hover {
    outline-color: #000000;
  }
  html.in-site-editor .sfs-editing,
  html.in-site-editor .sfs-editing:hover {
    cursor: auto;
    outline: 2px solid #000000;
  }
  html.in-site-editor .sfs-hidden { display: none !important; }
  /* The photos can be clicked (on the site they let clicks through). */
  html.in-site-editor #read-photos .read-photo { pointer-events: auto; }
  /* Room at the right end of the menu bar for the editor's gear. */
  html.in-site-editor:not(.phone-menu) #quick-list { padding-right: 76px; }

  .sfs-editor { margin-top: 0.6em; }
  .sfs-hint {
    margin: 0 0 10px;
    font: 14px/1.5 'Segoe UI', system-ui, sans-serif;
    opacity: 0.75;
  }
  .sfs-text {
    display: block;
    width: 100%;
    min-height: 220px;
    box-sizing: border-box;
    padding: 14px 16px;
    border: 1.5px solid color-mix(in srgb, var(--fg, #000) 25%, transparent);
    border-radius: 12px;
    background: color-mix(in srgb, var(--fg, #000) 4%, var(--bg, #fff));
    color: var(--fg, #000);
    font: 15px/1.6 ui-monospace, 'Cascadia Mono', Consolas, Menlo, monospace;
    resize: none;
    overflow: hidden;
    tab-size: 2;
    user-select: text;
    -webkit-user-select: text;
    cursor: text;
  }
  .sfs-text:focus { outline: none; border-color: var(--fg, #000); }
  .sfs-tools {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 12px;
  }
  .sfs-button {
    min-height: 40px;
    padding: 0 18px;
    border: 1.5px solid color-mix(in srgb, var(--fg, #000) 25%, transparent);
    border-radius: 999px;
    background: var(--bg, #fff);
    color: var(--fg, #000);
    font: 600 15px/1 'Segoe UI', system-ui, sans-serif;
    cursor: pointer;
  }
  .sfs-button:hover { border-color: var(--fg, #000); }
  .sfs-button.primary { border-color: transparent; background: var(--accent, #e8f0d4); }
`;
