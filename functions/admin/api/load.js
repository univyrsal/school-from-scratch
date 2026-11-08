// Gives the admin page every file it can edit, straight from GitHub's main
// branch (not from the live site, which can be a minute behind after a save).
//
//   GET /admin/api/load  ->  { files: [{ path, sha, text }, ...] }
//
// settings.md also comes with its settings read out, for the form:
//   settings: [{ name, kind, value, heading, notes }, ...]   (see _settings.js)
//
// Each file comes with its sha, GitHub's name for that exact version. The
// admin sends it back when saving, so a save can't quietly overwrite a change
// someone else made in the meantime.
//
// _middleware.js has already checked the Access sign-in before this runs.

import { listFiles, isEditable, readFile, json } from './_cms.js';
import { readSettings } from './_settings.js';

// paths: every file on the site, so the admin can name a new picture without
// taking a name that's already used.
export async function onRequestGet({ env }) {
  try {
    const all = await listFiles(env);
    const list = all.filter(item => isEditable(item.path))
      .sort((a, b) => (a.path === 'settings.md' ? -1 : b.path === 'settings.md' ? 1 : a.path.localeCompare(b.path)));
    const files = await Promise.all(list.map(item => readFile(env, item.path)));
    const settings = files.find(f => f.path === 'settings.md');
    if (settings) {
      settings.settings = readSettings(settings.text.replace(/\r\n?/g, '\n'))
        .map(({ name, kind, value, heading, notes }) => ({ name, kind, value, heading, notes }));
    }
    return json({ files, paths: all.map(item => item.path) });
  } catch (e) {
    return json({ error: 'The files could not be loaded from GitHub. Please try again in a minute. ' + e.message }, 502);
  }
}
