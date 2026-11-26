/* ===== Compartido: almacenamiento, carrito, favoritos, menú y búsqueda ===== */
const Store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

const Cart = {
  items() { return Store.get('oc_cart', []); },
  save(list) { Store.set('oc_cart', list); Cart.badge(); },
  count() { return Cart.items().reduce((n, i) => n + i.qty, 0); },
  add(p) {
    const list = Cart.items();
    const found = list.find(i => i.id === p.id);
    if (found) found.qty++; else list.push({ ...p, qty: 1 });
    Cart.save(list);
  },
  badge() {
    const el = document.getElementById('cart-count');
    if (el) el.textContent = Cart.count();
  }
};

const Favs = {
  list() { return Store.get('oc_favs', []); },
  has(id) { return Favs.list().includes(id); },
  toggle(id) {
    let list = Favs.list();
    const on = !list.includes(id);
    list = on ? [...list, id] : list.filter(x => x !== id);
    Store.set('oc_favs', list);
    return on;
  }
};

let toastTimer;
function toast(text) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.add('toast--show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('toast--show'), 2200);
}

function setHeart(btn, on) {
  btn.classList.toggle('card__heart--on', on);
  btn.textContent = on ? '♥' : '♡';
  btn.setAttribute('aria-pressed', on);
}
function syncHearts() {
  document.querySelectorAll('.card').forEach(card => {
    const h = card.querySelector('.card__heart');
    if (h) setHeart(h, Favs.has(card.dataset.id));
  });
}

// Menú móvil
const burger = document.getElementById('burger');
const menu = document.getElementById('menu');
const searchForm = document.getElementById('search');
const searchToggle = document.getElementById('search-toggle');
const searchInput = document.getElementById('search-input');

burger.addEventListener('click', () => {
  const open = menu.classList.toggle('header__menu--open');
  burger.setAttribute('aria-expanded', open);
  if (open) closeSearch();
});
menu.addEventListener('click', e => {
  if (e.target.classList.contains('header__link')) menu.classList.remove('header__menu--open');
});

// Búsqueda: lleva a new-arrivals.html?q=...
function closeSearch() {
  searchForm.hidden = true;
  searchToggle.setAttribute('aria-expanded', 'false');
}
searchToggle.addEventListener('click', () => {
  const open = searchForm.hidden;
  searchForm.hidden = !open;
  searchToggle.setAttribute('aria-expanded', open);
  if (open) {
    menu.classList.remove('header__menu--open');
    burger.setAttribute('aria-expanded', 'false');
    searchInput.focus();
  }
});
searchForm.addEventListener('submit', e => {
  e.preventDefault();
  const q = searchInput.value.trim();
  if (q) location.href = (location.pathname.includes('/pages/') ? '' : 'pages/') + 'new-arrivals.html?q=' + encodeURIComponent(q);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSearch(); });

// Carrito y favoritos (delegado: funciona con cualquier .card de la página)
document.addEventListener('click', e => {
  const add = e.target.closest('.card__add');
  if (add) {
    const c = add.closest('.card');
    Cart.add({ id: c.dataset.id, name: c.dataset.name, brand: c.dataset.brand, price: Number(c.dataset.price), thumb: c.dataset.thumb });
    toast(c.dataset.name + ' añadido al carrito');
    return;
  }
  const heart = e.target.closest('.card__heart');
  if (heart) {
    const id = heart.closest('.card').dataset.id;
    const on = Favs.toggle(id);
    document.querySelectorAll('.card').forEach(card => {
      if (card.dataset.id === id) setHeart(card.querySelector('.card__heart'), on);
    });
    toast(on ? 'Guardado en favoritos' : 'Quitado de favoritos');
  }
});

Cart.badge();
syncHearts();

/* ===== Contact: formulario validado, FAQ y conversor de tallas ===== */
const form = document.getElementById('contact-form');
const formMsg = document.getElementById('form-msg');
const rules = {
  name: v => v.trim().length >= 2 || 'Escribe tu nombre.',
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Escribe un correo válido.',
  topic: v => v !== '' || 'Elige un tema.',
  message: v => v.trim().length >= 10 || 'El mensaje debe tener al menos 10 caracteres.'
};
function check(field) {
  const res = rules[field.name](field.value);
  const err = document.getElementById(field.name + '-error');
  field.setAttribute('aria-invalid', res !== true);
  err.textContent = res === true ? '' : res;
  return res === true;
}
const fields = [...form.querySelectorAll('[name]')];
fields.forEach(f => f.addEventListener('blur', () => check(f)));
form.addEventListener('submit', e => {
  e.preventDefault();
  const ok = fields.map(check).every(Boolean);
  formMsg.classList.toggle('form__msg--ok', ok);
  formMsg.textContent = ok ? '¡Mensaje enviado! Te responderemos en menos de 24 horas.' : 'Revisa los campos marcados.';
  if (ok) form.reset();
});

// FAQ: solo una respuesta abierta a la vez
const faqs = [...document.querySelectorAll('.faq__item')];
faqs.forEach(d => d.addEventListener('toggle', () => {
  if (d.open) faqs.forEach(o => { if (o !== d) o.open = false; });
}));
if (location.hash === '#faq' && faqs[0]) faqs[0].open = true;

// Conversor de tallas: lee la tabla del propio HTML
const rows = [...document.querySelectorAll('#size-table tbody tr')];
const sel = document.getElementById('size-us');
const out = document.getElementById('size-result');
rows.forEach(r => sel.add(new Option('US ' + r.cells[0].textContent, r.cells[0].textContent)));
function convert() {
  rows.forEach(r => r.classList.remove('size__row--selected'));
  const r = rows.find(x => x.cells[0].textContent === sel.value);
  if (!r) { out.textContent = 'Elige una talla US.'; return; }
  r.classList.add('size__row--selected');
  out.textContent = 'EU ' + r.cells[1].textContent + ' · UK ' + r.cells[2].textContent + ' · ' + r.cells[3].textContent + ' cm';
}
sel.addEventListener('change', convert);
convert();
