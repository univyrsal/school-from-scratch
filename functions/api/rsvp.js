// Takes an RSVP from the box on the play's page and sends two emails: one
// to whoever is running the show, and one back to the person who wrote in.
//
// This runs on Cloudflare, not in anyone's browser, which is the whole
// point: the key that sends the mail never leaves the server and is never
// in this repository. It is set in the Cloudflare dashboard instead, under
// the project's Settings -> Environment variables:
//
//   RESEND_API_KEY     the key from resend.com (mark it as a secret)
//   RSVP_FROM          who the mail comes from, on a domain verified with
//                      Resend: "The School From Scratch <rsvp@example.org>"
//   RSVP_ADMIN_EMAIL   where the RSVPs are sent; several addresses can be
//                      separated by commas
//   RSVP_SHOW          optional, the show these RSVPs are for, which goes
//                      in the subject line
//
// Cloudflare Pages turns every file under functions/ into an address on the
// site on its own, so this one answers at /api/rsvp with no wiring needed.

const MOST_SEATS = 10;

// ---- What the two emails say ------------------------------------------------
// Edit these freely: this is the wording, and nothing below needs touching.
// An empty line starts a new paragraph. These stand in for the details:
//
//   {show}   the show's name (RSVP_SHOW)
//   {seats}  "1 seat" or "3 seats", worded to suit
//   {count}  just the number
//   {email}  the address the person gave
//
const WORDS = {
  // To whoever is running the show.
  toYou: {
    subject: 'RSVP: {seats} for {show}',
    body: `A new RSVP for {show}.

Email: {email}
Seats: {count}

Reply to this message to answer them directly.`,
  },
  // Back to the person who wrote in.
  toThem: {
    subject: 'Your RSVP for {show}',
    body: `Thank you — your RSVP is in.

We have put you down for {seats} at {show}.

We will write again with the details closer to the day. If your plans
change, just reply to this message and let us know.

The School From Scratch`,
  },
};

// The box is shown in a frame of its own with no origin of its own, so its
// requests arrive marked "null". This is a public form that carries no
// cookies and no sign-in, so it answers to anyone; there is nothing here
// that being asked by someone else could give away.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const reply = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', ...CORS },
});

// Enough to catch a slip of the keyboard. Anything stricter turns away real
// addresses, and the only way to truly know is to write to it — which is
// what happens next anyway.
const looksLikeAnAddress = (value) => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(value);

const escapeHtml = (text) => String(text)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ---- Reading settings.md ----------------------------------------------------
// The wording and the look of the emails live in settings.md with everything
// else, so there is one place to change them. This runs on a server rather
// than in anyone's browser, so it fetches that file from the site itself.
//
// The browser runs the grey code blocks; here they are read rather than run —
// Cloudflare doesn't allow running code that arrives as text, and it would be
// a poor idea even if it did. Only plain values are understood: words in
// quotes (of any of the three kinds, so wording can run over several lines),
// numbers, and true or false. Anything else in the file is passed over.
function readPlainSettings(text) {
  const blocks = text.match(/```js\s*[\s\S]*?```/g) || [];
  const source = blocks.join('\n');
  const found = {};
  const line = /^[ \t]*([A-Z][A-Z0-9_]*)[ \t]*=[ \t]*(`(?:[^`\\]|\\[\s\S])*`|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|true|false|-?\d+(?:\.\d+)?)/gm;
  let m;
  while ((m = line.exec(source))) {
    const raw = m[2];
    let value;
    if (raw === 'true' || raw === 'false') value = raw === 'true';
    else if (/^-?[\d.]/.test(raw)) value = Number(raw);
    else value = raw.slice(1, -1).replace(/\\([\s\S])/g, (all, ch) =>
      ch === 'n' ? '\n' : ch === 't' ? '\t' : ch);
    found[m[1]] = value;
  }
  return found;
}

async function settingsFor(request) {
  try {
    const where = new URL('/settings.md', request.url).toString();
    // Kept for a few minutes so a run of RSVPs doesn't fetch it each time.
    const answer = await fetch(where, { cf: { cacheTtl: 300, cacheEverything: true } });
    if (!answer.ok) throw new Error('HTTP ' + answer.status);
    return readPlainSettings(await answer.text());
  } catch (err) {
    // The words below are built in, so a missing or unreadable file means
    // plainer emails rather than no emails.
    console.error('RSVP: settings.md could not be read, using the built-in wording:', err && err.message);
    return {};
  }
}

async function send(key, mail) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify(mail),
  });
  if (!response.ok) {
    // Read the reason for the log, but never hand it back to the browser:
    // it can name the account and the domain.
    const said = await response.text().catch(() => '');
    throw new Error('Resend answered ' + response.status + ': ' + said.slice(0, 300));
  }
  return response.json();
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY || !env.RSVP_FROM || !env.RSVP_ADMIN_EMAIL) {
    console.error('RSVP: the mail settings are missing in the Cloudflare dashboard.');
    return reply(500, { ok: false, error: 'This form is not set up yet.' });
  }

  let sent;
  try {
    sent = await request.json();
  } catch (err) {
    return reply(400, { ok: false, error: 'We could not read that.' });
  }

  // A box no person can see. Anything that fills it in is not a person, and
  // is told everything went fine so it has no reason to try again.
  if (String(sent.website || '').trim()) return reply(200, { ok: true });

  const email = String(sent.email || '').trim().slice(0, 254);
  if (!looksLikeAnAddress(email)) {
    return reply(400, { ok: false, error: 'That email address does not look right.' });
  }

  const seats = Math.round(Number(sent.seats));
  if (!Number.isFinite(seats) || seats < 1 || seats > MOST_SEATS) {
    return reply(400, { ok: false, error: 'Please choose between 1 and ' + MOST_SEATS + ' seats.' });
  }

  const show = String(env.RSVP_SHOW || 'Is Nirmal Normal?');
  const people = seats === 1 ? '1 seat' : seats + ' seats';

  // What settings.md says, falling back to the wording built in above.
  const said = await settingsFor(request);
  const words = (name, ifNotSaid) =>
    (typeof said[name] === 'string' && said[name].trim() ? said[name] : ifNotSaid);
  const number = (name, ifNotSaid) =>
    (typeof said[name] === 'number' && said[name] > 0 ? said[name] : ifNotSaid);

  // How the emails look. A font has to be one the person reading already
  // has — email programs don't fetch fonts — so this is a list of names to
  // try, ending in something every machine has.
  const font = words('RSVP_EMAIL_FONT', "Georgia, 'Times New Roman', serif");
  const size = number('RSVP_EMAIL_TEXT_SIZE', 16);
  // A picture under the words. Written as a file in the site's own folders,
  // and turned into a full web address, since an email is read far away
  // from this site and can't follow a path of its own.
  const pictureFile = words('RSVP_EMAIL_IMAGE', '');
  const pictureWide = number('RSVP_EMAIL_IMAGE_WIDTH', 220);
  let picture = '';
  if (pictureFile) {
    try {
      const at = new URL(pictureFile, new URL('/', request.url)).toString();
      picture = '<img src="' + escapeHtml(at) + '" width="' + pictureWide + '" alt=""'
        + ' style="display:block;margin:28px auto 0;max-width:100%;height:auto;border:0">';
    } catch (err) {
      console.error('RSVP: RSVP_EMAIL_IMAGE is not a file this site has:', pictureFile);
    }
  }

  // The wording, with the details filled in. It is written once, as words,
  // and the tidier version email programs prefer is made from it, so there
  // is only ever one copy to keep up to date.
  const details = { show, seats: people, count: String(seats), email };
  const fill = (text) => String(text).replace(/\{(\w+)\}/g, (all, name) =>
    (Object.prototype.hasOwnProperty.call(details, name) ? details[name] : all));
  const asParagraphs = (text) => escapeHtml(text).split(/\n\s*\n/)
    .map((block) => '<p style="margin:0 0 1em">' + block.trim().split('\n').join('<br>') + '</p>').join('');
  const letter = (which, subjectName, bodyName) => {
    const subject = fill(words(subjectName, which.subject));
    const body = fill(words(bodyName, which.body));
    return {
      subject,
      text: body,
      html: '<div style="font-family:' + escapeHtml(font) + ';font-size:' + size
        + 'px;line-height:1.5;color:#0b1105">' + asParagraphs(body) + picture + '</div>',
    };
  };

  // Replies to the note sent back to the person have to land somewhere a
  // person reads. RSVP_FROM is only a name on an envelope — there is no
  // mailbox behind it — so they are pointed at whoever is running the show.
  const runningTheShow = env.RSVP_ADMIN_EMAIL.split(',').map((one) => one.trim()).filter(Boolean);

  // The two letters are not equal. The one to whoever is running the show
  // carries the RSVP itself: if it doesn't go, the RSVP is lost and the
  // person has to be told so. The one back to the person is a courtesy —
  // if it doesn't go, the RSVP is still safely in hand, so it is not worth
  // turning them away over. (Resend's shared sender only writes to the
  // address that owns the account until a domain of your own is verified,
  // so until then this second one is expected to fail.)
  try {
    // To whoever is running the show. Replying goes straight back to the
    // person who wrote in.
    await send(env.RESEND_API_KEY, {
      from: env.RSVP_FROM,
      to: runningTheShow,
      reply_to: email,
      ...letter(WORDS.toYou, 'RSVP_EMAIL_TO_YOU_SUBJECT', 'RSVP_EMAIL_TO_YOU_BODY'),
    });
  } catch (err) {
    console.error('RSVP could not be sent:', err && err.message);
    return reply(502, { ok: false, error: 'We could not send that just now. Please try again in a moment.' });
  }

  // From here on the RSVP is in hand, so nothing below turns the person away.
  let toldThem = true;
  try {
    // And back to the person who wrote in, so they know it arrived.
    await send(env.RESEND_API_KEY, {
      from: env.RSVP_FROM,
      to: [email],
      reply_to: runningTheShow, // not RSVP_FROM: nobody reads that address
      ...letter(WORDS.toThem, 'RSVP_EMAIL_TO_THEM_SUBJECT', 'RSVP_EMAIL_TO_THEM_BODY'),
    });
  } catch (err) {
    // The RSVP arrived; only the courtesy didn't. Worth knowing about, not
    // worth failing over — the page just doesn't promise an email.
    toldThem = false;
    console.error('The RSVP came through, but the note back to ' + email
      + ' did not go:', err && err.message);
  }

  return reply(200, { ok: true, confirmed: toldThem });
}
