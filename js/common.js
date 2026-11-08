(() => {
  'use strict';

  const DATA_URL = 'data/data.json';
  const THEME_KEY = 'gv-theme';
  let dataPromise = null;

  // Один спільний fetch на сторінку; при помилці кеш скидається, щоб кнопка «Спробувати ще раз» працювала.
  function loadData() {
    if (!dataPromise) {
      dataPromise = fetch(DATA_URL, { headers: { Accept: 'application/json' } })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (!data || !Array.isArray(data.masters) || !Array.isArray(data.categories)) {
            throw new Error('Некоректна структура data.json');
          }
          return data;
        })
        .catch((err) => {
          dataPromise = null;
          throw err;
        });
    }
    return dataPromise;
  }

  // Усі динамічні елементи будуються через DOM API (textContent), без innerHTML.
  function h(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : String(value));
    }
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      node.append(typeof child === 'object' ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  const moneyFormatter = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 });
  const formatMoney = (value) => `${moneyFormatter.format(Math.round(value))} грн`;

  function renderLoadError(container, onRetry) {
    container.replaceChildren(
      h(
        'div',
        { class: 'card p-6 text-center', role: 'alert' },
        h('p', { class: 'font-semibold', text: 'Не вдалося завантажити дані.' }),
        h('p', { class: 'hint-text', text: 'Перевірте з’єднання з інтернетом і спробуйте ще раз.' }),
        h('button', { type: 'button', class: 'btn btn-primary mt-4', text: 'Спробувати ще раз', onclick: onRetry })
      )
    );
  }

  function initTheme() {
    const button = document.getElementById('theme-toggle');
    if (!button) return;
    const root = document.documentElement;
    const sync = () => {
      const dark = root.classList.contains('dark');
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему');
    };
    sync();
    button.addEventListener('click', () => {
      const dark = root.classList.toggle('dark');
      try {
        localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
      } catch (err) {
        // Приватний режим або заблоковане сховище: тема працює до перезавантаження.
      }
      sync();
    });
  }

  function initMenu() {
    const button = document.getElementById('menu-btn');
    const menu = document.getElementById('mobile-menu');
    if (!button || !menu) return;
    const setOpen = (open) => {
      menu.classList.toggle('hidden', !open);
      button.setAttribute('aria-expanded', String(open));
    };
    button.addEventListener('click', () => setOpen(menu.classList.contains('hidden')));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !menu.classList.contains('hidden')) {
        setOpen(false);
        button.focus();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMenu();
    const year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
  });

  window.GV = { loadData, h, formatMoney, renderLoadError };
})();
