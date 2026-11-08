// Saves one edited file from the admin page to GitHub, as one commit on main.
// The push then publishes the site as usual, so a save is live in about a
// minute.
//
//   POST /admin/api/save   (JSON only)
//   { "path": "sections/people.md", "sha": "<the version the admin loaded>",
//     "text": "<the whole new text>" }
//
//   { "path": "settings.md", "sha": "...",
//     "changes": { "ACCENT_COLOR": "#2f5d3a", "PHONE_NUMBER": "..." } }
//
//   -> { ok: true, sha: "<the new version>", commit: "<link to the commit>" }
//   -> { error: "<what went wrong, in plain words>" } with a 4xx/5xx status
//
// Only files the admin may edit are accepted (see isEditable in _cms.js), and
// only files that already exist. The sha must be the version currently on
// main: if someone changed the file after the admin loaded it, the save is
// refused rather than overwriting their change.
//
// Settings are sent as just the changed values, not the whole file.
// _settings.js checks each one and writes it into settings.md in place, so
// the notes around them are never touched.
//
// _middleware.js has already checked the Access sign-in before this runs.

import { isEditable, github, readFile, listFiles, toBase64Utf8, json, BRANCH } from './_cms.js';
import { readSettings, writeSettings, SettingsError } from './_settings.js';
import { checkLinks } from './_links.js';
import { commitFiles, Refusal, cleanName, freeName, folderOf, bytesOf, imageType } from './_commit.js';

const MOST_CHARACTERS = 200000;

export async function onRequestPost({ request, env }) {
  // JSON only. Besides keeping things simple, this stops another website
  // from posting a plain form here using a signed-in editor's browser.
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) {
    return oops('The admin sends its saves as JSON; this request wasn\'t.', 415);
  }
  const site = request.headers.get('Sec-Fetch-Site');
  if (site && site !== 'same-origin' && site !== 'none') {
    return oops('Saves have to come from the admin page itself.', 403);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return oops('The save arrived garbled. Please try again.', 400);
  }
  const { path, sha } = body || {};
  let { text } = body || {};

  if (typeof path !== 'string' || !isEditable(path)) {
    return oops('That file can\'t be edited from the admin.', 403);
  }
  if (typeof sha !== 'string' || !/^[0-9a-f]{40}$/.test(sha)) {
    return oops('The save is missing which version of the page it started from. Please reload the admin and try again.', 400);
  }
  const isSettings = path === 'settings.md';
  if (!isSettings) {
    if (typeof text !== 'string') {
      return oops('The save is missing the new text.', 400);
    }
    text = text.replace(/\r\n?/g, '\n');
    if (text.length > MOST_CHARACTERS) {
      return oops(`That's too long to save (${text.length.toLocaleString()} characters; the most is ${MOST_CHARACTERS.toLocaleString()}).`, 413);
    }
  }

  // What's on main right now. This also makes sure the file exists, so a
  // save can only change a page, never add one.
  let current;
  try {
    current = await readFile(env, path);
  } catch (e) {
    if (e.status === 404) return oops('That page doesn\'t exist any more. Please reload the admin.', 404);
    return oops('GitHub couldn\'t be reached to save this. Please try again in a minute.', 502);
  }
  if (current.sha !== sha) return changedMeanwhile();

  let message = `Edit ${path} from the admin`;
  if (isSettings) {
    try {
      const done = writeSettings(current.text.replace(/\r\n?/g, '\n'), body.changes);
      text = done.text;

      // Settings that name files (menu pages, photos, embeds) must still
      // point at files that exist.
      const values = Object.fromEntries(readSettings(text).map(e => [e.name, e.value]));
      const problems = checkLinks(values, done.changed, (await listFiles(env)).map(f => f.path));
      if (problems.length) return oops(problems.join('\n') + '\nNothing was saved.', 400);

      message = 'Edit settings from the admin: ' + (done.changed.length > 6
        ? done.changed.slice(0, 5).join(', ') + ` and ${done.changed.length - 5} more`
        : done.changed.join(', '));
    } catch (e) {
      if (e instanceof SettingsError) return oops(e.message, 400);
      if (e.status) return oops('GitHub couldn\'t be reached to save this. Please try again in a minute.', 502);
      console.error('save: settings writer failed', e);
      return oops('Something went wrong putting your changes into the settings. Nothing was saved.', 500);
    }
  }
  // Pictures added to the words come along with them, and go in the same
  // commit (see savePictures below).
  if (!isSettings && Array.isArray(body.pictures) && body.pictures.length) {
    return savePictures(env, path, sha, text, body.pictures);
  }
  if (current.text === text) return oops('Nothing has changed, so there was nothing to save.', 400);

  // The loaded sha goes to GitHub too, so if someone saves in the moment
  // between the check above and this write, GitHub refuses it (409).
  const res = await github(env, `contents/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: toBase64Utf8(text),
      sha,
      branch: BRANCH,
    }),
  });
  if (res.status === 409 || res.status === 422) return changedMeanwhile();
  if (!res.ok) {
    console.error('save: GitHub PUT failed', res.status, await res.text());
    return oops('GitHub wouldn\'t take the save. Nothing was changed. Please try again in a minute.', 502);
  }
  const done = await res.json();
  return json({
    ok: true,
    sha: done.content.sha,
    commit: done.commit.html_url,
    message: 'Saved. The website will show the change in about a minute.',
  });
}

// A page's words with pictures added to them:
//   "pictures": [{ "name": "garden_day.jpg", "data": "<the picture, base64>" }]
// Each picture goes into PHOTO_FOLDER (assets/), and the words, which already
// show it as ![...](assets/garden_day.jpg), are saved with it in one commit.
// A name that's taken by then gets a number added, and the words are changed
// to match; the words that were saved come back as "text".
const MOST_PICTURE_BYTES = 10 * 1024 * 1024;
const MOST_PICTURES = 12;

async function savePictures(env, path, sha, text, pictures) {
  if (pictures.length > MOST_PICTURES) return oops(`That's too many new pictures to save at once (the most is ${MOST_PICTURES}).`, 413);
  try {
    const done = await commitFiles(env, async ({ paths, settings, read }) => {
      const current = await read(path);
      const now = (await listFiles(env)).find((f) => f.path === path);
      if (!now) throw new Refusal('That page doesn\'t exist any more. Please reload the admin.', 404);
      if (now.sha !== sha) throw new Refusal(CHANGED_MEANWHILE, 409);
      const folder = folderOf(settings.values.PHOTO_FOLDER, 'assets/');
      let words = text;
      const entries = [];
      const used = new Set();
      for (const picture of pictures) {
        const asked = String((picture && picture.name) || '');
        const bytes = bytesOf(picture && picture.data, 'picture', MOST_PICTURE_BYTES);
        const type = imageType(bytes);
        if (!type) throw new Refusal(`"${asked}" isn't a picture the website can show. Use a JPEG, PNG or WebP picture.`);
        const name = freeName(cleanName(asked, type), (n) => paths.includes(folder + n) || used.has(n));
        used.add(name);
        if (name !== asked) words = words.split(`(${folder}${asked})`).join(`(${folder}${name})`);
        entries.push({ path: folder + name, content: bytes });
      }
      if (words === current && !entries.length) throw new Refusal('Nothing has changed, so there was nothing to save.');
      entries.push({ path, text: words });
      return {
        entries,
        message: `Edit ${path} from the admin, with ${entries.length - 1} new picture${entries.length === 2 ? '' : 's'}`,
        result: { text: words },
      };
    });
    return json({
      ok: true,
      sha: done.shas[path],
      text: done.result.text,
      commit: done.commit,
      message: 'Saved. The website will show the change in about a minute.',
    });
  } catch (e) {
    if (e instanceof Refusal) return oops(e.message, e.status);
    console.error('save: pictures', e);
    return oops('GitHub wouldn\'t take the save. Nothing was changed. Please try again in a minute.', 502);
  }
}

const CHANGED_MEANWHILE = 'Someone else changed this page since you opened it, so your save was stopped to keep their change. Copy your text somewhere safe, reload the admin to see their version, and add your changes again.';

function changedMeanwhile() {
  return oops('Someone else changed this page since you opened it, so your save was stopped to keep their change. Copy your text somewhere safe, reload the admin to see their version, and add your changes again.', 409);
}

function oops(error, status) {
  return json({ error }, status);
}
