/* =====================================================================
   EasyCart — Simple Online Store
   Plain JavaScript only. No libraries, no backend.
   All data is kept in the browser's localStorage.

   How this file is organised:
     1. Settings and sample data
     2. Small helper functions
     3. Saving / loading data (localStorage)
     4. Cart functions
     5. Order functions
     6. Pages (each "render" function draws one page)
     7. Click / form / change handlers
     8. Start-up
   ===================================================================== */
"use strict";

/* ---------------------------------------------------------------------
   1. SETTINGS AND SAMPLE DATA
   --------------------------------------------------------------------- */

// Names of the localStorage entries we use.
const KEYS = {
  products: "easycart_products",
  cart: "easycart_cart",
  orders: "easycart_orders",
  seeded: "easycart_seeded"          // remembers that sample products were added once
};
const ADMIN_FLAG = "easycart_admin_mode";   // saved in sessionStorage (cleared when the tab closes)

const CURRENCY = "$";                 // change this to "₹", "€", etc. if you like
const MAX_QTY = 99;                   // largest quantity allowed for one product
const STATUSES = ["Placed", "Processing", "Shipped", "Delivered"];

// Emoji shown when a product has no image (or the image fails to load).
const CATEGORY_ICONS = {
  "electronics": "🎧",
  "clothing": "👕",
  "accessories": "👜",
  "home essentials": "🏠"
};

// Sample catalog. It is only saved on the very first visit.
// The images are CSS placeholders (emoji on a purple background), so nothing can break.
const SAMPLE_PRODUCTS = [
  { id: "p1",  name: "Wireless Headphones",       category: "Electronics",     price: 59.99, description: "Over-ear Bluetooth headphones with deep bass and 20-hour battery life.", image: "" },
  { id: "p2",  name: "Smart Watch",               category: "Electronics",     price: 89.00, description: "Tracks steps, heart rate and sleep. Shows phone notifications.", image: "" },
  { id: "p3",  name: "Portable Bluetooth Speaker", category: "Electronics",    price: 34.50, description: "Pocket-sized speaker with clear sound and a splash-proof body.", image: "" },
  { id: "p4",  name: "Classic Cotton T-Shirt",    category: "Clothing",        price: 14.99, description: "Soft everyday T-shirt in 100% cotton. Comfortable regular fit.", image: "" },
  { id: "p5",  name: "Denim Jacket",              category: "Clothing",        price: 49.95, description: "Timeless blue denim jacket with button front and two pockets.", image: "" },
  { id: "p6",  name: "Canvas Backpack",           category: "Accessories",     price: 29.99, description: "Roomy backpack with a padded laptop sleeve and front pocket.", image: "" },
  { id: "p7",  name: "Leather Wallet",            category: "Accessories",     price: 19.99, description: "Slim wallet with six card slots and a coin pocket.", image: "" },
  { id: "p8",  name: "Steel Water Bottle",        category: "Home Essentials", price: 16.50, description: "Insulated 750 ml bottle that keeps drinks cold for 24 hours.", image: "" },
  { id: "p9",  name: "Ceramic Mug Set (4)",       category: "Home Essentials", price: 22.00, description: "Four glazed mugs, microwave and dishwasher safe.", image: "" },
  { id: "p10", name: "LED Desk Lamp",             category: "Home Essentials", price: 27.75, description: "Adjustable lamp with three brightness levels and a USB port.", image: "" }
];

/* ---------------------------------------------------------------------
   2. SMALL HELPER FUNCTIONS
   --------------------------------------------------------------------- */

const app = document.getElementById("app");

// Turns special characters into safe text so user input can never run as HTML.
function esc(value) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value).replace(/[&<>"']/g, ch => map[ch]);
}

// Rounds to 2 decimals (avoids results like 0.1 + 0.2 = 0.30000000000000004).
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function money(n) {
  return CURRENCY + Number(n).toFixed(2);
}

function emojiFor(category) {
  return CATEGORY_ICONS[String(category).toLowerCase()] || "🛍️";
}

function makeId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Shows a small message at the bottom of the screen for 2.5 seconds.
let toastTimer = null;
function toast(message, type) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.className = "toast show" + (type === "error" ? " error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = "toast"; }, 2500);
}

/* ---------------------------------------------------------------------
   3. SAVING AND LOADING DATA (localStorage)
   --------------------------------------------------------------------- */

// Reads a value. If it is missing or broken, we return the fallback instead of crashing.
function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    toast("Could not save data. Your browser may be blocking storage.", "error");
    return false;
  }
}

/* ----- Products ----- */

// Checks one product loaded from storage. Returns a clean copy, or null if it is unusable.
function cleanProduct(p) {
  if (!p || typeof p !== "object") return null;
  const price = Number(p.price);
  if (typeof p.id !== "string" || !p.id) return null;
  if (typeof p.name !== "string" || !p.name.trim()) return null;
  if (!isFinite(price) || price < 0) return null;
  return {
    id: p.id,
    name: p.name.trim(),
    description: typeof p.description === "string" ? p.description : "",
    price: round2(price),
    category: (typeof p.category === "string" && p.category.trim()) ? p.category.trim() : "Other",
    image: typeof p.image === "string" ? p.image : ""
  };
}

function getProducts() {
  const raw = readStorage(KEYS.products, []);
  if (!Array.isArray(raw)) return [];
  return raw.map(cleanProduct).filter(Boolean);
}

function saveProducts(list) {
  return writeStorage(KEYS.products, list);
}

// Adds the sample products ONLY on the first visit. After that we never overwrite them.
function initStore() {
  let alreadySeeded = false;
  try { alreadySeeded = localStorage.getItem(KEYS.seeded) === "yes"; } catch (e) { /* ignore */ }
  if (alreadySeeded) return;

  // If a valid product list already exists, keep it. Otherwise save the samples.
  if (!Array.isArray(readStorage(KEYS.products, null))) {
    saveProducts(SAMPLE_PRODUCTS);
  }
  writeStorage(KEYS.seeded, "yes");
}

function getCategories() {
  const names = getProducts().map(p => p.category);
  return Array.from(new Set(names)).sort();
}

/* ----- Orders ----- */

function cleanOrder(o) {
  if (!o || typeof o !== "object" || typeof o.id !== "string" || !Array.isArray(o.items)) return null;

  const items = o.items.map(i => {
    if (!i || typeof i !== "object") return null;
    const price = Number(i.price);
    const qty = Math.floor(Number(i.qty));
    if (typeof i.name !== "string" || !isFinite(price) || price < 0 || !isFinite(qty) || qty < 1) return null;
    return { id: String(i.id || ""), name: i.name, price: round2(price), qty: qty };
  }).filter(Boolean);

  if (items.length === 0) return null;

  const c = (o.customer && typeof o.customer === "object") ? o.customer : {};
  return {
    id: o.id,
    date: isNaN(new Date(o.date).getTime()) ? new Date().toISOString() : o.date,
    customer: {
      name: String(c.name || ""),
      email: String(c.email || ""),
      address: String(c.address || ""),
      phone: String(c.phone || "")
    },
    items: items,
    // The total is always recalculated from the real prices and quantities.
    total: round2(items.reduce((sum, i) => sum + i.price * i.qty, 0)),
    status: STATUSES.includes(o.status) ? o.status : "Placed"
  };
}

function getOrders() {
  const raw = readStorage(KEYS.orders, []);
  if (!Array.isArray(raw)) return [];
  return raw.map(cleanOrder).filter(Boolean);
}

function saveOrders(list) {
  return writeStorage(KEYS.orders, list);
}

/* ----- Admin mode (demo only) ----- */

let adminMode = false;
try { adminMode = sessionStorage.getItem(ADMIN_FLAG) === "on"; } catch (e) { /* ignore */ }

function setAdminMode(on) {
  adminMode = on;
  try {
    if (on) sessionStorage.setItem(ADMIN_FLAG, "on");
    else sessionStorage.removeItem(ADMIN_FLAG);
  } catch (e) { /* ignore */ }
}

/* ---------------------------------------------------------------------
   4. CART FUNCTIONS
   The cart is saved as a list like: [ { id: "p1", qty: 2 }, ... ]
   Only the product id and quantity are stored. Prices are always looked up
   from the product list, so totals can never be out of date.
   --------------------------------------------------------------------- */

function getCart() {
  const raw = readStorage(KEYS.cart, []);
  if (!Array.isArray(raw)) return [];
  const totals = new Map();
  raw.forEach(item => {
    if (!item || typeof item.id !== "string") return;
    const qty = Math.floor(Number(item.qty));
    if (!isFinite(qty) || qty < 1) return;
    totals.set(item.id, Math.min(MAX_QTY, (totals.get(item.id) || 0) + qty));
  });
  return Array.from(totals, ([id, qty]) => ({ id, qty }));
}

function saveCart(cart) {
  writeStorage(KEYS.cart, cart);
  updateCartBadge();
}

// Joins cart entries with product details. Products that no longer exist are skipped.
function cartLines() {
  const products = getProducts();
  const lines = [];
  getCart().forEach(item => {
    const product = products.find(p => p.id === item.id);
    if (product) {
      lines.push({ product: product, qty: item.qty, lineTotal: round2(product.price * item.qty) });
    }
  });
  return lines;
}

function cartTotal(lines) {
  return round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
}

function updateCartBadge() {
  const count = cartLines().reduce((sum, l) => sum + l.qty, 0);
  document.getElementById("cart-count").textContent = count;
}

function addToCart(productId) {
  const product = getProducts().find(p => p.id === productId);
  if (!product) { toast("That product is no longer available.", "error"); return; }

  const cart = getCart();
  const entry = cart.find(c => c.id === productId);
  if (entry) {
    if (entry.qty >= MAX_QTY) { toast("Maximum quantity reached for this product.", "error"); return; }
    entry.qty += 1;
  } else {
    cart.push({ id: productId, qty: 1 });
  }
  saveCart(cart);
  toast(product.name + " added to your cart");
}

function changeQty(productId, change) {
  const cart = getCart();
  const entry = cart.find(c => c.id === productId);
  if (!entry) return;

  if (entry.qty + change < 1) {          // going below 1 means "remove"
    removeFromCart(productId);
    return;
  }
  if (entry.qty + change > MAX_QTY) { toast("Maximum quantity is " + MAX_QTY + ".", "error"); return; }

  entry.qty += change;
  saveCart(cart);
  render(false);
}

function removeFromCart(productId) {
  const product = getProducts().find(p => p.id === productId);
  const name = product ? product.name : "this item";
  if (!confirm("Remove " + name + " from your cart?")) return;

  saveCart(getCart().filter(c => c.id !== productId));
  toast("Item removed from cart");
  render(false);
}

function clearCart() {
  if (!confirm("Remove everything from your cart?")) return;
  saveCart([]);
  toast("Cart cleared");
  render(false);
}

/* ---------------------------------------------------------------------
   5. ORDER FUNCTIONS
   --------------------------------------------------------------------- */

function makeOrderId() {
  const existing = getOrders().map(o => o.id);
  let id;
  do {
    id = "EC-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  } while (existing.includes(id));
  return id;
}

function updateOrderStatus(orderId, newStatus) {
  if (!STATUSES.includes(newStatus)) { toast("Invalid status.", "error"); return; }
  if (!adminMode) { toast("Only the demo admin can change order status.", "error"); return; }

  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) { toast("Order not found.", "error"); return; }

  order.status = newStatus;
  if (saveOrders(orders)) {
    toast("Order " + orderId + " is now " + newStatus);
    render(false);
  }
}

/* ---------------------------------------------------------------------
   6. PAGES
   --------------------------------------------------------------------- */

/* ----- Product card (used by Home and Products pages) ----- */

function productCard(p) {
  const emoji = emojiFor(p.category);
  // The emoji placeholder is always there. A real image (if any) sits on top of it,
  // and is hidden automatically if it fails to load.
  const img = p.image ? '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">' : "";
  return '' +
    '<article class="card">' +
      '<div class="card-img"><div class="img-placeholder" aria-hidden="true">' + emoji + '</div>' + img + '</div>' +
      '<div class="card-body">' +
        '<span class="tag">' + esc(p.category) + '</span>' +
        '<h3>' + esc(p.name) + '</h3>' +
        '<p class="desc">' + esc(p.description) + '</p>' +
        '<div class="card-foot">' +
          '<span class="price">' + money(p.price) + '</span>' +
          '<button class="btn btn-small" data-action="add" data-id="' + esc(p.id) + '">Add to Cart</button>' +
        '</div>' +
      '</div>' +
    '</article>';
}

/* ----- Home and Products pages (catalog with search + category filter) ----- */

const filters = { search: "", category: "All" };

function renderCatalog(showBanner) {
  const categories = ["All"].concat(getCategories());
  if (!categories.includes(filters.category)) filters.category = "All";

  const banner = showBanner ? '' +
    '<section class="banner">' +
      '<h1>Welcome to EasyCart 👋</h1>' +
      '<p>Simple shopping for electronics, clothing, accessories and home essentials. Pick something you like and add it to your cart.</p>' +
      '<a class="btn btn-light" href="#/cart">View my cart</a>' +
      '<p class="banner-note">Demo store: no real payments are taken.</p>' +
    '</section>' : '';

  const options = categories.map(c =>
    '<option value="' + esc(c) + '"' + (c === filters.category ? " selected" : "") + '>' +
    (c === "All" ? "All categories" : esc(c)) + '</option>').join("");

  app.innerHTML = banner +
    '<section>' +
      '<h2>Products</h2>' +
      '<div class="toolbar">' +
        '<input id="search" type="search" placeholder="Search products by name…" aria-label="Search products by name" value="' + esc(filters.search) + '">' +
        '<select id="category" aria-label="Filter by category">' + options + '</select>' +
      '</div>' +
      '<p id="result-count" class="muted"></p>' +
      '<div id="grid" class="grid"></div>' +
    '</section>';

  document.getElementById("search").addEventListener("input", e => {
    filters.search = e.target.value;
    updateGrid();                      // only the grid is redrawn, so the search box keeps focus
  });
  document.getElementById("category").addEventListener("change", e => {
    filters.category = e.target.value;
    updateGrid();
  });
  updateGrid();
}

function updateGrid() {
  const grid = document.getElementById("grid");
  const countEl = document.getElementById("result-count");
  if (!grid) return;

  const all = getProducts();
  const query = filters.search.trim().toLowerCase();
  const list = all.filter(p =>
    (filters.category === "All" || p.category === filters.category) &&
    p.name.toLowerCase().includes(query)
  );

  if (all.length === 0) {
    grid.innerHTML = '<div class="empty"><div class="empty-icon">📭</div>' +
      '<p>The store has no products yet.</p>' +
      '<a class="btn" href="#/admin">Go to Admin to add products</a></div>';
    countEl.textContent = "";
  } else if (list.length === 0) {
    grid.innerHTML = '<div class="empty"><div class="empty-icon">🔍</div>' +
      '<p><strong>No products match your search.</strong></p>' +
      '<p class="muted">Try a different word or choose “All categories”.</p>' +
      '<button class="btn btn-outline" data-action="clear-filters">Clear search</button></div>';
    countEl.textContent = "";
  } else {
    grid.innerHTML = list.map(productCard).join("");
    countEl.textContent = "Showing " + list.length + " of " + all.length + " products";
  }
}

/* ----- Cart page ----- */

function renderCart() {
  const lines = cartLines();

  if (lines.length === 0) {
    app.innerHTML = '<section><h2>Your Cart</h2>' +
      '<div class="empty"><div class="empty-icon">🛒</div>' +
      '<p><strong>Your cart is empty.</strong></p>' +
      '<p class="muted">Add a few products and they will show up here.</p>' +
      '<a class="btn" href="#/products">Browse products</a></div></section>';
    return;
  }

  const rows = lines.map(l => '' +
    '<div class="cart-row">' +
      '<div class="cart-name">' + esc(l.product.name) + '<br><small>' + esc(l.product.category) + '</small></div>' +
      '<div><span class="cart-label">Price</span>' + money(l.product.price) + '</div>' +
      '<div><span class="cart-label">Quantity</span>' +
        '<span class="qty">' +
          '<button data-action="dec" data-id="' + esc(l.product.id) + '" aria-label="Decrease quantity of ' + esc(l.product.name) + '">−</button>' +
          '<span>' + l.qty + '</span>' +
          '<button data-action="inc" data-id="' + esc(l.product.id) + '" aria-label="Increase quantity of ' + esc(l.product.name) + '">+</button>' +
        '</span></div>' +
      '<div><span class="cart-label">Line total</span><strong>' + money(l.lineTotal) + '</strong></div>' +
      '<div><button class="btn btn-danger btn-small" data-action="remove" data-id="' + esc(l.product.id) + '">Remove</button></div>' +
    '</div>').join("");

  app.innerHTML = '<section><h2>Your Cart</h2>' +
    '<div class="cart-head"><span>Product</span><span>Price</span><span>Quantity</span><span>Line total</span><span></span></div>' +
    rows +
    '<div class="cart-summary">' +
      '<div>Total: <span class="cart-total">' + money(cartTotal(lines)) + '</span></div>' +
      '<div class="cart-actions">' +
        '<button class="btn btn-outline" data-action="clear-cart">Clear cart</button>' +
        '<a class="btn" href="#/checkout">Proceed to checkout</a>' +
      '</div>' +
    '</div></section>';
}

/* ----- Checkout page ----- */

function renderCheckout() {
  const lines = cartLines();
  if (lines.length === 0) {
    app.innerHTML = '<section class="narrow"><h2>Checkout</h2>' +
      '<div class="empty"><div class="empty-icon">🛒</div>' +
      '<p><strong>Your cart is empty, so there is nothing to check out.</strong></p>' +
      '<a class="btn" href="#/products">Browse products</a></div></section>';
    return;
  }

  const summary = lines.map(l =>
    '<li><span>' + esc(l.product.name) + ' × ' + l.qty + '</span><span>' + money(l.lineTotal) + '</span></li>').join("");

  app.innerHTML = '<section><h2>Checkout</h2>' +
    '<div class="notice info"><strong>Demo only.</strong> No payment is taken. Please do not enter card details or any real private information.</div>' +
    '<div class="two-col">' +
      '<form id="checkout-form" class="panel" novalidate>' +
        '<h3>Delivery details</h3>' +
        '<div class="field"><label for="c-name">Full name *</label>' +
          '<input id="c-name" type="text" autocomplete="name" maxlength="80"><small class="error" data-for="c-name"></small></div>' +
        '<div class="field"><label for="c-email">Email *</label>' +
          '<input id="c-email" type="email" autocomplete="email" maxlength="120"><small class="error" data-for="c-email"></small></div>' +
        '<div class="field"><label for="c-phone">Phone number *</label>' +
          '<input id="c-phone" type="tel" autocomplete="tel" maxlength="20" placeholder="e.g. +1 555 123 4567"><small class="error" data-for="c-phone"></small></div>' +
        '<div class="field"><label for="c-address">Delivery address *</label>' +
          '<textarea id="c-address" autocomplete="street-address" maxlength="250"></textarea><small class="error" data-for="c-address"></small></div>' +
        '<button type="submit" class="btn">Place demo order</button>' +
      '</form>' +
      '<aside class="panel">' +
        '<h3>Order summary</h3>' +
        '<ul class="summary-list">' + summary + '</ul>' +
        '<div class="summary-total"><span>Total</span><span>' + money(cartTotal(lines)) + '</span></div>' +
        '<p style="margin-top:0.8rem"><a href="#/cart">← Back to cart</a></p>' +
      '</aside>' +
    '</div></section>';
}

// Shows or clears the red error messages under form fields.
function showErrors(form, errors) {
  form.querySelectorAll(".error").forEach(el => { el.textContent = ""; });
  form.querySelectorAll(".invalid").forEach(el => el.classList.remove("invalid"));

  const ids = Object.keys(errors);
  ids.forEach(id => {
    const input = form.querySelector("#" + id);
    const msg = form.querySelector('.error[data-for="' + id + '"]');
    if (input) input.classList.add("invalid");
    if (msg) msg.textContent = errors[id];
  });
  if (ids.length > 0) {
    const first = form.querySelector("#" + ids[0]);
    if (first) first.focus();
  }
  return ids.length === 0;
}

function placeOrder(form) {
  const name = form.querySelector("#c-name").value.trim();
  const email = form.querySelector("#c-email").value.trim();
  const phone = form.querySelector("#c-phone").value.trim();
  const address = form.querySelector("#c-address").value.trim();

  const errors = {};
  if (name.length < 2) errors["c-name"] = "Please enter your full name (at least 2 characters).";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors["c-email"] = "Please enter a valid email, like name@example.com.";
  const digits = phone.replace(/\D/g, "");
  if (!/^\+?[\d\s()-]+$/.test(phone) || digits.length < 7 || digits.length > 15) {
    errors["c-phone"] = "Please enter a valid phone number (7 to 15 digits).";
  }
  if (address.length < 8) errors["c-address"] = "Please enter your full delivery address (at least 8 characters).";

  if (!showErrors(form, errors)) {
    toast("Please fix the highlighted fields.", "error");
    return;
  }

  // Rebuild the order from the real cart and real product prices.
  const lines = cartLines();
  if (lines.length === 0) { toast("Your cart is empty.", "error"); location.hash = "#/cart"; return; }

  const order = {
    id: makeOrderId(),
    date: new Date().toISOString(),
    customer: { name: name, email: email, phone: phone, address: address },
    items: lines.map(l => ({ id: l.product.id, name: l.product.name, price: l.product.price, qty: l.qty })),
    total: cartTotal(lines),
    status: "Placed"
  };

  const orders = getOrders();
  orders.unshift(order);                 // newest order first
  if (!saveOrders(orders)) return;       // if saving failed, keep the cart so nothing is lost

  saveCart([]);                          // clear the cart only after the order is safely saved
  location.hash = "#/confirmation/" + encodeURIComponent(order.id);
}

/* ----- Order confirmation page ----- */

function renderConfirmation(orderId) {
  const order = getOrders().find(o => o.id === orderId);
  if (!order) {
    app.innerHTML = '<section class="narrow"><h2>Order not found</h2>' +
      '<p class="muted">We could not find that order. It may have been cleared from this browser.</p>' +
      '<a class="btn" href="#/orders">See my orders</a></section>';
    return;
  }
  app.innerHTML = '<section class="narrow">' +
    '<div class="notice success"><strong>🎉 Thank you, ' + esc(order.customer.name) + '! Your demo order has been placed.</strong></div>' +
    orderCard(order, false) +
    '<p class="muted">This is a demonstration. No payment was taken and nothing will be shipped.</p>' +
    '<div class="cart-actions"><a class="btn" href="#/orders">View all orders</a>' +
    '<a class="btn btn-outline" href="#/products">Continue shopping</a></div></section>';
}

/* ----- Orders (used by Orders page, Confirmation page and Admin) ----- */

function orderCard(o, canEditStatus) {
  const current = STATUSES.indexOf(o.status);

  const tracker = STATUSES.map((s, i) =>
    '<li class="' + (i <= current ? "done" : "") + (i === current ? " current" : "") + '">' +
      '<span class="dot">' + (i < current ? "✓" : i + 1) + '</span>' + s + '</li>').join("");

  const items = o.items.map(i =>
    '<li><span>' + esc(i.name) + ' × ' + i.qty + '</span><span>' + money(i.price * i.qty) + '</span></li>').join("");

  const editor = canEditStatus ? '' +
    '<label class="status-edit">Update status ' +
      '<select class="status-select" data-id="' + esc(o.id) + '">' +
        STATUSES.map(s => '<option' + (s === o.status ? " selected" : "") + '>' + s + '</option>').join("") +
      '</select></label>' : '';

  return '' +
    '<article class="panel">' +
      '<div class="order-top">' +
        '<div><div class="order-id">Order ' + esc(o.id) + '</div>' +
        '<small>' + esc(new Date(o.date).toLocaleString()) + '</small></div>' +
        '<span class="status ' + esc(o.status) + '">' + esc(o.status) + '</span>' +
      '</div>' +
      '<ol class="tracker" aria-label="Order progress">' + tracker + '</ol>' +
      '<ul class="summary-list">' + items + '</ul>' +
      '<div class="summary-total"><span>Total</span><span>' + money(o.total) + '</span></div>' +
      '<p class="muted" style="margin-top:0.7rem;margin-bottom:0"><small>Deliver to: ' + esc(o.customer.name) + ', ' +
        esc(o.customer.address) + ' · ' + esc(o.customer.phone) + '</small></p>' +
      editor +
    '</article>';
}

function renderOrders() {
  const orders = getOrders();
  const note = adminMode
    ? '<div class="notice warn">Demo admin mode is ON, so you can update order statuses below.</div>'
    : '<p class="muted">Order statuses are updated by the store admin. (In this demo, use the <a href="#/admin">Admin page</a>.)</p>';

  if (orders.length === 0) {
    app.innerHTML = '<section><h2>Your Orders</h2>' + note +
      '<div class="empty"><div class="empty-icon">📦</div>' +
      '<p><strong>You have not placed any orders yet.</strong></p>' +
      '<p class="muted">Orders appear here after you check out.</p>' +
      '<a class="btn" href="#/products">Start shopping</a></div></section>';
    return;
  }
  app.innerHTML = '<section><h2>Your Orders</h2>' + note +
    orders.map(o => orderCard(o, adminMode)).join("") + '</section>';
}

/* ----- Admin page ----- */

let adminTab = "products";     // "products" or "orders"
let editingId = null;          // id of the product being edited (or null when adding)

function renderAdmin() {
  if (!adminMode) {
    app.innerHTML = '<section class="narrow"><h2>Admin Panel</h2>' +
      '<div class="notice warn"><strong>Demo admin mode.</strong> This demo has no login. ' +
      'Anyone using this browser can switch admin mode on. A real store needs a backend server with ' +
      'proper sign-in and server-side authorization, because localStorage and JavaScript in the browser can be changed by anyone.</div>' +
      '<button class="btn" data-action="admin-enter">Enter demo admin mode</button></section>';
    return;
  }

  const orders = getOrders();
  const header = '' +
    '<div class="admin-bar"><h2>Admin Panel <span class="mode-pill">Demo admin mode</span></h2>' +
    '<button class="btn btn-outline btn-small" data-action="admin-exit">Exit admin mode</button></div>' +
    '<p class="muted">Demo only: this is not secure authentication. Real stores need a backend with server-side authorization.</p>' +
    '<div class="tabs">' +
      '<button class="tab' + (adminTab === "products" ? " active" : "") + '" data-action="admin-tab" data-tab="products">Products</button>' +
      '<button class="tab' + (adminTab === "orders" ? " active" : "") + '" data-action="admin-tab" data-tab="orders">Orders (' + orders.length + ')</button>' +
    '</div>';

  if (adminTab === "orders") {
    const body = orders.length === 0
      ? '<div class="empty"><div class="empty-icon">📦</div><p><strong>No customer orders yet.</strong></p>' +
        '<p class="muted">Place an order from the store and it will appear here.</p></div>'
      : orders.map(o => orderCard(o, true)).join("");
    app.innerHTML = '<section>' + header + body + '</section>';
    return;
  }

  // Products tab
  const products = getProducts();
  const editing = editingId ? products.find(p => p.id === editingId) : null;
  if (editingId && !editing) editingId = null;
  const v = editing || { name: "", category: "", price: "", description: "", image: "" };

  const datalist = '<datalist id="category-list">' +
    Array.from(new Set(["Electronics", "Clothing", "Accessories", "Home Essentials"].concat(getCategories())))
      .map(c => '<option value="' + esc(c) + '">').join("") + '</datalist>';

  const form = '' +
    '<form id="product-form" class="panel" novalidate>' +
      '<h3>' + (editing ? "Edit product" : "Add a new product") + '</h3>' +
      '<div class="form-row">' +
        '<div class="field"><label for="p-name">Product name *</label>' +
          '<input id="p-name" type="text" maxlength="60" value="' + esc(v.name) + '"><small class="error" data-for="p-name"></small></div>' +
        '<div class="field"><label for="p-category">Category *</label>' +
          '<input id="p-category" type="text" list="category-list" maxlength="30" value="' + esc(v.category) + '">' + datalist +
          '<small class="error" data-for="p-category"></small></div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="field"><label for="p-price">Price (' + esc(CURRENCY) + ') *</label>' +
          '<input id="p-price" type="number" step="0.01" min="0.01" value="' + esc(v.price) + '"><small class="error" data-for="p-price"></small></div>' +
        '<div class="field"><label for="p-image">Image URL (optional)</label>' +
          '<input id="p-image" type="text" placeholder="https://…" value="' + esc(v.image) + '"><small class="error" data-for="p-image"></small></div>' +
      '</div>' +
      '<div class="field"><label for="p-desc">Description *</label>' +
        '<textarea id="p-desc" maxlength="200">' + esc(v.description) + '</textarea><small class="error" data-for="p-desc"></small></div>' +
      '<div class="cart-actions">' +
        '<button type="submit" class="btn">' + (editing ? "Save changes" : "Add product") + '</button>' +
        (editing ? '<button type="button" class="btn btn-outline" data-action="admin-cancel-edit">Cancel</button>' : '') +
      '</div>' +
    '</form>';

  const rows = products.length === 0
    ? '<tr><td colspan="4">No products yet. Use the form above to add one.</td></tr>'
    : products.map(p => '' +
      '<tr>' +
        '<td><strong>' + esc(p.name) + '</strong></td>' +
        '<td>' + esc(p.category) + '</td>' +
        '<td>' + money(p.price) + '</td>' +
        '<td><div class="row-actions">' +
          '<button class="btn btn-outline btn-small" data-action="admin-edit" data-id="' + esc(p.id) + '">Edit</button>' +
          '<button class="btn btn-danger btn-small" data-action="admin-delete" data-id="' + esc(p.id) + '">Delete</button>' +
        '</div></td>' +
      '</tr>').join("");

  const table = '' +
    '<div class="panel"><h3>All products (' + products.length + ')</h3>' +
      '<div class="table-wrap"><table>' +
        '<thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Actions</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div></div>';

  const reset = '' +
    '<div class="panel"><h3>Reset demo data</h3>' +
      '<p class="muted">Deletes all products, carts and orders saved in this browser and restores the sample products.</p>' +
      '<button class="btn btn-danger btn-small" data-action="admin-reset">Reset everything</button></div>';

  app.innerHTML = '<section>' + header + form + table + reset + '</section>';
}

function saveProductForm(form) {
  const name = form.querySelector("#p-name").value.trim();
  const category = form.querySelector("#p-category").value.trim();
  const priceText = form.querySelector("#p-price").value.trim();
  const image = form.querySelector("#p-image").value.trim();
  const description = form.querySelector("#p-desc").value.trim();
  const price = Number(priceText);

  const errors = {};
  if (name.length < 2) errors["p-name"] = "Enter a product name (at least 2 characters).";
  if (category.length < 2) errors["p-category"] = "Enter a category, e.g. Electronics.";
  if (priceText === "" || !isFinite(price) || price <= 0 || price > 1000000) {
    errors["p-price"] = "Enter a price greater than 0.";
  }
  if (image !== "" && !/^https?:\/\/\S+$/i.test(image)) errors["p-image"] = "Image URL must start with http:// or https:// (or leave it empty).";
  if (description.length < 5) errors["p-desc"] = "Enter a short description (at least 5 characters).";

  if (!showErrors(form, errors)) { toast("Please fix the highlighted fields.", "error"); return; }

  const products = getProducts();
  if (editingId) {
    const p = products.find(item => item.id === editingId);
    if (!p) { toast("That product no longer exists.", "error"); editingId = null; render(false); return; }
    p.name = name; p.category = category; p.price = round2(price); p.image = image; p.description = description;
    if (saveProducts(products)) toast("Product updated");
  } else {
    products.push({ id: makeId("p"), name: name, category: category, price: round2(price), image: image, description: description });
    if (saveProducts(products)) toast("Product added");
  }
  editingId = null;
  updateCartBadge();
  render(false);
}

function deleteProduct(productId) {
  const product = getProducts().find(p => p.id === productId);
  if (!product) return;
  if (!confirm('Delete "' + product.name + '"? This cannot be undone.')) return;

  saveProducts(getProducts().filter(p => p.id !== productId));
  saveCart(getCart().filter(c => c.id !== productId));   // also remove it from the cart
  if (editingId === productId) editingId = null;
  toast("Product deleted");
  render(false);
}

function resetDemoData() {
  if (!confirm("Reset everything? All products, carts and orders in this browser will be replaced with the sample data.")) return;
  saveProducts(SAMPLE_PRODUCTS);
  saveCart([]);
  saveOrders([]);
  filters.search = ""; filters.category = "All"; editingId = null;
  toast("Demo data reset");
  render(false);
}

/* ----- Router: shows the right page for the address (#/home, #/cart, ...) ----- */

function render(scrollToTop) {
  const parts = (location.hash.replace(/^#\/?/, "") || "home").split("/");
  const page = parts[0];
  let param = "";
  try { param = decodeURIComponent(parts[1] || ""); } catch (e) { param = ""; }

  switch (page) {
    case "home":         renderCatalog(true); break;
    case "products":     renderCatalog(false); break;
    case "cart":         renderCart(); break;
    case "checkout":     renderCheckout(); break;
    case "confirmation": renderConfirmation(param); break;
    case "orders":       renderOrders(); break;
    case "admin":        renderAdmin(); break;
    default:
      app.innerHTML = '<section class="narrow"><h2>Page not found</h2>' +
        '<p class="muted">That page does not exist.</p><a class="btn" href="#/home">Go to Home</a></section>';
  }

  // Highlight the current link in the navigation bar.
  const activeRoute = (page === "checkout") ? "cart" : (page === "confirmation") ? "orders" : page;
  document.querySelectorAll(".nav a").forEach(a => {
    a.classList.toggle("active", a.dataset.route === activeRoute);
  });

  updateCartBadge();
  if (scrollToTop) window.scrollTo(0, 0);
}

/* ---------------------------------------------------------------------
   7. CLICK / FORM / CHANGE HANDLERS
   One listener per event type. Buttons say what they do with data-action.
   --------------------------------------------------------------------- */

document.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const id = button.dataset.id;

  switch (button.dataset.action) {
    case "add":               addToCart(id); break;
    case "inc":               changeQty(id, 1); break;
    case "dec":               changeQty(id, -1); break;
    case "remove":            removeFromCart(id); break;
    case "clear-cart":        clearCart(); break;
    case "clear-filters":     filters.search = ""; filters.category = "All"; render(false); break;
    case "admin-enter":       setAdminMode(true); toast("Demo admin mode is on"); render(false); break;
    case "admin-exit":        setAdminMode(false); editingId = null; toast("Demo admin mode is off"); render(false); break;
    case "admin-tab":         adminTab = button.dataset.tab; editingId = null; render(false); break;
    case "admin-edit":        editingId = id; render(false); window.scrollTo(0, 0); break;
    case "admin-cancel-edit": editingId = null; render(false); break;
    case "admin-delete":      deleteProduct(id); break;
    case "admin-reset":       resetDemoData(); break;
  }
});

document.addEventListener("submit", event => {
  event.preventDefault();                       // stop the browser from reloading the page
  if (event.target.id === "checkout-form") placeOrder(event.target);
  if (event.target.id === "product-form") saveProductForm(event.target);
});

document.addEventListener("change", event => {
  if (event.target.classList.contains("status-select")) {
    updateOrderStatus(event.target.dataset.id, event.target.value);
  }
});

// If a product image cannot be loaded, hide it so the emoji placeholder shows instead.
// (Image errors do not bubble, so we listen in the "capture" phase.)
document.addEventListener("error", event => {
  if (event.target && event.target.tagName === "IMG") event.target.style.display = "none";
}, true);

window.addEventListener("hashchange", () => render(true));

/* ---------------------------------------------------------------------
   8. START-UP
   --------------------------------------------------------------------- */

initStore();                        // add sample products on the first visit only
saveCart(getCart());                // tidy up any broken cart data (also updates the badge)
render(true);
