// The menu on phones: instead of the menu bar across the top (too narrow for
// its options), a button in the top-left corner with three lines. Pressing
// it slides the same options out from the left side of the screen, and the
// lines turn into an X; pressing that closes it again. The menu also closes
// when it's dragged back to the left, when the page beside it is tapped, with
// Escape, and when one of its options is chosen.
//
// Used by the home page (index.html) and by page.js for the other pages; both
// build the menu bar (#quick-nav with its options in #quick-list) first, then
// call setUpPhoneMenu(). Looks: phonemenu.css. Settings: PHONE_MENU_* in
// settings.md.
//
//   setUpPhoneMenu({
//     setting,       // the page's setting(name, fallback)
//     layoutWidth,   // optional: the width the page is laid out for (the home
//                    // page lays itself out for the window at 100% when the
//                    // browser is zoomed, so zooming in doesn't count as narrow)
//   })

function setUpPhoneMenu({ setting, layoutWidth }) {
  const nav = document.getElementById('quick-nav');
  const list = nav && document.getElementById('quick-list');
  if (!list || nav.querySelector('#menu-button')) return;
  const html = document.documentElement;
  if (setting('PHONE_MENU', true) !== true) {
    html.classList.remove('phone-menu');
    return;
  }

  const root = html.style;
  const below = Math.max(0, setting('PHONE_MENU_BELOW_WIDTH', 640));
  root.setProperty('--phone-button-size', Math.max(32, setting('PHONE_MENU_BUTTON_SIZE', 56)) + 'px');
  root.setProperty('--phone-menu-width', Math.max(160, setting('PHONE_MENU_WIDTH', 280)) + 'px');
  root.setProperty('--phone-menu-text-size', Math.max(8, setting('PHONE_MENU_TEXT_SIZE', 20)) + 'px');
  // Same speed as the bar's slide, and switched off along with it.
  root.setProperty('--phone-menu-ms', (setting('TOP_MENU_ANIMATION', true) ? Math.max(0, setting('TOP_MENU_SLIDE_MS', 350)) : 0) + 'ms');

  // The button: three lines that turn into an X while the menu is open.
  const svg = 'http://www.w3.org/2000/svg';
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'menu-button';
  button.setAttribute('aria-controls', 'quick-list');
  const icon = document.createElementNS(svg, 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  for (const [name, y] of [['top', 6], ['middle', 12], ['bottom', 18]]) {
    const line = document.createElementNS(svg, 'line');
    line.setAttribute('class', 'menu-line menu-line-' + name);
    line.setAttribute('x1', '4');
    line.setAttribute('x2', '20');
    line.setAttribute('y1', String(y));
    line.setAttribute('y2', String(y));
    icon.appendChild(line);
  }
  button.appendChild(icon);
  // The page beside the open menu: tapping it closes the menu.
  const scrim = document.createElement('div');
  scrim.id = 'menu-scrim';
  nav.prepend(scrim, button);

  let open = false;
  function setOpen(want) {
    open = want;
    nav.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close the menu' : 'Open the menu');
    list.style.removeProperty('--drag');
  }
  setOpen(false);

  // Phone or not: decided by the width the page is laid out for.
  function check() {
    const width = layoutWidth ? layoutWidth() : window.innerWidth;
    const phone = width < below;
    html.classList.toggle('phone-menu', phone);
    if (!phone && open) setOpen(false);
  }
  check();
  window.addEventListener('resize', check);

  button.addEventListener('click', () => setOpen(!open));
  scrim.addEventListener('click', () => setOpen(false));
  // While the menu is open the page behind it stays put.
  scrim.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
  scrim.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) { setOpen(false); button.focus(); }
  });
  // Choosing an option closes the menu (the page then glides or moves on).
  list.addEventListener('click', (e) => {
    if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; return; }
    if (open && e.target.closest('a')) setOpen(false);
  }, true);
  // The menu bar hides on the home page while the main menu is on screen;
  // the button goes with it, and so does the menu if it's open.
  new MutationObserver(() => {
    if (open && !nav.classList.contains('show')) setOpen(false);
  }).observe(nav, { attributes: true, attributeFilter: ['class'] });

  // Dragging the open menu to the left: it follows the finger, and closes
  // once it's been pulled a third of the way, or flicked. A drag that's
  // mostly up and down is left to scroll the options instead.
  let drag = null, dragged = false;
  list.addEventListener('pointerdown', (e) => {
    if (!open || !html.classList.contains('phone-menu') || e.button) return;
    e.stopPropagation();
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, sideways: null, t: e.timeStamp, lastX: e.clientX, lastT: e.timeStamp, speed: 0 };
    dragged = false;
  });
  list.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (drag.sideways === null) {
      if (Math.hypot(dx, dy) < 8) return;
      drag.sideways = Math.abs(dx) > Math.abs(dy);
      if (!drag.sideways) { drag = null; return; }
      try { list.setPointerCapture(e.pointerId); } catch (err) { /* already gone */ }
      nav.classList.add('dragging');
    }
    dragged = true;
    drag.dx = Math.min(0, dx);
    const dt = e.timeStamp - drag.lastT;
    if (dt > 0) drag.speed = (e.clientX - drag.lastX) / dt;
    drag.lastX = e.clientX;
    drag.lastT = e.timeStamp;
    list.style.setProperty('--drag', drag.dx + 'px');
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    nav.classList.remove('dragging');
    if (!d.sideways) return;
    const far = -d.dx > list.offsetWidth / 3;
    // (A cancelled drag, taken over by the browser, only closes if it got far.)
    const flick = e.type === 'pointerup' && d.speed < -0.5 && d.dx < -40;
    if (far || flick) setOpen(false);
    else list.style.removeProperty('--drag');
  };
  list.addEventListener('pointerup', endDrag);
  list.addEventListener('pointercancel', endDrag);
  // An option is a link, which a mouse would otherwise pick up and carry
  // off instead of dragging the menu.
  list.addEventListener('dragstart', (e) => { if (html.classList.contains('phone-menu')) e.preventDefault(); });
}
