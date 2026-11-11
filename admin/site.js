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
  const gear = el('button', { type: 'button', id: 'gear', 'aria-label': 'Settings', title: 'Settings', html: gearIcon() });
  const panelBody = el('div', { class: 'panel-body' });
  const tabs = el('nav', { class: 'panel-tabs', 'aria-label': 'Settings and more' });
  const panel = el('aside', { id: 'panel', hidden: true, 'aria-label': 'Settings' },
    el('div', { class: 'panel-top' }, tabs,
      el('button', { type: 'button', class: 'panel-close', 'aria-label': 'Close', title: 'Close', html: closeIcon(), onclick: () => closePanel() })),
    panelBody,
    el('p', { class: 'panel-foot' },
      'Prefer the old layout? ',
      el('a', { href: '?layout=classic', text: 'Open the classic layout' }),
      ' (for this visit), or set Admin layout to "classic" in Settings to keep it.'));
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
  document.body.append(frame, gear, panel, publish, spot);

  // A gear with eight teeth, in the accent color with a dark outline so it
  // shows up on the page and on the accent-colored menu bar alike.
  function gearIcon() {
    const teeth = 8, outer = 11, inner = 8.4, c = 12;
    let d = '';
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const w = (Math.PI / teeth) * 0.55; // half a tooth's width, as an angle
      const pts = [[inner, a - w * 1.6], [outer, a - w], [outer, a + w], [inner, a + w * 1.6]];
      for (const [r, t] of pts) d += (d ? 'L' : 'M') + (c + r * Math.cos(t)).toFixed(2) + ' ' + (c + r * Math.sin(t)).toFixed(2);
      const next = ((i + 1) / teeth) * Math.PI * 2 - w * 1.6;
      d += `A${inner} ${inner} 0 0 1 ${(c + inner * Math.cos(next)).toFixed(2)} ${(c + inner * Math.sin(next)).toFixed(2)}`;
    }
    d += 'Z M15.4 12 A3.4 3.4 0 1 0 8.6 12 A3.4 3.4 0 1 0 15.4 12 Z';
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="${d}"/></svg>`;
  }
  function closeIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 18 18M18 6 6 18"/></svg>';
  }

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
    const search = $('.settings-search', built.get('settings') || document.createElement('div'));
    if (search && search.value) {
      search.value = '';
      search.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (lookKey() !== panelOpenedWith) reloadFrame();
  }
  // The gear opens Settings (from another part of the panel too), and
  // closes the panel when Settings is already showing.
  gear.addEventListener('click', () => (panelKind === 'settings' ? closePanel() : openPanel('settings')));
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
  panelBody.addEventListener('settings-changed', () => updatePublish());

  // ---- The page in the frame ------------------------------------------------------

  let frameDoc = null, frameWin = null, keepScroll = null;

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
    frameDoc.addEventListener('click', onFrameClick, true);
    frameDoc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { hideSpot(); finishEditing(); }
    });
    frameWin.addEventListener('scroll', hideSpot, { passive: true });
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
    const box = editableAt(t);
    if (box) {
      e.preventDefault();
      e.stopPropagation();
      if (!editing || editing.box.el !== box.el) startEditing(box);
      return;
    }
    finishEditing();
    if (t.closest('.read-photo')) {
      e.preventDefault();
      e.stopPropagation();
      showSpot(e, [['Add/Remove photos', () => openPanel('photos')]]);
      return;
    }
    // The title, the line under it and the space round the options (the
    // options themselves still lead to their sections).
    if (t.closest('#menu') && !t.closest('#menu nav a, #menu .notice[href]')) {
      e.preventDefault();
      e.stopPropagation();
      showSpot(e, [
        ['Change the menu', () => openPanel('menu')],
        ['Change the title', () => openPanel('settings', 'MENU_TITLE')],
      ]);
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
  html.in-site-editor #sections > section.section,
  html.in-site-editor [data-text-file],
  html.in-site-editor #pay-content {
    cursor: pointer;
    border-radius: 12px;
    outline: 2px dashed transparent;
    outline-offset: 14px;
    transition: outline-color 150ms ease;
  }
  html.in-site-editor [data-text-file],
  html.in-site-editor #pay-content { position: relative; }
  html.in-site-editor #sections > section.section:hover,
  html.in-site-editor [data-text-file]:hover,
  html.in-site-editor #pay-content:hover {
    outline-color: color-mix(in srgb, var(--fg, #000) 35%, transparent);
  }
  /* "Click to edit", above the words while the pointer is over them. */
  html.in-site-editor #sections > section.section::before,
  html.in-site-editor [data-text-file]::before,
  html.in-site-editor #pay-content::before {
    content: 'Click to edit';
    position: absolute;
    /* On the dashed line, at its top-left corner. */
    left: 10px;
    top: -28px;
    padding: 4px 12px;
    border-radius: 999px;
    background: var(--accent, #e8f0d4);
    color: var(--fg, #000);
    font: 700 13px/1.4 'Segoe UI', system-ui, sans-serif;
    letter-spacing: 0.02em;
    opacity: 0;
    pointer-events: none;
    transition: opacity 150ms ease;
  }
  html.in-site-editor #sections > section.section:hover::before,
  html.in-site-editor [data-text-file]:hover::before,
  html.in-site-editor #pay-content:hover::before { opacity: 1; }
  html.in-site-editor .sfs-editing,
  html.in-site-editor .sfs-editing:hover {
    cursor: auto;
    outline: 2px solid var(--fg, #000);
  }
  html.in-site-editor .sfs-editing::before { display: none; }
  html.in-site-editor .sfs-hidden { display: none !important; }
  /* The photos and the title can be clicked too. */
  html.in-site-editor #read-photos .read-photo { pointer-events: auto; cursor: pointer; }
  html.in-site-editor #read-photos .read-photo:hover { filter: brightness(0.9); }
  html.in-site-editor #menu h1,
  html.in-site-editor #menu .subtitle { cursor: pointer; }
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
