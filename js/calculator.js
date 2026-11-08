(() => {
  'use strict';

  const { loadData, h, formatMoney, renderLoadError } = window.GV;

  const els = {
    form: document.getElementById('calc-form'),
    category: document.getElementById('c-category'),
    service: document.getElementById('c-service'),
    qty: document.getElementById('c-qty'),
    qtyUnit: document.getElementById('c-qty-unit'),
    qtyError: document.getElementById('c-qty-error'),
    urgency: document.getElementById('c-urgency'),
    zone: document.getElementById('c-zone'),
    materials: document.getElementById('c-materials'),
    materialsLabel: document.getElementById('c-materials-label'),
    result: document.getElementById('calc-result'),
    status: document.getElementById('calc-status'),
    wrap: document.getElementById('calc-wrap'),
    error: document.getElementById('calc-error'),
  };

  let data = null;

  const findById = (list, id) => list.find((item) => item.id === id) || null;

  // Приймає «2,5», «2.5» та зайві пробіли; не більше двох знаків після коми.
  // Повертає NaN для будь-чого іншого (літери, мінус, експоненту, порожній рядок).
  function parseQuantity(raw) {
    const normalized = String(raw).trim().replace(/\s+/g, '').replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return Number.NaN;
    return Number(normalized);
  }

  function validateQuantity(raw, service) {
    if (String(raw).trim() === '') return { error: 'Вкажіть обсяг робіт.' };
    const value = parseQuantity(raw);
    if (Number.isNaN(value)) return { error: 'Введіть число, наприклад 12 або 2,5 (до двох знаків після коми). Літери та мінус не підходять.' };
    if (value <= 0) return { error: 'Обсяг має бути більшим за нуль.' };
    if (!service.decimals && !Number.isInteger(value)) {
      return { error: `Для одиниці «${service.unit}» потрібне ціле число.` };
    }
    const minQty = service.decimals ? 0.1 : 1;
    if (value < minQty) return { error: `Мінімальний обсяг: ${String(minQty).replace('.', ',')} ${service.unit}.` };
    if (value > service.max) return { error: `Максимум для цієї послуги: ${service.max} ${service.unit}.` };
    return { value };
  }

  // Чиста функція розрахунку: легко перевірити окремо від DOM.
  function calculate({ service, quantity, urgency, zone, withMaterials, surchargePercent }) {
    // Кожну складову округлюємо до гривні, щоб сума рядків у розрахунку завжди збігалася з підсумком.
    const base = Math.round(quantity * service.price);
    const afterMinimum = Math.max(base, service.minOrder);
    const minimumApplied = afterMinimum > base;
    const urgencyExtra = Math.round(afterMinimum * (urgency.multiplier - 1));
    const materialsExtra = withMaterials ? Math.round((afterMinimum + urgencyExtra) * (surchargePercent / 100)) : 0;
    const total = afterMinimum + urgencyExtra + materialsExtra + zone.fee;
    // quantity вже перевірено на > 0, тож ділення безпечне; захист лишається на випадок зміни валідації.
    const perUnit = quantity > 0 ? total / quantity : null;
    return { base, afterMinimum, minimumApplied, urgencyExtra, materialsExtra, tripFee: zone.fee, total, perUnit };
  }

  function currentService() {
    return data ? findById(data.services, els.service.value) : null;
  }

  function fillServices() {
    const services = data.services.filter((s) => s.categoryId === els.category.value);
    els.service.replaceChildren(...services.map((s) => h('option', { value: s.id, text: s.name })));
    syncUnit();
  }

  function syncUnit() {
    const service = currentService();
    if (!service) return;
    els.qtyUnit.textContent = service.unit;
    els.qty.setAttribute('inputmode', service.decimals ? 'decimal' : 'numeric');
    els.qty.setAttribute('aria-describedby', 'c-qty-hint c-qty-error');
    document.getElementById('c-qty-hint').textContent =
      `Ціна: ${formatMoney(service.price)} за ${service.unit}. Мінімальне замовлення: ${formatMoney(service.minOrder)}. Максимум: ${service.max} ${service.unit}.`;
  }

  function showError(message) {
    els.qtyError.textContent = message;
    els.qty.classList.add('field-invalid');
    els.qty.setAttribute('aria-invalid', 'true');
    els.result.replaceChildren(
      h('p', { class: 'text-slate-600 dark:text-slate-300', text: 'Виправте помилку у формі, щоб побачити розрахунок.' })
    );
    els.status.textContent = message;
  }

  function clearError() {
    els.qtyError.textContent = '';
    els.qty.classList.remove('field-invalid');
    els.qty.removeAttribute('aria-invalid');
  }

  const row = (label, value, strong = false) =>
    h(
      'div',
      { class: `flex items-baseline justify-between gap-4 py-2 ${strong ? 'text-lg font-bold' : 'text-sm'}` },
      h('dt', { class: strong ? '' : 'text-slate-600 dark:text-slate-300', text: label }),
      h('dd', { class: 'whitespace-nowrap font-semibold', text: value })
    );

  function renderResult(service, quantity, calc, urgency, zone, withMaterials) {
    const unitQty = `${new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 }).format(quantity)} ${service.unit}`;
    const rows = [row(`Роботи: ${unitQty} × ${formatMoney(service.price)}`, formatMoney(calc.base))];
    if (calc.minimumApplied) {
      rows.push(row('Доплата до мінімального замовлення', formatMoney(calc.afterMinimum - calc.base)));
    }
    if (calc.urgencyExtra > 0) {
      const factor = new Intl.NumberFormat('uk-UA').format(urgency.multiplier);
      rows.push(row(`Доплата за терміновість (×${factor})`, `+${formatMoney(calc.urgencyExtra)}`));
    }
    if (withMaterials) {
      rows.push(row(`Матеріали від майстра (+${data.materialsSurchargePercent}%)`, `+${formatMoney(calc.materialsExtra)}`));
    }
    rows.push(row(`Виїзд: ${zone.name}`, calc.tripFee ? `+${formatMoney(calc.tripFee)}` : '0 грн'));

    els.result.replaceChildren(
      h('dl', { class: 'divide-y divide-slate-200 dark:divide-slate-700' }, ...rows),
      h(
        'div',
        { class: 'mt-3 rounded-xl bg-amber-100 p-4 text-slate-900 dark:bg-amber-500/20 dark:text-amber-100' },
        h('dl', {}, row('Орієнтовна вартість', formatMoney(calc.total), true))
      ),
      calc.perUnit === null
        ? null
        : h('p', { class: 'hint-text', text: `У середньому ${formatMoney(calc.perUnit)} за ${service.unit} з урахуванням усіх доплат.` }),
      h('p', { class: 'hint-text', text: 'Це орієнтир для планування. Остаточну ціну майстер називає після огляду.' })
    );
    els.status.textContent = `Орієнтовна вартість: ${formatMoney(calc.total)}`;
  }

  function update() {
    if (!data) return;
    const service = currentService();
    if (!service) {
      showError('Оберіть послугу зі списку.');
      return;
    }
    const checked = validateQuantity(els.qty.value, service);
    if (checked.error) {
      showError(checked.error);
      return;
    }
    clearError();
    const urgency = findById(data.urgency, els.urgency.value) || data.urgency[0];
    const zone = findById(data.zones, els.zone.value) || data.zones[0];
    const withMaterials = els.materials.checked;
    const calc = calculate({
      service,
      quantity: checked.value,
      urgency,
      zone,
      withMaterials,
      surchargePercent: data.materialsSurchargePercent,
    });
    renderResult(service, checked.value, calc, urgency, zone, withMaterials);
  }

  function fillStatic() {
    const usedCategories = new Set(data.services.map((s) => s.categoryId));
    els.category.replaceChildren(
      ...data.categories.filter((c) => usedCategories.has(c.id)).map((c) => h('option', { value: c.id, text: c.name }))
    );
    els.urgency.replaceChildren(...data.urgency.map((u) => h('option', { value: u.id, text: u.name })));
    els.zone.replaceChildren(...data.zones.map((z) => h('option', { value: z.id, text: z.name })));
    els.materialsLabel.textContent = `Матеріали купує майстер (+${data.materialsSurchargePercent}% до вартості)`;
  }

  async function init() {
    els.error.replaceChildren();
    try {
      data = await loadData();
    } catch (err) {
      console.warn('[calculator] data load failed:', err.message);
      els.wrap.classList.add('hidden');
      renderLoadError(els.error, init);
      return;
    }
    els.wrap.classList.remove('hidden');
    fillStatic();
    const preset = new URLSearchParams(location.search).get('category');
    if (preset && [...els.category.options].some((o) => o.value === preset)) els.category.value = preset;
    fillServices();
    els.qty.value = '10';
    update();
  }

  els.category.addEventListener('change', () => {
    fillServices();
    update();
  });
  els.service.addEventListener('change', () => {
    syncUnit();
    update();
  });
  els.form.addEventListener('input', (event) => {
    if (event.target !== els.category && event.target !== els.service) update();
  });
  els.form.addEventListener('change', (event) => {
    if (event.target !== els.category && event.target !== els.service) update();
  });
  els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    update();
  });

  init();
})();
