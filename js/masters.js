(() => {
  'use strict';

  const { loadData, h, formatMoney, renderLoadError } = window.GV;

  const grid = document.getElementById('masters-grid');
  const countEl = document.getElementById('results-count');
  const emptyEl = document.getElementById('empty-state');
  const form = document.getElementById('filters');
  const searchInput = document.getElementById('f-search');
  const categorySelect = document.getElementById('f-category');
  const ratingSelect = document.getElementById('f-rating');
  const sortSelect = document.getElementById('f-sort');
  const resetBtn = document.getElementById('f-reset');
  const dialog = document.getElementById('master-dialog');
  const dialogBody = document.getElementById('master-dialog-body');

  let state = { masters: [], categories: new Map() };
  let lastFocused = null;

  const SORTERS = {
    rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
    reviews: (a, b) => b.reviews - a.reviews,
    experience: (a, b) => b.experience - a.experience,
    price: (a, b) => a.priceFrom - b.priceFrom,
  };

  const pluralReviews = (n) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'відгук';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'відгуки';
    return 'відгуків';
  };

  const initials = (name) =>
    name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2);

  function ratingLine(master) {
    return h(
      'p',
      { class: 'flex items-center gap-1.5 text-sm' },
      h('span', { class: 'font-bold text-amber-700 dark:text-amber-400', 'aria-hidden': 'true', text: `★ ${master.rating.toFixed(1)}` }),
      h('span', { class: 'sr-only', text: `Рейтинг ${master.rating.toFixed(1)} з 5` }),
      h('span', { class: 'text-slate-600 dark:text-slate-300', text: `${master.reviews} ${pluralReviews(master.reviews)}` })
    );
  }

  function avatar(master) {
    return h(
      'div',
      {
        class: 'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-400 text-lg font-bold text-slate-900',
        'aria-hidden': 'true',
        text: initials(master.name),
      }
    );
  }

  function masterCard(master) {
    const category = state.categories.get(master.categoryId);
    return h(
      'article',
      { class: 'card flex flex-col gap-3 p-5' },
      h(
        'div',
        { class: 'flex items-start gap-3' },
        avatar(master),
        h(
          'div',
          { class: 'min-w-0' },
          h('h2', { class: 'truncate text-lg font-bold', text: master.name }),
          h('p', { class: 'text-sm text-slate-600 dark:text-slate-300', text: category ? category.name : 'Інше' })
        ),
        master.verified ? h('span', { class: 'badge ml-auto shrink-0', text: 'Перевірений' }) : null
      ),
      ratingLine(master),
      h('p', { class: 'line-clamp-2 text-sm text-slate-700 dark:text-slate-200', text: master.bio }),
      h(
        'div',
        { class: 'mt-auto flex items-center justify-between gap-3 pt-2' },
        h('p', { class: 'text-sm' }, 'від ', h('strong', { text: formatMoney(master.priceFrom) })),
        h('button', {
          type: 'button',
          class: 'btn btn-outline !min-h-[44px] !px-4 !py-2 text-sm',
          text: 'Детальніше',
          'aria-label': `Детальніше про майстра ${master.name}`,
          onclick: (event) => openDialog(master, event.currentTarget),
        })
      )
    );
  }

  function currentFilters() {
    return {
      query: searchInput.value.trim().toLowerCase(),
      category: categorySelect.value,
      minRating: Number(ratingSelect.value) || 0,
      sort: SORTERS[sortSelect.value] ? sortSelect.value : 'rating',
    };
  }

  function matches(master, filters) {
    if (filters.category && master.categoryId !== filters.category) return false;
    if (master.rating < filters.minRating) return false;
    if (!filters.query) return true;
    const category = state.categories.get(master.categoryId);
    const haystack = [master.name, master.city, master.bio, category ? category.name : '', ...master.skills]
      .join(' ')
      .toLowerCase();
    return haystack.includes(filters.query);
  }

  function render() {
    const filters = currentFilters();
    const result = state.masters.filter((m) => matches(m, filters)).sort(SORTERS[filters.sort]);
    grid.replaceChildren(...result.map(masterCard));
    emptyEl.classList.toggle('hidden', result.length > 0);
    countEl.textContent = result.length
      ? `Знайдено майстрів: ${result.length} з ${state.masters.length}`
      : 'Нічого не знайдено';
    syncUrl(filters);
  }

  // Параметри у URL дозволяють ділитися фільтром і переходити з категорій на головній.
  function syncUrl(filters) {
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.query) params.set('q', searchInput.value.trim());
    if (filters.minRating) params.set('rating', String(filters.minRating));
    if (filters.sort !== 'rating') params.set('sort', filters.sort);
    const qs = params.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
  }

  function applyUrlParams() {
    const params = new URLSearchParams(location.search);
    const category = params.get('category');
    if (category && state.categories.has(category)) categorySelect.value = category;
    searchInput.value = (params.get('q') || '').slice(0, 60);
    const rating = params.get('rating');
    if (rating && [...ratingSelect.options].some((o) => o.value === rating)) ratingSelect.value = rating;
    const sort = params.get('sort');
    if (sort && SORTERS[sort]) sortSelect.value = sort;
  }

  function openDialog(master, trigger) {
    lastFocused = trigger;
    const category = state.categories.get(master.categoryId);
    dialogBody.replaceChildren(
      h(
        'div',
        { class: 'flex items-center gap-3' },
        avatar(master),
        h(
          'div',
          {},
          h('h2', { id: 'master-dialog-title', class: 'text-xl font-bold', text: master.name }),
          h('p', { class: 'text-sm text-slate-600 dark:text-slate-300', text: `${category ? category.name : 'Інше'} · ${master.city}` })
        )
      ),
      ratingLine(master),
      h('p', { class: 'mt-3 text-slate-700 dark:text-slate-200', text: master.bio }),
      h(
        'ul',
        { class: 'mt-4 flex flex-wrap gap-2', 'aria-label': 'Навички' },
        master.skills.map((skill) => h('li', { class: 'badge', text: skill }))
      ),
      h(
        'dl',
        { class: 'mt-4 grid grid-cols-2 gap-3 text-sm' },
        h('div', {}, h('dt', { class: 'text-slate-600 dark:text-slate-300', text: 'Досвід' }), h('dd', { class: 'font-semibold', text: `${master.experience} р.` })),
        h('div', {}, h('dt', { class: 'text-slate-600 dark:text-slate-300', text: 'Ціна' }), h('dd', { class: 'font-semibold', text: `від ${formatMoney(master.priceFrom)}` }))
      ),
      h(
        'div',
        { class: 'mt-6 flex flex-wrap gap-3' },
        h('a', { class: 'btn btn-primary', href: `calculator.html?category=${encodeURIComponent(master.categoryId)}`, text: 'Розрахувати вартість' }),
        h('a', { class: 'btn btn-outline', href: 'contact.html', text: 'Зв’язатися' })
      )
    );
    dialog.setAttribute('aria-labelledby', 'master-dialog-title');
    dialog.showModal();
  }

  function fillCategories(categories) {
    categorySelect.append(
      ...categories.map((c) => h('option', { value: c.id, text: c.name }))
    );
  }

  async function init() {
    grid.setAttribute('aria-busy', 'true');
    try {
      const data = await loadData();
      state = { masters: data.masters, categories: new Map(data.categories.map((c) => [c.id, c])) };
      fillCategories(data.categories);
      applyUrlParams();
      render();
    } catch (err) {
      console.warn('[masters] data load failed:', err.message);
      countEl.textContent = '';
      renderLoadError(grid, init);
    } finally {
      grid.removeAttribute('aria-busy');
    }
  }

  form.addEventListener('input', render);
  form.addEventListener('change', render);
  form.addEventListener('submit', (event) => event.preventDefault());
  resetBtn.addEventListener('click', () => {
    form.reset();
    render();
    searchInput.focus();
  });

  dialog.addEventListener('close', () => {
    if (lastFocused) lastFocused.focus();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  document.getElementById('master-dialog-close').addEventListener('click', () => dialog.close());

  init();
})();
