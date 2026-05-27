/* =========================================================================
   utils.js — formatting, calendar, DOM, toasts
   Exposed on window.JI namespace.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  /* ---------- Currency ---------- */
  const idrFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const idrCompactFormatter = new Intl.NumberFormat('id-ID', {
    notation: 'compact',
    maximumFractionDigits: 1,
  });

  function formatIDR(amount) {
    const n = Number(amount) || 0;
    return idrFormatter.format(Math.round(n));
  }

  function formatIDRCompact(amount) {
    const n = Number(amount) || 0;
    return 'Rp ' + idrCompactFormatter.format(Math.round(n));
  }

  function parseIDRInput(str) {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    const cleaned = String(str).replace(/[^\d]/g, '');
    return parseInt(cleaned, 10) || 0;
  }

  /* ---------- Custom Calendar -----------
     Rule: 30 days = 1 month, 12 months = 1 year.
     totalDays starts at 1 = "Hari 1, Bulan 1, Y1".
  */
  function getCalendar(totalDays) {
    const t = Math.max(1, Math.floor(totalDays || 1));
    const zero = t - 1;                    // 0-based
    const day   = (zero % 30) + 1;         // 1..30
    const month = (Math.floor(zero / 30) % 12) + 1; // 1..12
    const year  = Math.floor(zero / 360) + 1;       // Y1, Y2, ...
    return { day, month, year, totalDays: t };
  }

  function formatCalendar(totalDays) {
    const c = getCalendar(totalDays);
    return `Hari ${c.day}, Bulan ${c.month}, Y${c.year}`;
  }

  /* ---------- Random ---------- */
  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
  }

  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickRandom(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function pickWeighted(items) {
    // items: [{ value, weight }]
    const total = items.reduce((a, b) => a + (b.weight || 0), 0);
    if (total <= 0) return items[0]?.value;
    let r = Math.random() * total;
    for (const it of items) {
      r -= it.weight || 0;
      if (r <= 0) return it.value;
    }
    return items[items.length - 1].value;
  }

  /**
   * Split `total` into n positive parts, each part >= minPart, with all parts distinct.
   */
  function splitUnequal(total, n, minPart = 1) {
    if (n <= 0) return [];
    if (n === 1) return [total];

    // Generate n distinct random weights, then normalize.
    let weights;
    let attempts = 0;
    do {
      weights = Array.from({ length: n }, () => Math.random() + 0.2);
      attempts++;
    } while (hasDuplicateWeights(weights) && attempts < 5);

    const sumW = weights.reduce((a, b) => a + b, 0);
    let parts = weights.map(w => Math.floor((w / sumW) * total));

    // Ensure minimum
    parts = parts.map(p => Math.max(p, minPart));

    // Adjust last to make sum exactly equal to total
    const diff = total - parts.reduce((a, b) => a + b, 0);
    parts[parts.length - 1] += diff;

    // Force distinctness by nudging duplicates
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        if (parts[i] === parts[j]) {
          parts[i] += 1;
          parts[j] -= 1;
        }
      }
    }
    return parts;
  }

  function hasDuplicateWeights(arr) {
    const s = new Set(arr.map(x => x.toFixed(3)));
    return s.size !== arr.length;
  }

  /* ---------- DOM helpers ---------- */
  function $(sel, root = document) { return root.querySelector(sel); }
  function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v === false || v == null) return;
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === 'dataset' && typeof v === 'object') {
        Object.entries(v).forEach(([dk, dv]) => (node.dataset[dk] = dv));
      } else {
        node.setAttribute(k, v);
      }
    });
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null || c === false) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  /* ---------- Toast notifications ---------- */
  function toast(message, type = 'success', timeoutMs = 2800) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const t = el('div', { class: `toast ${type === 'success' ? '' : type}` });
    const icon = el('span', { class: 'text-lg leading-none' });
    icon.textContent = (
      { success: '✓', error: '✕', warning: '!', info: 'i' }[type] || '✓'
    );
    const text = el('div', { class: 'flex-1 text-sm leading-snug' });
    text.textContent = message;
    t.appendChild(icon);
    t.appendChild(text);
    container.appendChild(t);

    setTimeout(() => {
      t.style.transition = 'opacity .3s, transform .3s';
      t.style.opacity = '0';
      t.style.transform = 'translateX(20px)';
      setTimeout(() => t.remove(), 300);
    }, timeoutMs);
  }

  /* ---------- XP floating toast (sleek gold/emerald) ---------- */
  function showXPToast(amount, opts = {}) {
    const container = document.getElementById('toast-container');
    if (!container || !amount || amount <= 0) return;

    const t = el('div', { class: 'xp-toast' }, [
      el('span', { class: 'xp-toast-spark' }, '✦'),
      el('span', { class: 'xp-toast-amount' }, `+${Math.floor(amount).toLocaleString('id-ID')}`),
      el('span', { class: 'xp-toast-label' }, 'XP'),
      opts.note ? el('span', { class: 'xp-toast-note' }, opts.note) : null,
    ]);
    container.appendChild(t);

    setTimeout(() => {
      t.classList.add('xp-toast-leave');
      setTimeout(() => t.remove(), 450);
    }, 2200);
  }

  /* ---------- Event modal (Indonesia-banget pop-up) ----------
     event: { id, title, body, type: 'positive'|'negative', severity: 'major'|'minor',
             icon, description }
     onClose: optional callback. */
  function showEventModal(event, onClose) {
    if (!event) return;

    // Tear down any existing modal first.
    const existing = document.getElementById('event-modal-root');
    if (existing) existing.remove();

    const root = el('div', {
      id: 'event-modal-root',
      class: `event-modal-root event-${event.type || 'negative'} event-${event.severity || 'minor'}`,
    });

    const card = el('div', { class: 'event-modal-card' });

    const stripe = el('div', { class: 'event-modal-stripe' },
      (event.type === 'positive' ? 'KABAR BAIK' : 'KABAR BURUK')
      + ' · ' + (event.severity === 'major' ? 'BLACK SWAN' : 'INSIDEN')
    );
    card.appendChild(stripe);

    card.appendChild(el('div', { class: 'event-modal-icon' }, event.icon || (event.type === 'positive' ? '🌟' : '⚠️')));
    card.appendChild(el('h3', { class: 'event-modal-title' }, event.title || 'Kejadian Tak Terduga'));
    card.appendChild(el('p', { class: 'event-modal-body' }, event.body || ''));

    if (event.description) {
      card.appendChild(el('div', { class: 'event-modal-impact' }, event.description));
    }

    const closeBtn = el('button', {
      class: 'event-modal-close',
      onclick: () => {
        root.classList.add('event-modal-leave');
        setTimeout(() => {
          root.remove();
          if (typeof onClose === 'function') onClose();
        }, 300);
      },
    }, event.type === 'positive' ? 'Lanjutkan, Pak Bos! ✨' : 'Terima Nasib Saya 😔');
    card.appendChild(closeBtn);

    root.appendChild(card);
    document.body.appendChild(root);
  }

  /* ---------- Clamp ---------- */
  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    formatIDR,
    formatIDRCompact,
    parseIDRInput,
    getCalendar,
    formatCalendar,
    randomInt,
    randomFloat,
    shuffleArray,
    pickRandom,
    pickWeighted,
    splitUnequal,
    $, $$, el,
    toast,
    showXPToast,
    showEventModal,
    clamp,
  });
})(window);
