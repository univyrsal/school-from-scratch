// Lets the admin's site editor (/admin) show this page as it will be once
// saved. The editor shows the real site in a frame; this page, inside that
// frame, then reads settings.md and the words of each section from the
// editor (the latest saved versions, plus any changes not saved yet) instead
// of from the website, which can be a minute behind after a save.
//
// For every visitor who isn't in the editor this does nothing at all: it
// only acts when the page sits in a frame on this same website whose page
// says it's the editor.
(() => {
  let editor = null;
  try {
    if (window.parent !== window && window.parent.siteEditor) editor = window.parent.siteEditor;
  } catch (e) {
    return; // framed by another website: none of its business
  }
  if (!editor || typeof editor.textFor !== 'function') return;
  const realFetch = window.fetch.bind(window);
  window.fetch = (resource, init) => {
    try {
      const url = new URL(typeof resource === 'string' ? resource : resource.url, location.href);
      if (url.origin === location.origin) {
        const text = editor.textFor(decodeURIComponent(url.pathname.replace(/^\//, '')));
        if (typeof text === 'string') {
          return Promise.resolve(new Response(text, { status: 200, headers: { 'Content-Type': 'text/markdown; charset=utf-8' } }));
        }
      }
    } catch (e) { /* not one of the editor's files */ }
    return realFetch(resource, init);
  };
  document.documentElement.classList.add('in-site-editor');
})();
