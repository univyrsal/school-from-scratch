// Checks that settings which name other files still point at files that
// exist, before a settings save goes through. A setting can be perfectly
// written and still break the site: a menu option with no page behind it, a
// photo that isn't in the folder, an embed whose file was misspelt. The admin
// can't add files, so a name that points at nothing can only be a mistake.
//
// Each check runs only when one of the settings it looks at is being changed,
// so something already odd in settings.md never blocks an unrelated save.

// The same as pageSlug() in index.html and page.js: "Parent-Learning" ->
// "parent-learning", which names both sections/parent-learning.md and
// parent-learning.html.
function pageSlug(name) {
  return String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// An address on this site, as a file path ("payments.html#zelle" ->
// "payments.html"), or null for a full web address or email link.
function sitePath(address) {
  const a = String(address).trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(a) || a.startsWith('//')) return null;
  return a.split(/[?#]/)[0].replace(/^\.?\//, '');
}

const CHECKS = [
  {
    // Every menu option opens its section (sections/<name>.md, and
    // <name>.html when the gallery is off), unless MENU_LINKS sends it
    // somewhere else.
    uses: ['MENU_ITEMS', 'MENU_LINKS'],
    check(v, exists) {
      const links = v.MENU_LINKS || {};
      const out = [];
      for (const item of v.MENU_ITEMS || []) {
        if (!String(item).trim() || item in links) continue;
        const slug = pageSlug(item);
        const missing = [`sections/${slug}.md`, `${slug}.html`].filter(p => !exists(p));
        if (missing.length) out.push(`The menu option "${item}" has no page behind it (${missing.join(' and ')} would be needed). New menu options need their page made first, so ask Maxwell.`);
      }
      return out;
    },
  },
  {
    // Options only in the top bar need an address in MENU_LINKS or a page.
    uses: ['TOP_MENU_EXTRA_ITEMS', 'MENU_LINKS'],
    check(v, exists) {
      const links = v.MENU_LINKS || {};
      return (v.TOP_MENU_EXTRA_ITEMS || [])
        .filter(item => String(item).trim() && !(item in links) && !exists(`${pageSlug(item)}.html`))
        .map(item => `The top-bar option "${item}" has no page (${pageSlug(item)}.html) and no address in MENU_LINKS.`);
    },
  },
  {
    uses: ['MENU_LINKS'],
    check(v, exists) {
      return Object.entries(v.MENU_LINKS || {})
        .filter(([, address]) => sitePath(address) !== null && !exists(sitePath(address)))
        .map(([item, address]) => `The address for "${item}" in MENU_LINKS, "${address}", isn't a page on this site.`);
    },
  },
  {
    uses: ['CONTACT_PAGES', 'MENU_ITEMS', 'TOP_MENU_EXTRA_ITEMS'],
    check(v) {
      const known = [...(v.MENU_ITEMS || []), ...(v.TOP_MENU_EXTRA_ITEMS || [])].map(pageSlug);
      return (v.CONTACT_PAGES || [])
        .filter(name => !known.includes(pageSlug(name)))
        .map(name => `"${name}" in CONTACT_PAGES isn't one of the menu options.`);
    },
  },
  {
    uses: ['PHOTOS', 'PHOTO_FOLDER'],
    check(v, exists, folders) {
      const folder = folderOf(v.PHOTO_FOLDER);
      if (!folders.has(folder)) return []; // the folder check below says so
      const missing = (v.PHOTOS || []).filter(file => !exists(folder + file));
      if (!missing.length) return [];
      return [`There's no photo called ${missing.map(f => `"${f}"`).join(', ')} in ${folder || 'the site'}. Photos have to be added to the folder before they can be listed.`];
    },
  },
  {
    uses: ['PHOTO_FOLDER', 'PHOTO_SMALL_FOLDER'],
    check(v, exists, folders) {
      return ['PHOTO_FOLDER', 'PHOTO_SMALL_FOLDER']
        .filter(name => typeof v[name] === 'string' && v[name].trim() && !folders.has(folderOf(v[name])))
        .map(name => `${name} is "${v[name]}", but there's no folder by that name.`);
    },
  },
  {
    uses: ['EMBEDS'],
    check(v, exists) {
      const out = [];
      for (const [name, embed] of Object.entries(v.EMBEDS || {})) {
        const file = typeof embed === 'string' ? embed : embed && embed.file;
        if (typeof file !== 'string' || !file.trim()) out.push(`The embed "${name}" doesn't say which file to show.`);
        else if (sitePath(file) !== null && !exists(sitePath(file))) out.push(`The embed "${name}" points at "${file}", which isn't on the site.`);
      }
      return out;
    },
  },
  {
    uses: ['EMBEDS_YOU_CAN_TOUCH', 'EMBEDS'],
    check(v) {
      return (v.EMBEDS_YOU_CAN_TOUCH || [])
        .filter(name => !(name in (v.EMBEDS || {})))
        .map(name => `"${name}" in EMBEDS_YOU_CAN_TOUCH isn't one of the EMBEDS.`);
    },
  },
];

function folderOf(folder) {
  const f = String(folder || '').trim().replace(/^\.?\//, '');
  return f && !f.endsWith('/') ? f + '/' : f;
}

// values: { NAME: value } for every setting after the change.
// changed: the names being changed. paths: every file path in the repo.
// Returns a list of problems in plain words (empty when all is well).
export function checkLinks(values, changed, paths) {
  const files = new Set(paths);
  const folders = new Set(['']);
  for (const p of paths) {
    const parts = p.split('/');
    for (let i = 1; i < parts.length; i++) folders.add(parts.slice(0, i).join('/') + '/');
  }
  const exists = p => files.has(p);
  const touched = new Set(changed);
  return CHECKS
    .filter(c => c.uses.some(name => touched.has(name)))
    .flatMap(c => c.check(values, exists, folders));
}
