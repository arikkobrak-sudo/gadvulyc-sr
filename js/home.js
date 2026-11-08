(() => {
  'use strict';

  const { loadData, h, formatMoney, renderLoadError } = window.GV;

  const categoriesEl = document.getElementById('home-categories');
  const topEl = document.getElementById('home-top');
  const reviewsEl = document.getElementById('home-reviews');
  const statsEl = document.getElementById('home-stats');

  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

  function renderStats(data) {
    const avg = data.masters.reduce((sum, m) => sum + m.rating, 0) / data.masters.length;
    const values = {
      masters: String(data.masters.length),
      categories: String(data.categories.length),
      rating: avg.toFixed(1).replace('.', ','),
    };
    for (const [key, value] of Object.entries(values)) {
      const node = statsEl.querySelector(`[data-stat="${key}"]`);
      if (node) node.textContent = value;
    }
  }

  function renderCategories(data) {
    categoriesEl.replaceChildren(
      ...data.categories.map((c) =>
        h(
          'li',
          {},
          h(
            'a',
            {
              href: `masters.html?category=${encodeURIComponent(c.id)}`,
              class: 'card flex h-full items-center gap-3 p-4 transition hover:border-amber-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
            },
            h('span', { class: 'text-2xl', 'aria-hidden': 'true', text: c.icon }),
            h(
              'span',
              { class: 'min-w-0' },
              h('span', { class: 'block font-semibold', text: c.name }),
              h('span', { class: 'block text-sm text-slate-600 dark:text-slate-300', text: c.description })
            )
          )
        )
      )
    );
  }

  function renderTop(data) {
    const names = new Map(data.categories.map((c) => [c.id, c.name]));
    const top = [...data.masters].sort((a, b) => b.rating - a.rating || b.reviews - a.reviews).slice(0, 3);
    topEl.replaceChildren(
      ...top.map((m) =>
        h(
          'li',
          { class: 'card flex flex-col gap-2 p-5' },
          h('h3', { class: 'text-lg font-bold', text: m.name }),
          h('p', { class: 'text-sm text-slate-600 dark:text-slate-300', text: `${names.get(m.categoryId) || 'Інше'} · ${m.city}` }),
          h('p', { class: 'text-sm' }, h('span', { class: 'font-bold text-amber-700 dark:text-amber-400', text: `★ ${m.rating.toFixed(1)}` }), ` · ${m.reviews} відгуків`),
          h('p', { class: 'text-sm' }, 'від ', h('strong', { text: formatMoney(m.priceFrom) })),
          h('a', { class: 'link mt-1 text-sm', href: 'masters.html', text: 'Усі майстри' })
        )
      )
    );
  }

  function renderReviews(data) {
    const masters = new Map(data.masters.map((m) => [m.id, m]));
    reviewsEl.replaceChildren(
      ...data.reviews.map((r) => {
        const master = masters.get(r.masterId);
        return h(
          'div',
          { class: 'swiper-slide !h-auto' },
          h(
            'figure',
            { class: 'card flex h-full flex-col gap-3 p-6' },
            h('p', { class: 'text-amber-700 dark:text-amber-400', 'aria-label': `Оцінка ${r.rating} з 5`, text: stars(r.rating) }),
            h('blockquote', { class: 'text-slate-800 dark:text-slate-100', text: r.text }),
            h(
              'figcaption',
              { class: 'mt-auto text-sm text-slate-600 dark:text-slate-300' },
              h('strong', { text: r.author }),
              master ? ` про майстра ${master.name}` : ''
            )
          )
        );
      })
    );
    initSwiper();
  }

  function initSwiper() {
    if (typeof window.Swiper !== 'function') return;
    new window.Swiper('#reviews-swiper', {
      slidesPerView: 1,
      spaceBetween: 16,
      loop: false,
      a11y: { prevSlideMessage: 'Попередній відгук', nextSlideMessage: 'Наступний відгук' },
      pagination: { el: '.swiper-pagination', clickable: true },
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
      breakpoints: { 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } },
    });
  }

  async function init() {
    try {
      const data = await loadData();
      renderStats(data);
      renderCategories(data);
      renderTop(data);
      renderReviews(data);
    } catch (err) {
      console.warn('[home] data load failed:', err.message);
      for (const el of [categoriesEl, topEl, reviewsEl]) renderLoadError(el, init);
    }
  }

  init();
})();
