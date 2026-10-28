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
