// Mobile nav, shared by every page
const nav = document.getElementById('nav');
const toggle = document.querySelector('.menu-toggle');
const iconPath = toggle.querySelector('path');
const setNav = open => {
  nav.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', open);
  toggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
  iconPath.setAttribute('d', open ? 'M5 5l14 14M19 5L5 19' : 'M3 7h18M3 12h18M3 17h12');
};
toggle.addEventListener('click', () => setNav(!nav.classList.contains('is-open')));
nav.addEventListener('click', e => { if (e.target.closest('a')) setNav(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setNav(false); toggle.focus(); } });

// "Hizmetler" is only the menu's label: clicking or tapping it never leaves the page.
// On wide screens it opens and closes the submenu (hover still opens it too); in the
// phone menu the service links are already listed under it. Without JS it still links home.
const wide = matchMedia('(min-width: 1025px)');
document.querySelectorAll('.nav__group > a').forEach(link => {
  const group = link.parentElement;
  const setOpen = open => { group.classList.toggle('is-open', open); link.setAttribute('aria-expanded', open); };
  link.setAttribute('aria-haspopup', 'true');
  link.setAttribute('aria-expanded', 'false');
  link.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    if (wide.matches) setOpen(!group.classList.contains('is-open'));
  });
  document.addEventListener('click', e => { if (!group.contains(e.target)) setOpen(false); });
  group.addEventListener('keydown', e => { if (e.key === 'Escape') { setOpen(false); link.focus(); } });
});

// Quick contact: the four buttons fold behind one chat bubble
const fab = document.querySelector('.fab');
if (fab) {
  const fabToggle = fab.querySelector('.fab__toggle');
  const setFab = open => {
    fab.classList.toggle('is-open', open);
    fabToggle.setAttribute('aria-expanded', open);
    fabToggle.setAttribute('aria-label', open ? 'Hızlı iletişimi kapat' : 'Hızlı iletişimi aç');
  };
  fabToggle.addEventListener('click', () => setFab(!fab.classList.contains('is-open')));
  document.addEventListener('click', e => { if (!fab.contains(e.target)) setFab(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && fab.classList.contains('is-open')) { setFab(false); fabToggle.focus(); } });
}
