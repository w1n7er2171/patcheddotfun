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
  const preorderEl = document.getElementById("productsPreorder");
  const inStockEl = document.getElementById("productsInStock");
  const outStockEl = document.getElementById("productsOutStock");

  preorderEl.innerHTML = "";
  inStockEl.innerHTML = "";
  outStockEl.innerHTML = "";

  products.forEach(p => {
    const div = document.createElement("div");
    div.className = "product";

    div.innerHTML = `
      <img src="${p.image}">
      <h3>${p.name}</h3>
      <p>${p.price} грн</p>
      ${p.status === "low_stock" ? '<p class="status-low">Закінчується</p>' : ''}
    `;

    div.onclick = () => openModal(p);

    if (p.status === "preorder") {
      preorderEl.appendChild(div);
    } else if (p.status === "out_of_stock") {
      outStockEl.appendChild(div);
    } else {
      inStockEl.appendChild(div);
    }
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

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
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
    const formattedSum = sum.toLocaleString("uk-UA");
    total += sum;

    el.innerHTML += `
     <div class="cart-item">
       <div class="cart-item-left">
         <strong>${product.name}</strong>
   
         <button class="qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
         <input
           class="qty-input"
           type="number"
           min="1"
           value="${item.qty}"
           onchange="setQty('${item.id}', this.value)"
         />
         <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
       </div>
   
       <div class="cart-item-price">= ${formattedSum} грн</div>
   
       <button class="remove-btn" onclick="removeFromCart('${item.id}')">x</button>
     </div>
    `;
  });

  document.getElementById("cartTotal").innerText = total.toLocaleString("uk-UA");
}

function setQty(id, value) {
  const qty = parseInt(value);

  if (!qty || qty <= 0) {
    removeFromCart(id);
    return;
  }

  const item = cart.find(i => i.id === id);
  if (!item) return;

  item.qty = qty;
  saveCart();
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.id !== id);
  }
  saveCart();
}

function saveCart() {
 // Зберігаємо в localStorage тільки для поточного сеансу
  sessionStorage.setItem("cart", JSON.stringify(cart));
  renderCart();

  const count = cart.reduce((acc, item) => acc + item.qty, 0);
  document.getElementById("cartCount").innerText = count;

  openCartBtn.classList.toggle("hidden", cart.length === 0);
}

/* =======================
   CART MODAL
======================= */
openCartBtn.onclick = () => {
  cartModal.classList.remove("hidden");
  overlay.classList.remove("hidden");

  requestAnimationFrame(() => {
    cartModal.classList.add("show");
    overlay.classList.add("show");
  });

  renderCart();
  document.body.style.overflow = "hidden";
};

document.getElementById("closeCart").onclick = closeCart;

function closeCart() {
  cartModal.classList.remove("show");
  overlay.classList.remove("show");

  setTimeout(() => {
    cartModal.classList.add("hidden");
  }, 250);

  document.body.style.overflow = "";
}

/* overlay закриває все */
overlay.onclick = () => {
  closeModal();
  closeCart();
};

/* =======================
   HASH OPEN
======================= */
function restoreFromHash() {
  const id = location.hash.replace("#", "");
  if (!id) return;

  const product = products.find(p => p.id === id);
  if (product) openModal(product);
}

/* =======================
   BUTTONS
======================= */
document.getElementById("addToCart").onclick = () => {
  if (!currentProduct) return;
  addToCart(currentProduct);
  closeModal();
};

/* =======================
   TELEGRAM
======================= */
checkoutBtn.onclick = () => {
  const payload = btoa(JSON.stringify({ items: cart }));
  window.open(
    `https://t.me/patcheddotfunbot?start=${payload}`,
    "_blank"
  );

  // Очищаємо корзину після замовлення
  cart = [];
  saveCart();
};
