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

/* ===== Cart: lista, cantidades, envío gratis, código promo y checkout ===== */
const FREE_SHIPPING = 150, SHIPPING = 8, PROMO = { code: 'OFFCOURT10', rate: 0.10 };
const listEl = document.getElementById('cart-list');
const summary = document.getElementById('summary');
const promoForm = document.getElementById('promo-form');
const promoInput = document.getElementById('promo');
const promoMsg = document.getElementById('promo-msg');
const orderEl = document.getElementById('order');
const orderText = document.getElementById('order-text');
const money = n => '$' + n.toFixed(2);
let promoOn = Store.get('oc_promo', false);

function render() {
  const items = Cart.items();
  if (!items.length) {
    listEl.innerHTML = '<div class="cart__empty"><h2>Your cart is empty.</h2><p>Good pairs are waiting.</p><a class="btn btn--dark" href="new-arrivals.html">Find your next pair</a></div>';
    summary.hidden = true;
    Cart.badge();
    return;
  }
  summary.hidden = false;
  listEl.innerHTML = items.map(i => `
    <article class="cart-item" data-id="${i.id}">
      <div class="card__thumb card__thumb--${i.thumb}"></div>
      <div>
        <small class="cart-item__brand">${i.brand}</small>
        <h3 class="cart-item__name">${i.name}</h3>
        <button class="cart-item__remove" data-action="remove">Remove</button>
      </div>
      <div class="qty">
        <button class="qty__btn" data-action="dec" aria-label="Decrease quantity">–</button>
        <span class="qty__num">${i.qty}</span>
        <button class="qty__btn" data-action="inc" aria-label="Increase quantity">+</button>
      </div>
      <span class="cart-item__price">${money(i.price * i.qty)}</span>
    </article>`).join('');

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = promoOn ? subtotal * PROMO.rate : 0;
  const after = subtotal - discount;
  const shipping = after >= FREE_SHIPPING ? 0 : SHIPPING;
  document.getElementById('sum-subtotal').textContent = money(subtotal);
  document.getElementById('sum-shipping').textContent = shipping ? money(shipping) : 'Free';
  document.getElementById('sum-total').textContent = money(after + shipping);
  const dRow = document.getElementById('sum-discount-row');
  dRow.hidden = !promoOn;
  document.getElementById('sum-discount').textContent = '–' + money(discount);
  document.getElementById('ship-fill').style.width = Math.min(after / FREE_SHIPPING * 100, 100) + '%';
  document.getElementById('ship-text').textContent = shipping
    ? 'You’re ' + money(FREE_SHIPPING - after) + ' away from free shipping.'
    : 'You’ve unlocked free shipping.';
  Cart.badge();
}

listEl.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = btn.closest('.cart-item').dataset.id;
  let items = Cart.items();
  const item = items.find(i => i.id === id);
  if (btn.dataset.action === 'inc') item.qty++;
  if (btn.dataset.action === 'dec') item.qty--;
  if (btn.dataset.action === 'remove' || item.qty < 1) items = items.filter(i => i.id !== id);
  Cart.save(items);
  render();
});

promoForm.addEventListener('submit', e => {
  e.preventDefault();
  const code = promoInput.value.trim().toUpperCase();
  const ok = code === PROMO.code;
  promoOn = ok;
  Store.set('oc_promo', ok);
  promoMsg.className = 'promo__msg ' + (ok ? 'promo__msg--ok' : 'promo__msg--error');
  promoMsg.textContent = ok ? 'Código aplicado: 10% de descuento.' : 'Código no válido.';
  render();
});
if (promoOn) { promoInput.value = PROMO.code; }

document.getElementById('clear').addEventListener('click', () => {
  Cart.save([]); render();
});

document.getElementById('checkout').addEventListener('click', () => {
  if (!Cart.items().length) return;
  const n = 'OC-' + Math.floor(100000 + Math.random() * 900000);
  Cart.save([]);
  promoOn = false; Store.set('oc_promo', false); promoInput.value = ''; promoMsg.textContent = '';
  orderText.textContent = '¡Gracias por tu compra! Tu pedido ' + n + ' está confirmado.';
  orderEl.classList.add('order--show');
  render();
  orderEl.scrollIntoView({ behavior: 'smooth' });
});

render();
