// Adds a section to the home page, or deletes one, from the admin. Each is
// one commit on main, so the website shows it in about a minute.
//
//   POST /admin/api/sections   (JSON only)
//
//   { "action": "add", "name": "Garden Days" }
//   -> { ok: true, name, file: "sections/garden-days.md", settingsSha }
//
//   { "action": "remove", "name": "Garden Days" }
//   -> { ok: true, name, settingsSha }
//
// A section is three things, kept in step here:
//   - its name in MENU_ITEMS (settings.md), which puts it in the menu
//   - its words, sections/<name>.md ("Garden Days" -> garden-days.md), which
//     start empty, so the site shows "Under Development" until written
//   - its own page file, <name>.html, which the menu opens instead when the
//     gallery is off or in explore mode (a copy of the others, renamed)
// Deleting takes all three away, and the name out of CONTACT_PAGES too.
// Either way, the plain list of links index.html shows when its script
// can't run is rewritten to match the menu.
//
// Moving sections up and down the menu is a settings save (MENU_ITEMS), done
// through save.js like any other setting.
//
// _middleware.js has already checked the Access sign-in before this runs.

import { json } from './_cms.js';
import { writeSettings, SettingsError } from './_settings.js';
import { commitFiles, Refusal, listOf } from './_commit.js';

// Same as pageSlug() in index.html: "Parent-Learning" -> "parent-learning".
const pageSlug = (name) => String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export async function onRequestPost({ request, env }) {
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) {
    return oops('The admin sends its changes as JSON; this request wasn\'t.', 415);
  }
  const site = request.headers.get('Sec-Fetch-Site');
  if (site && site !== 'same-origin' && site !== 'none') {
    return oops('Changes have to come from the admin page itself.', 403);
  }
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return oops('The change arrived garbled. Please try again.', 400);
  }
  try {
    let done;
    if (body && body.action === 'add') done = await commitFiles(env, (state) => add(state, body));
    else if (body && body.action === 'remove') done = await commitFiles(env, (state) => remove(state, body));
    else return oops('The admin asked for something this doesn\'t know how to do.', 400);
    return json({
      ok: true,
      ...done.result,
      settingsSha: done.shas['settings.md'] || null,
      commit: done.commit,
      message: 'Done. The website will show the change in about a minute.',
    });
  } catch (e) {
    if (e instanceof Refusal) return oops(e.message, e.status);
    if (e instanceof SettingsError) return oops(e.message, 400);
    console.error('sections:', e);
    return oops('GitHub couldn\'t be reached to make the change. Nothing was changed. Please try again in a minute.', 502);
  }
}

async function add({ paths, settings, read }, body) {
  const name = String(body.name || '').trim().replace(/\s+/g, ' ');
  if (!name) throw new Refusal('Give the new section a name.');
  if (name.length > 40) throw new Refusal('That name is too long for the menu (the most is 40 letters).');
  if (/["\\<>`]/.test(name)) throw new Refusal('A section\'s name can\'t have " \\ < > or ` in it.');
  const slug = pageSlug(name);
  if (!slug) throw new Refusal('A section\'s name needs at least one letter or number in it.');

  const items = listOf(settings.values.MENU_ITEMS);
  const others = [...items, ...listOf(settings.values.TOP_MENU_EXTRA_ITEMS), ...Object.keys(settings.values.MENU_LINKS || {})];
  const clash = others.find((o) => pageSlug(o) === slug);
  if (clash) throw new Refusal(`There's already a menu option called "${clash}". Choose a different name.`);
  const file = `sections/${slug}.md`;
  const page = `${slug}.html`;
  if (paths.includes(file) || paths.includes(page) || paths.includes(`sections/${slug}/${slug}.md`)) {
    throw new Refusal(`The name "${name}" is already used by a page on the site. Choose a different name.`);
  }

  const now = [...items, name];
  return {
    entries: [
      { path: 'settings.md', text: writeSettings(settings.text, { MENU_ITEMS: now }).text },
      { path: file, text: '' },
      { path: page, text: pageFile(name) },
      ...await backupLinks(read, now),
    ],
    message: `Add the section "${name}" from the admin`,
    result: { name, file },
  };
}

async function remove({ paths, settings, read }, body) {
  const name = String(body.name || '');
  const items = listOf(settings.values.MENU_ITEMS);
  if (!items.includes(name)) throw new Refusal('That section isn\'t in the menu any more. Reload the admin to see the menu as it is now.', 404);
  if ((settings.values.MENU_LINKS || {})[name]) throw new Refusal(`"${name}" opens a page of its own rather than a section, so it can't be deleted here.`);
  if (items.length === 1) throw new Refusal('This is the only section left, so it can\'t be deleted. Add another one first.');

  const slug = pageSlug(name);
  const now = items.filter((i) => i !== name);
  const changes = { MENU_ITEMS: now };
  const contact = listOf(settings.values.CONTACT_PAGES);
  if (contact.some((c) => pageSlug(c) === slug)) changes.CONTACT_PAGES = contact.filter((c) => pageSlug(c) !== slug);

  const entries = [{ path: 'settings.md', text: writeSettings(settings.text, changes).text }];
  for (const path of [`sections/${slug}.md`, `${slug}.html`]) {
    if (paths.includes(path)) entries.push({ path, remove: true });
  }
  entries.push(...await backupLinks(read, now));
  return { entries, message: `Delete the section "${name}" from the admin`, result: { name } };
}

// The page file for a section, as the others are: a copy of cost.html with
// its name in the three places it's written.
function pageFile(name) {
  const h = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<script src="phonepreview.js"></script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="page.css">
</head>
<body data-page="${h}">
  <a class="back" href="index.html">&larr; Back</a>
  <main>
    <h1 id="title">${h}</h1>
    <p class="status" id="status">Under Development</p>
    <div class="contact" id="contact" hidden>
      <a class="phone" id="phone" href="#"></a>
      <a id="venmo-link"><img class="venmo" src="assets/venmo_logo.svg" alt="Venmo"></a>
    </div>
  </main>
  <script src="page.js"></script>
</body>
</html>
`;
}

// index.html's plain list of menu links (shown only if its script can't
// run), rewritten to match the menu. Left alone if it can't be found.
async function backupLinks(read, items) {
  const html = await read('index.html');
  const found = html.match(/(<div id="menu">[\s\S]*?\n)([ \t]*)<nav>\n[\s\S]*?\n[ \t]*<\/nav>/);
  if (!found) return [];
  const [whole, before, indent] = found;
  const links = items.map((i) => `${indent}  <a href="${pageSlug(i)}.html">${i.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</a>`).join('\n');
  const next = html.replace(whole, `${before}${indent}<nav>\n${links}\n${indent}</nav>`);
  return next === html ? [] : [{ path: 'index.html', text: next }];
}

function oops(error, status) {
  return json({ error }, status);
}
