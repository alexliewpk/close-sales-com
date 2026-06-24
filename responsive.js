(() => {
  const toggle = document.querySelector('.mobile-menu-toggle');
  const scrim = document.querySelector('.mobile-menu-scrim');
  const sidebar = document.querySelector('.sidebar');
  if (!toggle || !scrim || !sidebar) return;

  const close = () => {
    document.body.classList.remove('mobile-menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
  };
  const open = () => {
    document.body.classList.add('mobile-menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation');
  };
  toggle.addEventListener('click', () => document.body.classList.contains('mobile-menu-open') ? close() : open());
  scrim.addEventListener('click', close);
  sidebar.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', close));
  window.addEventListener('resize', () => { if (window.innerWidth >= 760) close(); });
})();
