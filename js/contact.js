(() => {
  'use strict';

  const form = document.getElementById('contact-form');
  const success = document.getElementById('contact-success');
  const phoneInput = document.getElementById('f-phone');

  const NAME_RE = /^[A-Za-zА-Яа-яІіЇїЄєҐґ'’ʼ-]+(?: [A-Za-zА-Яа-яІіЇїЄєҐґ'’ʼ-]+){0,3}$/;
  const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
  const PHONE_RE = /^\+380 \(\d{2}\) \d{3}-\d{2}-\d{2}$/;

  const RULES = {
    name: (v) => {
      if (v.length < 2) return 'Вкажіть ім’я (щонайменше 2 літери).';
      if (v.length > 50 || !NAME_RE.test(v)) return 'Ім’я може містити лише літери, пробіл, дефіс і апостроф.';
      return '';
    },
    email: (v) => (EMAIL_RE.test(v) && v.length <= 254 ? '' : 'Введіть email у форматі name@example.com.'),
    phone: (v) => (PHONE_RE.test(v) ? '' : 'Введіть номер повністю: +380 (XX) XXX-XX-XX.'),
    message: (v) => {
      if (v.length < 10) return 'Повідомлення занадто коротке (мінімум 10 символів).';
      if (v.length > 500) return 'Повідомлення занадто довге (максимум 500 символів).';
      return '';
    },
  };

  // Маска телефону: залишаємо лише цифри, префікс 380 додається автоматично.
  function formatPhone(raw) {
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('380')) digits = digits.slice(3);
    else if (digits.startsWith('80')) digits = digits.slice(2);
    else if (digits.startsWith('0')) digits = digits.slice(1);
    digits = digits.slice(0, 9);
    if (!digits) return '';
    const [a, b, c, d] = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)];
    let out = `+380 (${a}`;
    if (a.length === 2) out += ')';
    if (b) out += ` ${b}`;
    if (c) out += `-${c}`;
    if (d) out += `-${d}`;
    return out;
  }

  function setFieldState(input, message) {
    const error = document.getElementById(`${input.id}-error`);
    error.textContent = message;
    input.classList.toggle('field-invalid', Boolean(message));
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    return !message;
  }

  function validateField(input) {
    const rule = RULES[input.name];
    return setFieldState(input, rule(input.value.trim()));
  }

  phoneInput.addEventListener('input', () => {
    phoneInput.value = formatPhone(phoneInput.value);
  });

  const counter = document.getElementById('f-message-count');
  const messageInput = document.getElementById('f-message');
  messageInput.addEventListener('input', () => {
    counter.textContent = `${messageInput.value.length} / 500`;
  });

  for (const input of form.querySelectorAll('[data-validate]')) {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.classList.contains('field-invalid')) validateField(input);
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const inputs = [...form.querySelectorAll('[data-validate]')];
    const results = inputs.map((input) => validateField(input));
    const firstInvalid = inputs[results.indexOf(false)];
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }
    // Демо-режим: дані нікуди не надсилаються і не зберігаються.
    form.classList.add('hidden');
    success.classList.remove('hidden');
    success.focus();
  });

  document.getElementById('contact-again').addEventListener('click', () => {
    form.reset();
    counter.textContent = '0 / 500';
    for (const input of form.querySelectorAll('[data-validate]')) setFieldState(input, '');
    success.classList.add('hidden');
    form.classList.remove('hidden');
    document.getElementById('f-name').focus();
  });
})();
