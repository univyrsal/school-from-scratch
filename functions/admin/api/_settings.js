// Reads the settings out of settings.md and writes changed ones back in, for
// the admin. Shared by load.js and save.js.
//
// The website runs each grey code block in settings.md as JavaScript. The
// admin can't do that (Cloudflare doesn't allow running code that arrives as
// text), so this reads the values instead: words in quotes, numbers, true or
// false, `random`, and lists and groups of those in [ ] and { }.
//
// Saving changes only the value after `NAME = ` for the settings that were
// changed. Every note, heading and untouched setting stays exactly as it was,
// down to the spaces. Afterwards the whole file is read back to make sure
// nothing else moved; if anything did, the save is refused.
//
// Each setting gets a kind, worked out from the value it has now, and a new
// value has to be the same kind:
//
//   toggle    true or false
//   number    a plain number
//   seed      a number, or random            (the *_SEED settings)
//   color     "#rrggbb" (or #rgb / #rrggbbaa)
//   text      words on one line, in "quotes"
//   longtext  words that can run over several lines, in `backticks`
//   list      a list of words: [ "a", "b" ]
//   data      anything else in [ ] or { }, edited as JSON
//   unreadable  a value this file doesn't understand; shown but can't be saved

const RANDOM = Symbol('random');
const COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const ENTRY = /^([A-Z][A-Z0-9_]*) = /gm;

// ---- Reading -----------------------------------------------------------------

// [{ name, kind, value, heading, notes, start, end }], in file order.
// value is plain JSON (random becomes the word "random"). start/end are where
// the value's text sits in the file. heading is the nearest "## " heading
// above; notes is the text between the previous code block and this one,
// given to the first setting of each block.
export function readSettings(text) {
  const entries = [];
  const blocks = /^```[^\n]*\n([\s\S]*?)^```/gm;
  let block, lastEnd = 0;
  while ((block = blocks.exec(text))) {
    const codeStart = block.index + block[0].indexOf('\n') + 1;
    const code = block[1];
    const before = text.slice(lastEnd, block.index);
    const headings = [...text.slice(0, block.index).matchAll(/^## +(.+)$/gm)];
    const heading = headings.length ? headings[headings.length - 1][1].trim() : '';
    let first = true;

    // A line inside a value (say, wording in backticks that happens to read
    // "NOTE = ...") isn't a new setting, so each search starts after the
    // value before it.
    const next = from => { ENTRY.lastIndex = from; return ENTRY.exec(code); };
    let m = next(0);
    while (m) {
      const valueStart = m.index + m[0].length;
      const entry = { name: m[1], heading, notes: first ? before.trim() : '' };
      first = false;
      let following;
      try {
        const p = new Parser(code, valueStart);
        const value = p.value();
        following = next(p.pos);
        const nextStart = following ? following.index : code.length;
        if (code.slice(p.pos, nextStart).trim() !== '') throw new Error('extra text after the value');
        entry.start = codeStart + valueStart;
        entry.end = codeStart + p.pos;
        entry.kind = kindOf(m[1], value);
        entry.value = toJson(value);
      } catch (e) {
        following = next(valueStart);
        const nextStart = following ? following.index : code.length;
        entry.start = codeStart + valueStart;
        entry.end = codeStart + code.slice(0, nextStart).trimEnd().length;
        entry.kind = 'unreadable';
        entry.value = text.slice(entry.start, entry.end);
      }
      entries.push(entry);
      m = following;
    }
    lastEnd = block.index + block[0].length;
  }
  return entries;
}

function kindOf(name, v) {
  if (v === RANDOM || /_SEED$/.test(name) && typeof v === 'number') return 'seed';
  if (typeof v === 'boolean') return 'toggle';
  if (typeof v === 'number') return 'number';
  if (v instanceof Template) return 'longtext';
  if (typeof v === 'string') return COLOR.test(v) ? 'color' : 'text';
  if (Array.isArray(v) && v.every(x => typeof x === 'string')) return 'list';
  return 'data';
}

function toJson(v) {
  if (v === RANDOM) return 'random';
  if (v instanceof Template) return v.text;
  if (Array.isArray(v)) return v.map(toJson);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toJson(x)]));
  return v;
}

class Template { constructor(text) { this.text = text; } }

// Just enough of JavaScript's way of writing values for settings.md.
class Parser {
  constructor(src, pos) { this.src = src; this.pos = pos; }

  fail(what) { throw new Error(what + ' at ' + this.pos); }
  space() { while (/\s/.test(this.src[this.pos] || '')) this.pos++; }

  value() {
    this.space();
    const c = this.src[this.pos];
    if (c === '"' || c === "'") return this.quoted(c);
    if (c === '`') return this.template();
    if (c === '[') return this.array();
    if (c === '{') return this.object();
    const num = /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i.exec(this.src.slice(this.pos));
    if (num) { this.pos += num[0].length; return Number(num[0]); }
    const word = /^[A-Za-z_$][\w$]*/.exec(this.src.slice(this.pos));
    if (word) {
      this.pos += word[0].length;
      if (word[0] === 'true') return true;
      if (word[0] === 'false') return false;
      if (word[0] === 'null') return null;
      if (word[0] === 'random') return RANDOM;
    }
    this.fail('unexpected value');
  }

  quoted(q) {
    let out = '';
    this.pos++;
    for (;;) {
      const c = this.src[this.pos++];
      if (c === undefined || c === '\n') this.fail('unfinished words in quotes');
      if (c === q) return out;
      out += c === '\\' ? this.escape() : c;
    }
  }

  template() {
    let out = '';
    this.pos++;
    for (;;) {
      const c = this.src[this.pos++];
      if (c === undefined) this.fail('unfinished words in backticks');
      if (c === '`') return new Template(out);
      if (c === '$' && this.src[this.pos] === '{') this.fail('${ in backticks');
      out += c === '\\' ? this.escape() : c;
    }
  }

  escape() {
    const c = this.src[this.pos++];
    const simple = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0', '\n': '' };
    if (c in simple) return simple[c];
    if (c === 'u') {
      const hex = /^[0-9a-f]{4}/i.exec(this.src.slice(this.pos));
      if (!hex) this.fail('bad \\u');
      this.pos += 4;
      return String.fromCharCode(parseInt(hex[0], 16));
    }
    if (c === 'x') {
      const hex = /^[0-9a-f]{2}/i.exec(this.src.slice(this.pos));
      if (!hex) this.fail('bad \\x');
      this.pos += 2;
      return String.fromCharCode(parseInt(hex[0], 16));
    }
    return c;
  }

  array() {
    const out = [];
    this.pos++;
    for (;;) {
      this.space();
      if (this.src[this.pos] === ']') { this.pos++; return out; }
      out.push(this.value());
      this.space();
      if (this.src[this.pos] === ',') this.pos++;
      else if (this.src[this.pos] !== ']') this.fail('expected , or ]');
    }
  }

  object() {
    const out = {};
    this.pos++;
    for (;;) {
      this.space();
      const c = this.src[this.pos];
      if (c === '}') { this.pos++; return out; }
      let key;
      if (c === '"' || c === "'") key = this.quoted(c);
      else {
        const word = /^[A-Za-z_$][\w$]*/.exec(this.src.slice(this.pos));
        if (!word) this.fail('expected a name');
        key = word[0];
        this.pos += key.length;
      }
      this.space();
      if (this.src[this.pos++] !== ':') this.fail('expected :');
      out[key] = this.value();
      this.space();
      if (this.src[this.pos] === ',') this.pos++;
      else if (this.src[this.pos] !== '}') this.fail('expected , or }');
    }
  }
}

// ---- Writing -----------------------------------------------------------------

// A problem with one of the new values, worded for the person who typed it.
export class SettingsError extends Error {}

// Returns { text, changed: [names] } with each changed setting's value
// rewritten, or throws a SettingsError saying what's wrong.
export function writeSettings(text, changes) {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
    throw new SettingsError('The save is missing the changed settings.');
  }
  const entries = readSettings(text);
  const byName = new Map(entries.map(e => [e.name, e]));

  const edits = [];
  for (const [name, value] of Object.entries(changes)) {
    const entry = byName.get(name);
    if (!entry) throw new SettingsError(`There's no setting called ${name}.`);
    if (entry.kind === 'unreadable') throw new SettingsError(`${name} is written in a way the admin can't edit. Ask Maxwell to change it in settings.md.`);
    const raw = writeValue(entry, value);
    if (sameJson(entry.value, readBack(raw))) continue; // not really changed
    edits.push({ entry, raw, value: readBack(raw) });
  }
  if (!edits.length) throw new SettingsError('Nothing has changed, so there was nothing to save.');

  // Splice from the end so earlier positions stay right.
  let out = text;
  for (const { entry, raw } of [...edits].sort((a, b) => b.entry.start - a.entry.start)) {
    out = out.slice(0, entry.start) + raw + out.slice(entry.end);
  }

  // Read the new file back: the same settings in the same order, the changed
  // ones saying what was asked for, and every other one untouched.
  const after = readSettings(out);
  const changedNames = new Set(edits.map(e => e.entry.name));
  const ok = after.length === entries.length && after.every((e, i) => {
    const was = entries[i];
    if (e.name !== was.name) return false;
    if (!changedNames.has(e.name)) return out.slice(e.start, e.end) === text.slice(was.start, was.end);
    const edit = edits.find(x => x.entry.name === e.name);
    return sameJson(e.value, edit.value);
  });
  if (!ok) throw new SettingsError('The settings file came out wrong when your changes were put in, so nothing was saved. Please tell Maxwell which settings you changed.');

  return { text: out, changed: edits.map(e => e.entry.name) };
}

function readBack(raw) {
  return toJson(new Parser(raw, 0).value());
}

// The text to put after `NAME = `, or a SettingsError.
function writeValue(entry, v) {
  const { name, kind } = entry;
  switch (kind) {
    case 'toggle':
      if (typeof v !== 'boolean') throw new SettingsError(`${name} has to be on or off.`);
      return String(v);
    case 'seed':
      if (v === 'random') return 'random';
      return plainNumber(name, v, ' or random');
    case 'number':
      return plainNumber(name, v, '');
    case 'color':
      if (typeof v !== 'string' || !COLOR.test(v.trim())) throw new SettingsError(`${name} has to be a color written like #2f5d3a.`);
      return JSON.stringify(v.trim());
    case 'text':
      if (typeof v !== 'string') throw new SettingsError(`${name} has to be words.`);
      if (/[\r\n]/.test(v)) throw new SettingsError(`${name} has to fit on one line.`);
      return JSON.stringify(v);
    case 'longtext':
      if (typeof v !== 'string') throw new SettingsError(`${name} has to be words.`);
      // Backslashes first, then backticks and ${, so the website shows the
      // words exactly as typed instead of running any of them as code.
      return '`' + v.replace(/\r\n?/g, '\n').replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`';
    case 'list':
      if (!Array.isArray(v) || !v.every(x => typeof x === 'string')) throw new SettingsError(`${name} has to be a list of words.`);
      if (v.some(x => /[\r\n]/.test(x))) throw new SettingsError(`Each item in ${name} has to fit on one line.`);
      return v.length ? '[\n' + v.map(x => '  ' + JSON.stringify(x) + ',').join('\n') + '\n]' : '[]';
    case 'data': {
      const wasList = Array.isArray(entry.value);
      if (v === null || typeof v !== 'object' || Array.isArray(v) !== wasList) {
        throw new SettingsError(`${name} has to stay a ${wasList ? 'list [ ]' : 'group { }'}.`);
      }
      return JSON.stringify(v, null, 2);
    }
  }
  throw new SettingsError(`${name} can't be edited from the admin.`);
}

function plainNumber(name, v, orWhat) {
  const s = typeof v === 'number' && Number.isFinite(v) ? String(v) : '';
  if (!/^-?\d+(?:\.\d+)?$/.test(s)) throw new SettingsError(`${name} has to be a number${orWhat}.`);
  return s;
}

function sameJson(a, b) {
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
}

function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])]));
  return v;
}
