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

import { github, listFiles, readFile, isEditable, json, BRANCH } from './_cms.js';
import { readSettings, writeSettings, SettingsError } from './_settings.js';

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

  return commitWithRetry(env, async ({ paths, settings }) => {
    const folder = folderOf(settings.values.PHOTO_FOLDER, 'assets/');
    const smallFolder = folderOf(settings.values.PHOTO_SMALL_FOLDER, '');
    const photos = listOf(settings.values.PHOTOS);
    const file = freeName(cleanName(body.name, type), folder, paths, photos);
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
  });
}

// ---- Removing -----------------------------------------------------------------

async function remove(env, body) {
  const file = String(body.file || '');
  return commitWithRetry(env, async ({ paths, settings }) => {
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
        if ((await readFile(env, path)).text.includes(file)) { usedBy = path; break; }
      }
    }
    const entries = [{ path: 'settings.md', text }];
    if (!usedBy && paths.includes(folder + file)) entries.push({ path: folder + file, remove: true });
    return {
      entries,
      message: `Remove a photo from the admin: ${file}`,
      result: { photos: now, kept: !!usedBy, usedBy },
    };
  });
}

// ---- One commit with several files ---------------------------------------------

// Builds the change from main as it is now and commits it on top. If someone
// else's commit lands in between, main has moved on and GitHub refuses to
// move it back (422), so the change is worked out again from the new main.
async function commitWithRetry(env, build) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const head = await got(github(env, `git/ref/heads/${BRANCH}`), 'find the latest version');
    const parent = head.object.sha;
    const commit = await got(github(env, `git/commits/${parent}`), 'read the latest version');
    const paths = (await listFiles(env)).map((f) => f.path);
    const file = await readFile(env, 'settings.md');
    const text = file.text.replace(/\r\n?/g, '\n');
    const settings = { text, values: Object.fromEntries(readSettings(text).map((s) => [s.name, s.value])) };

    const { entries, message, result } = await build({ paths, settings });

    const tree = [];
    let settingsBlob = null;
    for (const entry of entries) {
      if (entry.remove) {
        tree.push({ path: entry.path, mode: '100644', type: 'blob', sha: null });
        continue;
      }
      const blob = await got(github(env, 'git/blobs', {
        method: 'POST',
        body: JSON.stringify(entry.content
          ? { content: base64Of(entry.content), encoding: 'base64' }
          : { content: entry.text, encoding: 'utf-8' }),
      }), 'store the file');
      if (entry.path === 'settings.md') settingsBlob = blob.sha;
      tree.push({ path: entry.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const newTree = await got(github(env, 'git/trees', {
      method: 'POST',
      body: JSON.stringify({ base_tree: commit.tree.sha, tree }),
    }), 'put the files together');
    const newCommit = await got(github(env, 'git/commits', {
      method: 'POST',
      body: JSON.stringify({ message, tree: newTree.sha, parents: [parent] }),
    }), 'make the commit');
    const moved = await github(env, `git/refs/heads/${BRANCH}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: newCommit.sha, force: false }),
    });
    if (moved.status === 422 || moved.status === 409) continue; // main moved on: try again
    if (!moved.ok) throw new Error(`move main (status ${moved.status})`);
    return json({
      ok: true,
      ...result,
      settingsSha: settingsBlob,
      commit: newCommit.html_url,
      message: 'Done. The website will show the change in about a minute.',
    });
  }
  throw new Refusal('Other changes kept arriving at the same moment, so this one was stopped. Nothing was changed. Please try again.', 409);
}

async function got(promise, what) {
  const res = await promise;
  if (!res.ok) throw new Error(`${what} (status ${res.status})`);
  return res.json();
}

// ---- Names and files ------------------------------------------------------------

// "IMG 2041 (1).JPG" -> "img_2041_1.jpg". Kept to letters, numbers and
// underscores, like the photos already there, with the ending the photo
// really has.
function cleanName(name, type) {
  const base = String(name || '').replace(/\.[^.]*$/, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'photo';
  return `${base}.${type}`;
}

// The name, or the name with _2, _3, ... if a file of that name exists (or
// is already listed), so a new photo never replaces an old one.
function freeName(name, folder, paths, photos) {
  const taken = (n) => paths.includes(folder + n) || photos.includes(n);
  if (!taken(name)) return name;
  const [, base, ext] = name.match(/^(.*)\.([^.]+)$/);
  for (let n = 2; ; n++) if (!taken(`${base}_${n}.${ext}`)) return `${base}_${n}.${ext}`;
}

function folderOf(value, fallback) {
  const folder = typeof value === 'string' ? value.trim() : fallback;
  if (!folder) return '';
  if (!/^[a-z0-9_\-/]+$/i.test(folder) || folder.includes('..') || folder.startsWith('/')) {
    throw new Refusal('The photo folder in the settings isn\'t a folder name the admin can use.');
  }
  return folder.endsWith('/') ? folder : folder + '/';
}

function listOf(value) {
  return Array.isArray(value) ? value.map(String) : [];
}

function bytesOf(b64, what, most) {
  if (typeof b64 !== 'string' || !b64) throw new Refusal(`The ${what} is missing. Please try again.`);
  let binary;
  try {
    binary = atob(b64.replace(/^data:[^,]*,/, '').replace(/\s/g, ''));
  } catch (e) {
    throw new Refusal(`The ${what} arrived garbled. Please try again.`);
  }
  if (binary.length > most) {
    throw new Refusal(`That ${what} is too big (${(binary.length / 1048576).toFixed(1)} MB; the most is ${most / 1048576} MB).`, 413);
  }
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function base64Of(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

// What a photo really is, from its first bytes (not from its name).
function imageType(b) {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b.length > 12 && String.fromCharCode(...b.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...b.subarray(8, 12)) === 'WEBP') return 'webp';
  return null;
}

class Refusal extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function oops(error, status) {
  return json({ error }, status);
}
