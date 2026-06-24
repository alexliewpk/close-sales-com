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

  // This is appended after the dashboard's runtime styling so phone cards
  // always remain a clean vertical stack instead of a horizontal carousel.
  const applyMobileLayout = () => {
    document.getElementById('mobile-card-stack')?.remove();
    const mobileLayout = document.createElement('style');
    mobileLayout.id = 'mobile-card-stack';
    mobileLayout.textContent = '@media (max-width:759px){.metric-grid{display:grid!important;grid-template-columns:1fr!important;overflow:visible!important;margin:0 0 18px!important;padding:0!important;gap:12px!important}.metric-card{width:100%!important;min-width:0!important;flex:none!important}.dashboard-bottom{display:grid!important;grid-template-columns:1fr!important}}';
    document.head.appendChild(mobileLayout);
  };
  setTimeout(applyMobileLayout, 450);
})();
