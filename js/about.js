(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.GLightbox !== 'function') return;
    window.GLightbox({ selector: '.glightbox', loop: true, touchNavigation: true });
  });
})();
