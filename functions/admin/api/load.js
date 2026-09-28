// Gives the admin page every file it can edit, straight from GitHub's main
// branch (not from the live site, which can be a minute behind after a save).
//
//   GET /admin/api/load  ->  { files: [{ path, sha, text }, ...] }
//
// Each file comes with its sha, GitHub's name for that exact version. The
// admin sends it back when saving, so a save can't quietly overwrite a change
// someone else made in the meantime.
//
// _middleware.js has already checked the Access sign-in before this runs.

import { listEditable, readFile, json } from './_cms.js';

export async function onRequestGet({ env }) {
  try {
    const list = await listEditable(env);
    const files = await Promise.all(list.map(item => readFile(env, item.path)));
    return json({ files });
  } catch (e) {
    return json({ error: 'The files could not be loaded from GitHub. Please try again in a minute. ' + e.message }, 502);
  }
}
