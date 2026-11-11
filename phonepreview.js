// PHONE_PREVIEW in settings.md: for testing on a computer, every page opens
// inside an iPhone-sized frame (phone.html), where it lays itself out for a
// phone screen and shows the phone menu, as on an iPhone.
//
// Only ever on this computer (localhost, or its address on the home
// network), never on the live site, so turning it on in settings.md and
// publishing changes nothing for visitors.
//
// Inside the frame this only hides the scrollbar, since an iPhone's floats
// over the page instead of taking up room beside it.
(() => {
  let framed = false;
  try { framed = window.top !== window; } catch (e) { framed = true; }
  if (framed) {
    if (window.name === 'phone-preview') {
      const style = document.createElement('style');
      style.textContent = 'html { scrollbar-width: none; } html::-webkit-scrollbar { display: none; }';
      document.head.appendChild(style);
    }
    return;
  }
  const host = location.hostname;
  const local = host === 'localhost' || host === '[::1]' || /^(127|10)\./.test(host) || /^192\.168\./.test(host) || host.endsWith('.local');
  if (!local || /^\/admin(\/|$)/.test(location.pathname)) return;
  fetch('settings.md', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.text() : ''))
    .then((text) => {
      const code = [...text.matchAll(/```js\r?\n([\s\S]*?)```/g)].map((m) => m[1]).join('\n');
      if (/^\s*PHONE_PREVIEW\s*=\s*true\b/m.test(code)) {
        location.replace('phone.html#' + encodeURIComponent(location.pathname + location.hash));
      }
    })
    .catch(() => { /* no settings: no preview */ });
})();
