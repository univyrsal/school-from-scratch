// Changes several files in one commit on main, for the admin functions that
// need to (photos.js, sections.js, and save.js when pictures come with a
// page's words). Also the checks they share for names and pictures.
//
// Like _cms.js, this has no onRequest in it, so it isn't an address on the
// site.

import { github, listFiles, readFile, BRANCH } from './_cms.js';
import { readSettings } from './_settings.js';

// A plain-words refusal, sent back to the admin as it is.
export class Refusal extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// build({ paths, settings, read }) works out the change from main as it is
// now and returns { entries, message, result }:
//   entries: [{ path, text } | { path, content: Uint8Array } | { path, remove: true }]
//   paths:    every file on main
//   settings: { text, values } for settings.md
//   read(path): a file's text on main
// It's committed on top of main. If someone else's commit lands in between,
// main has moved on and GitHub refuses to move it back (422), so build runs
// again from the new main.
//
// Returns { result, shas, commit }: shas is each written file's new version.
export async function commitFiles(env, build) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const head = await got(github(env, `git/ref/heads/${BRANCH}`), 'find the latest version');
    const parent = head.object.sha;
    const commit = await got(github(env, `git/commits/${parent}`), 'read the latest version');
    const paths = (await listFiles(env)).map((f) => f.path);
    const read = async (path) => (await readFile(env, path)).text.replace(/\r\n?/g, '\n');
    const text = await read('settings.md');
    const settings = { text, values: Object.fromEntries(readSettings(text).map((s) => [s.name, s.value])) };

    const { entries, message, result } = await build({ paths, settings, read });

    const tree = [];
    const shas = {};
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
      shas[entry.path] = blob.sha;
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
    return { result, shas, commit: newCommit.html_url };
  }
  throw new Refusal('Other changes kept arriving at the same moment, so this one was stopped. Nothing was changed. Please try again.', 409);
}

async function got(promise, what) {
  const res = await promise;
  if (!res.ok) throw new Error(`${what} (status ${res.status})`);
  return res.json();
}

// ---- Names, folders and pictures ------------------------------------------------

// "IMG 2041 (1).JPG" -> "img_2041_1.jpg". Kept to letters, numbers and
// underscores, like the files already there, with the ending the picture
// really has. Must match cleanName() in admin.js.
export function cleanName(name, type) {
  const base = String(name || '').replace(/\.[^.]*$/, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'photo';
  return `${base}.${type}`;
}

// The name, or the name with _2, _3, ... if it's taken, so a new file never
// replaces an old one.
export function freeName(name, taken) {
  if (!taken(name)) return name;
  const [, base, ext] = name.match(/^(.*)\.([^.]+)$/);
  for (let n = 2; ; n++) if (!taken(`${base}_${n}.${ext}`)) return `${base}_${n}.${ext}`;
}

// A folder named in the settings ("assets/"), checked and ending in /.
export function folderOf(value, fallback) {
  const folder = typeof value === 'string' ? value.trim() : fallback;
  if (!folder) return '';
  if (!/^[a-z0-9_\-/]+$/i.test(folder) || folder.includes('..') || folder.startsWith('/')) {
    throw new Refusal('The photo folder in the settings isn\'t a folder name the admin can use.');
  }
  return folder.endsWith('/') ? folder : folder + '/';
}

export function listOf(value) {
  return Array.isArray(value) ? value.map(String) : [];
}

// base64 from the admin -> bytes, refusing anything over `most` bytes.
export function bytesOf(b64, what, most) {
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

export function base64Of(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

// What a picture really is, from its first bytes (not from its name).
export function imageType(b) {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b.length > 12 && String.fromCharCode(...b.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...b.subarray(8, 12)) === 'WEBP') return 'webp';
  return null;
}
