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

/* ===== New arrivals: filtros por URL, categoría, género, orden ===== */
const params = new URLSearchParams(location.search);
const state = {
  cat: params.get('cat') || 'all',
  g: params.get('g') || 'all',
  brand: params.get('brand') || 'all',
  q: (params.get('q') || '').trim().toLowerCase(),
  sort: 'featured'
};
const cards = [...document.querySelectorAll('.card')];
cards.forEach((c, i) => c.dataset.index = i);
const catChips = document.querySelectorAll('.chip[data-filter]');
const genChips = document.querySelectorAll('.chip[data-gender]');
const sortSel = document.getElementById('sort');
const countEl = document.getElementById('count');
const emptyEl = document.getElementById('empty');
const noteEl = document.getElementById('note');
const noteText = document.getElementById('note-text');

function setActive(chips, attr, value) {
  chips.forEach(c => c.classList.toggle('chip--active', c.dataset[attr] === value));
}

function apply() {
  const visible = cards.filter(c => {
    const ok =
      (state.cat === 'all' || c.dataset.cat.split(' ').includes(state.cat)) &&
      (state.g === 'all' || c.dataset.gender.split(' ').includes(state.g)) &&
      (state.brand === 'all' || c.dataset.brandSlug === state.brand) &&
      (!state.q || (c.dataset.name + ' ' + c.dataset.brand).toLowerCase().includes(state.q));
    c.classList.toggle('card--hidden', !ok);
    return ok;
  });
  const sorters = {
    featured: (a, b) => a.dataset.index - b.dataset.index,
    'price-asc': (a, b) => a.dataset.price - b.dataset.price,
    'price-desc': (a, b) => b.dataset.price - a.dataset.price,
    name: (a, b) => a.dataset.name.localeCompare(b.dataset.name)
  };
  visible.sort(sorters[state.sort]).forEach((c, i) => c.style.order = i);
  countEl.textContent = visible.length + (visible.length === 1 ? ' pair' : ' pairs');
  emptyEl.classList.toggle('empty--show', visible.length === 0);

  const bits = [];
  if (state.brand !== 'all') {
    const c = cards.find(x => x.dataset.brandSlug === state.brand);
    bits.push('Brand: ' + (c ? c.dataset.brand : state.brand));
  }
  if (state.q) bits.push('Search: “' + params.get('q').trim() + '”');
  noteEl.classList.toggle('note--show', bits.length > 0);
  noteText.textContent = bits.join(' · ');
}

catChips.forEach(chip => chip.addEventListener('click', () => {
  state.cat = chip.dataset.filter; setActive(catChips, 'filter', state.cat); apply();
}));
genChips.forEach(chip => chip.addEventListener('click', () => {
  state.g = chip.dataset.gender; setActive(genChips, 'gender', state.g); apply();
}));
sortSel.addEventListener('change', () => { state.sort = sortSel.value; apply(); });
document.getElementById('note-clear').addEventListener('click', e => {
  e.preventDefault();
  state.brand = 'all'; state.q = ''; apply();
  history.replaceState(null, '', 'new-arrivals.html');
});
document.getElementById('reset').addEventListener('click', () => {
  state.cat = 'all'; state.g = 'all'; state.brand = 'all'; state.q = ''; state.sort = 'featured';
  sortSel.value = 'featured';
  setActive(catChips, 'filter', 'all'); setActive(genChips, 'gender', 'all');
  apply();
  history.replaceState(null, '', 'new-arrivals.html');
});

setActive(catChips, 'filter', state.cat);
setActive(genChips, 'gender', state.g);
apply();
