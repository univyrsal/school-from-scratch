// Checks that whoever is calling anything under /admin/api has really signed
// in through Cloudflare Access, before the request reaches save.js (or any
// other admin function added later).
//
// Access already stands in front of /admin and sends strangers to the sign-in
// page. This is a second lock on the same door, inside the function itself: if
// an Access rule is ever changed, deleted, or doesn't match some odd spelling
// of the address, nothing can still be written to GitHub without a real
// sign-in.
//
// When Access lets someone through, it adds a signed pass to the request (the
// Cf-Access-Jwt-Assertion header). This file checks that the pass was signed
// by our Access team, was made for one of our /admin apps, and hasn't run
// out. Anything else gets a 403 and goes no further.
//
// Set in the Cloudflare dashboard, under the project's Settings -> Variables
// and Secrets:
//
//   ACCESS_TEAM_DOMAIN   holy-cloud-c431.cloudflareaccess.com
//   ACCESS_AUD           the Audience (AUD) tag of each /admin Access app,
//                        separated by commas (one for www.theschoolfromscratch.org,
//                        one for the-school-from-scratch.pages.dev)
//
// Cloudflare runs a file named _middleware.js before every function in the
// same folder and below, so this covers everything under /admin/api.

// Access's public signing keys, kept between requests so they aren't fetched
// every time. Fetched again when a pass names a key we don't have (Access
// swaps its keys now and then).
let keys = {};

export async function onRequest(context) {
  const { request, env } = context;

  const team = String(env.ACCESS_TEAM_DOMAIN || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const audiences = String(env.ACCESS_AUD || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!team || !audiences.length) {
    return refuse('The admin is not set up yet: ACCESS_TEAM_DOMAIN or ACCESS_AUD is missing in Cloudflare.', 500);
  }

  const pass = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!pass) return refuse('Please sign in to the admin first.');

  const who = await checkPass(pass, team, audiences);
  if (!who) return refuse('Your sign-in could not be confirmed. Please reload the admin page and sign in again.');

  // Later functions can see who is signed in, e.g. for the commit message.
  context.data.editor = who;
  return context.next();
}

// Returns the signed-in email (or true) if the pass is good, otherwise null.
async function checkPass(pass, team, audiences) {
  try {
    const parts = pass.split('.');
    if (parts.length !== 3) return null;
    const header = JSON.parse(fromBase64Url(parts[0], true));
    const claims = JSON.parse(fromBase64Url(parts[1], true));
    if (header.alg !== 'RS256' || !header.kid) return null;

    const key = await signingKey(team, header.kid);
    if (!key) return null;
    const signedOk = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5', key,
      fromBase64Url(parts[2]),
      new TextEncoder().encode(parts[0] + '.' + parts[1]),
    );
    if (!signedOk) return null;

    const now = Math.floor(Date.now() / 1000);
    const passAud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (claims.iss !== 'https://' + team) return null;
    if (!passAud.some(a => audiences.includes(a))) return null;
    if (typeof claims.exp !== 'number' || claims.exp < now) return null;
    if (typeof claims.nbf === 'number' && claims.nbf > now + 60) return null;

    return claims.email || true;
  } catch (e) {
    return null;
  }
}

async function signingKey(team, kid) {
  if (!keys[kid]) {
    const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
    if (!res.ok) return null;
    const fresh = {};
    for (const jwk of (await res.json()).keys || []) {
      fresh[jwk.kid] = await crypto.subtle.importKey(
        'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'],
      );
    }
    keys = fresh;
  }
  return keys[kid] || null;
}

// The pass is written in base64url; asText gives a string, otherwise bytes.
function fromBase64Url(s, asText) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return asText ? new TextDecoder().decode(bytes) : bytes;
}

function refuse(message, status = 403) {
  return new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
