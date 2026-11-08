// Adds a photo to the home page's gallery, or takes one away, from the admin.
// Each is one commit on main, so the website shows it in about a minute.
//
//   POST /admin/api/photos   (JSON only)
//
//   { "action": "add", "name": "children_in_the_garden.jpg",
//     "photo": "<the photo, base64>", "small": "<a small copy, base64 JPEG>" }
//   -> { ok: true, file: "children_in_the_garden.jpg", photos: [...], settingsSha }
//
//   { "action": "remove", "file": "children_in_the_garden.jpg" }
//   -> { ok: true, photos: [...], settingsSha, kept: true|false }
//
// Adding puts three things into one commit: the photo in PHOTO_FOLDER, the
// small copy the gallery loads in PHOTO_SMALL_FOLDER (the admin makes it in
// the browser, so the photo shows at its small size straight away), and the
// photo's name on the end of PHOTOS in settings.md. A name already taken
// gets a number added, so nothing is ever replaced.
//
// Removing takes the name out of PHOTOS and deletes the photo itself, unless
// something else on the site still uses it (a section's words, another
// setting), in which case it only leaves the gallery. Its small copy is
// tidied away by the small-photos GitHub Action, as for any unlisted photo.
//
// settings.md is changed in place by _settings.js, so every other setting and
// note stays exactly as it was. settingsSha is the new version of
// settings.md, for the admin's next settings save.
//
// _middleware.js has already checked the Access sign-in before this runs.

import { isEditable, json } from './_cms.js';
import { readSettings, writeSettings, SettingsError } from './_settings.js';
import { commitFiles, Refusal, cleanName, freeName, folderOf, listOf, bytesOf, imageType } from './_commit.js';

// The largest photo taken, before base64 (a camera photo is 2-10 MB).
const MOST_BYTES = 20 * 1024 * 1024;
const MOST_SMALL_BYTES = 2 * 1024 * 1024;

export async function onRequestPost({ request, env }) {
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) {
    return oops('The admin sends photos as JSON; this request wasn\'t.', 415);
  }
  const site = request.headers.get('Sec-Fetch-Site');
  if (site && site !== 'same-origin' && site !== 'none') {
    return oops('Photos have to come from the admin page itself.', 403);
  }
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return oops('The photo arrived garbled. Please try again.', 400);
  }

  try {
    if (body && body.action === 'add') return await add(env, body);
    if (body && body.action === 'remove') return await remove(env, body);
    return oops('The admin asked for something this doesn\'t know how to do.', 400);
  } catch (e) {
    if (e instanceof Refusal) return oops(e.message, e.status);
    if (e instanceof SettingsError) return oops(e.message, 400);
    console.error('photos:', e);
    return oops('GitHub couldn\'t be reached to make the change. Nothing was changed. Please try again in a minute.', 502);
  }
}

// ---- Adding -------------------------------------------------------------------

async function add(env, body) {
  const photo = bytesOf(body.photo, 'photo', MOST_BYTES);
  const small = bytesOf(body.small, 'small copy', MOST_SMALL_BYTES);
  const type = imageType(photo);
  if (!type) throw new Refusal('That file isn\'t a photo the website can show. Use a JPEG, PNG or WebP photo (an iPhone photo can be saved as JPEG first).');
  if (imageType(small) !== 'jpg') throw new Refusal('The small copy didn\'t come through as a JPEG. Please try again.');

  return reply(await commitFiles(env, async ({ paths, settings }) => {
    const folder = folderOf(settings.values.PHOTO_FOLDER, 'assets/');
    const smallFolder = folderOf(settings.values.PHOTO_SMALL_FOLDER, '');
    const photos = listOf(settings.values.PHOTOS);
    const file = freeName(cleanName(body.name, type), (n) => paths.includes(folder + n) || photos.includes(n));
    const now = [...photos, file];
    const entries = [
      { path: folder + file, content: photo },
      { path: 'settings.md', text: writeSettings(settings.text, { PHOTOS: now }).text },
    ];
    if (smallFolder) entries.push({ path: smallFolder + file.replace(/\.[^.]+$/, '.jpg'), content: small });
    return {
      entries,
      message: `Add a photo from the admin: ${file}`,
      result: { file, photos: now },
    };
  }));
}

// ---- Removing -----------------------------------------------------------------

async function remove(env, body) {
  const file = String(body.file || '');
  return reply(await commitFiles(env, async ({ paths, settings, read }) => {
    const photos = listOf(settings.values.PHOTOS);
    if (!photos.includes(file)) throw new Refusal('That photo isn\'t in the gallery any more. Reload the admin to see the gallery as it is now.', 404);
    const folder = folderOf(settings.values.PHOTO_FOLDER, 'assets/');
    const now = photos.filter((p) => p !== file);
    const text = writeSettings(settings.text, { PHOTOS: now }).text;

    // Still used somewhere else? Then it stays, and only leaves the gallery.
    // Looked for in every setting and every section's words.
    const others = readSettings(text).filter((s) => s.name !== 'PHOTOS').map((s) => JSON.stringify(s.value)).join('\n');
    let usedBy = others.includes(file) ? 'the settings' : '';
    if (!usedBy) {
      for (const path of paths.filter((p) => p !== 'settings.md' && isEditable(p))) {
        if ((await read(path)).includes(file)) { usedBy = path; break; }
      }
    }
    const entries = [{ path: 'settings.md', text }];
    if (!usedBy && paths.includes(folder + file)) entries.push({ path: folder + file, remove: true });
    return {
      entries,
      message: `Remove a photo from the admin: ${file}`,
      result: { photos: now, kept: !!usedBy, usedBy },
    };
  }));
}

// The answer to the admin: what changed, and settings.md's new version for
// its next settings save.
function reply({ result, shas, commit }) {
  return json({
    ok: true,
    ...result,
    settingsSha: shas['settings.md'] || null,
    commit,
    message: 'Done. The website will show the change in about a minute.',
  });
}

function oops(error, status) {
  return json({ error }, status);
}
