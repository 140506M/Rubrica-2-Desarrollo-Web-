// ─── Configuración base ───
const API = 'http://localhost:3000/api';

// ─── Sesión ───
function getUser() {
  const u = localStorage.getItem('tiendaya_user');
  return u ? JSON.parse(u) : null;
}
function setUser(user) {
  localStorage.setItem('tiendaya_user', JSON.stringify(user));
}
function logout() {
  localStorage.removeItem('tiendaya_user');
  localStorage.removeItem('tiendaya_cart');
  window.location.href = '/';
}

// ─── Fetch helper ───
async function apiPost(endpoint, body) {
  const res = await fetch(API + endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}
async function apiGet(endpoint) {
  const res = await fetch(API + endpoint);
  return res.json();
}
async function apiPut(endpoint, body) {
  const res = await fetch(API + endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}
async function apiDelete(endpoint) {
  const res = await fetch(API + endpoint, { method: 'DELETE' });
  return res.json();
}

// ─── Carrito ───
function getCart() {
  const c = localStorage.getItem('tiendaya_cart');
  return c ? JSON.parse(c) : { duenoId: null, items: [] };
}
function saveCart(cart) {
  localStorage.setItem('tiendaya_cart', JSON.stringify(cart));
}
function clearCart() {
  localStorage.removeItem('tiendaya_cart');
}
function addToCart(producto, cantidad) {
  let cart = getCart();
  if (cart.duenoId && cart.duenoId !== producto.dueno_id) {
    if (!confirm('Tu carrito tiene productos de otra tienda. ¿Vaciarlo y agregar este?')) return false;
    cart = { duenoId: null, items: [] };
  }
  cart.duenoId = producto.dueno_id;
  const existing = cart.items.find(i => i.producto_id === producto.id);
  if (existing) {
    existing.cantidad += cantidad;
  } else {
    cart.items.push({
      producto_id: producto.id,
      nombre: producto.nombre,
      precio_unitario: producto.precio,
      unidad: producto.unidad,
      cantidad: cantidad,
      es_peso: ['kg', 'lb', 'litro'].includes(producto.unidad)
    });
  }
  saveCart(cart);
  return true;
}
function cartTotal() {
  return getCart().items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);
}

// ─── Helpers UI ───
function showAlert(container, msg, type = 'error') {
  container.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
  setTimeout(() => { container.innerHTML = ''; }, 4000);
}
function formatCOP(n) {
  return '$' + Math.round(n).toLocaleString('es-CO');
}
function estadoBadge(estado) {
  const map = {
    pendiente: ['Nuevo', 'badge-new'],
    en_preparacion: ['En preparación', 'badge-prep'],
    en_camino: ['En camino', 'badge-camino'],
    entregado: ['Entregado', 'badge-done'],
    cancelado: ['Cancelado', 'badge-closed'],
    cancelado_tiempo: ['Cancelado (tiempo)', 'badge-closed']
  };
  const [lbl, cls] = map[estado] || [estado, 'badge-new'];
  return `<span class="badge ${cls}">${lbl}</span>`;
}
function emojiCategoria(cat) {
  const m = {
    Granos: '🌾', Frescos: '🥬', Bebidas: '🥤', Aseo: '🧼',
    Lácteos: '🥛', Carnes: '🥩', Panadería: '🍞', General: '🛍️'
  };
  return m[cat] || '🛍️';
}
