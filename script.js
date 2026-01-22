const productsEl = document.getElementById("products");
const modal = document.getElementById("modal");
const cartModal = document.getElementById("cartModal");
const overlay = document.getElementById("overlay");

const openCartBtn = document.getElementById("openCart");
const checkoutBtn = document.getElementById("checkout");

let products = [];
let currentProduct = null;
let cart = []; // ← тепер завжди чиста корзина при перезавантаженні

/* =======================
   LOAD PRODUCTS
======================= */
fetch("data/products.json")
  .then(r => r.json())
  .then(data => {
    products = data.products;
    renderProducts();
    restoreFromHash();
    saveCart(); // синхронізація кнопки корзини
  });

/* =======================
   PRODUCTS
======================= */
function renderProducts() {
  productsEl.innerHTML = "";

  products.forEach(p => {
    const div = document.createElement("div");
    div.className = "product";

    if (p.status === "out_of_stock") {
      div.classList.add("status-out");
    }

    div.innerHTML = `
      <img src="${p.image}">
      <h3>${p.name}</h3>
      <p>${p.price} грн</p>
      ${p.status === "low_stock" ? '<p class="status-low">Закінчується</p>' : ''}
    `;

    div.onclick = () => openModal(p);
    productsEl.appendChild(div);
  });
}

/* =======================
   PRODUCT MODAL
======================= */
function openModal(product) {
  history.pushState(null, "", `#${product.id}`);
  currentProduct = product;

  modal.classList.remove("hidden");
  overlay.classList.remove("hidden");

  requestAnimationFrame(() => {
    modal.classList.add("show");
    overlay.classList.add("show");
  });

  document.getElementById("modalImage").src = product.image;
  document.getElementById("modalName").innerText = product.name;
  document.getElementById("modalDescription").innerText = product.description;
  document.getElementById("modalPrice").innerText = product.price + " грн";
  document.getElementById("modalStatus").innerText =
    product.status === "low_stock"
      ? "Закінчується"
      : product.status === "out_of_stock"
      ? "Немає в наявності"
      : "В наявності";

  const btn = document.getElementById("addToCart");
  btn.disabled = product.status === "out_of_stock";
  btn.innerText = btn.disabled ? "Немає в наявності" : "Додати в корзину";

  document.body.style.overflow = "hidden";
}

function closeModal() {
  history.pushState(null, "", location.pathname);

  modal.classList.remove("show");
  overlay.classList.remove("show");

  setTimeout(() => {
    modal.classList.add("hidden");
    overlay.classList.add("hidden");
  }, 250);

  document.body.style.overflow = "";
}

document.getElementById("closeModal").onclick = closeModal;

/* =======================
   CART
======================= */
function addToCart(product) {
  const item = cart.find(i => i.id === product.id);
  if (item) {
    item.qty++;
  } else {
    cart.push({ id: product.id, qty: 1 });
  }
  saveCart();
}

function renderCart() {
  const el = document.getElementById("cartItems");
  el.innerHTML = "";
  let total = 0;

  cart.forEach(item => {
    const product = products.find(p => p.id === item.id);
    if (!product) return;

    const sum = product.price * item.qty;
    total += sum;

    el.innerHTML += `
      <div class="cart-item">
        <strong>${product.name}</strong><br>
        <button onclick="changeQty('${item.id}', -1)">−</button>
        ${item.qty}
        <button onclick="changeQty('${item.id}', 1)">+</button>
        = ${sum} грн
      </div>
    `;
  });

  document.getElementById("cartTotal").innerText = total;
}

function changeQty(id, delta) {
  const item = cart.f
