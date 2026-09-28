// What the admin is allowed to touch, and how it talks to GitHub. Shared by
// load.js and save.js.
//
// This file has no onRequest in it, so Cloudflare doesn't make it an address
// on the site; the admin functions just borrow from it.
//
// The GitHub key is CMS_GITHUB_TOKEN, set in the Cloudflare dashboard under
// the project's Settings -> Variables and Secrets. It never leaves Cloudflare.

export const OWNER = 'univyrsal';
export const REPO = 'school-from-scratch';
export const BRANCH = 'main';

// The files the admin can edit: settings.md, and the Markdown text of every
// section (sections/people.md, sections/contact/contact.md, ...). Folders
// starting with a dot (like the notes app's .obsidian) never match. Only
// files that already exist are offered, so the admin can edit but not add.
const SECTION_FILE = /^sections\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.md$/i;

export function isEditable(path) {
  return path === 'settings.md' || SECTION_FILE.test(path);
}

// A call to the GitHub API. Returns the Response; callers check .ok.
export function github(env, apiPath, init = {}) {
  return fetch(`https://api.github.com/repos/${OWNER}/${REPO}/${apiPath}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${env.CMS_GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'school-from-scratch-admin',
      ...(init.headers || {}),
    },
  });
}

// Every file on main right now: [{ path, sha }].
export async function listFiles(env) {
  const res = await github(env, `git/trees/${BRANCH}?recursive=1`);
  if (!res.ok) throw new GitHubError('list the files', res);
  const tree = await res.json();
  return tree.tree.filter(item => item.type === 'blob').map(item => ({ path: item.path, sha: item.sha }));
}

// Every editable file on main right now: [{ path, sha }], settings.md first,
// then the sections in alphabetical order.
export async function listEditable(env) {
  return (await listFiles(env))
    .filter(item => isEditable(item.path))
    .map(item => ({ path: item.path, sha: item.sha }))
    .sort((a, b) => (a.path === 'settings.md' ? -1 : b.path === 'settings.md' ? 1 : a.path.localeCompare(b.path)));
}

// One file from main: { path, sha, text }.
export async function readFile(env, path) {
  const res = await github(env, `contents/${encodePath(path)}?ref=${BRANCH}`);
  if (!res.ok) throw new GitHubError(`read ${path}`, res);
  const file = await res.json();
  return { path: file.path, sha: file.sha, text: fromBase64Utf8(file.content) };
}

// Text <-> base64 that survives any character (em dashes, accents, emoji).
// Plain btoa()/atob() only handle Latin-1 and would break or garble these.
export function toBase64Utf8(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function fromBase64Utf8(b64) {
  const binary = atob(String(b64).replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
}

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

// A GitHub failure, with the status kept so callers can explain it plainly.
export class GitHubError extends Error {
  constructor(what, res) {
    super(`GitHub wouldn't let us ${what} (status ${res.status}).`);
    this.status = res.status;
  }
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
