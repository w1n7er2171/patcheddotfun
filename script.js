/* =======================
   GLOBALS
======================= */
const modal = document.getElementById("modal");
const cartModal = document.getElementById("cartModal");
const orderModal = document.getElementById("orderModal");
const overlay = document.getElementById("overlay");

const modalImage = document.getElementById("modalImage");
const modalName = document.getElementById("modalName");
const modalDescription = document.getElementById("modalDescription");
const modalPrice = document.getElementById("modalPrice");

const openCartBtn = document.getElementById("openCart");
const checkoutBtn = document.getElementById("checkout");
const addToCartBtn = document.getElementById("addToCart");
const singleOrderBtn = document.getElementById("singleOrderBtn");
const orderPreview = document.getElementById("orderPreview");

const typeFilter = document.getElementById("typeFilter");
const subtypeFilter = document.getElementById("subtypeFilter");

let products = [];
let filteredProducts = [];
let currentProduct = null;
let cart = [];

/* =======================
   LOAD PRODUCTS
======================= */
showSkeleton();

fetch("data/products.json")
  .then(r => r.json())
  .then(data => {
    products = data.products;
    filteredProducts = products;

    populateTypeFilter();
    renderProducts();
    restoreFromHash();
    saveCart();
  });

/* =======================
   FILTERS
======================= */
function populateTypeFilter() {
  const types = [...new Set(products.map(p => p.type))];

  types.forEach(type => {
    const option = document.createElement("option");
    option.value = type;
    option.innerText = capitalize(type);
    typeFilter.appendChild(option);
  });
}

typeFilter.onchange = () => {
  const type = typeFilter.value;
  filteredProducts = type ? products.filter(p => p.type === type) : products;
  populateSubtypeFilter(type);
  renderProducts();
};

subtypeFilter.onchange = () => {
  const type = typeFilter.value;
  const sub = subtypeFilter.value;

  filteredProducts = products.filter(p =>
    p.type === type && (!sub || p.subtype === sub)
  );

  renderProducts();
};

function populateSubtypeFilter(type) {
  subtypeFilter.innerHTML = `<option value="">Всі підтипи</option>`;
  if (!type) return;

  const subs = [...new Set(products.filter(p => p.type === type).map(p => p.subtype))];
  subs.forEach(s => {
    const o = document.createElement("option");
    o.value = s;
    o.innerText = capitalize(s);
    subtypeFilter.appendChild(o);
  });
}

/* =======================
   PRODUCTS
======================= */
function renderProducts() {
  ["productsPreorder", "productsInStock", "productsOutStock"].forEach(id => {
    document.getElementById(id).innerHTML = "";
  });

  filteredProducts.forEach(p => {
    const div = document.createElement("div");
    div.className = "product";
    if (p.status === "out_of_stock") div.classList.add("out-of-stock");

    const isLow = p.status === "low_stock";

      div.innerHTML = `
        <img src="${p.image}">
        ${isLow ? `<span class="badge-low">Закінчується</span>` : ""}
        <h3>${p.name}</h3>
        <p>${p.price.toLocaleString("uk-UA")} грн</p>
      `;


    div.onclick = () => openModal(p);

    const target =
      p.status === "preorder"
        ? "productsPreorder"
        : p.status === "out_of_stock"
        ? "productsOutStock"
        : "productsInStock";

    document.getElementById(target).appendChild(div);
  });
}

/* =======================
   MODAL
======================= */
function openModal(product) {
  currentProduct = product;

  modal.classList.remove("hidden");
  overlay.classList.remove("hidden");

  modalImage.src = product.image || "";
  modalName.innerText = product.name;
  modalDescription.innerText = product.description || "";
  modalPrice.innerText = product.price + " грн";
   
  const lowStockEl = document.getElementById("modalLowStock");

   if (lowStockEl) {
     if (product.status === "low_stock") {
       lowStockEl.classList.remove("hidden");
     } else {
       lowStockEl.classList.add("hidden");
     }
   }
   

  const sizeWrapper = document.getElementById("sizeWrapper");
  const sizeSelect = document.getElementById("sizeSelect");
  sizeSelect.innerHTML = "";

  if (product.sizes?.length) {
    sizeWrapper.style.display = "block";
    sizeSelect.innerHTML = `<option value="">Оберіть розмір</option>`;
    product.sizes.forEach(s => {
      sizeSelect.innerHTML += `<option value="${s}">${s}</option>`;
    });
  } else {
    sizeWrapper.style.display = "none";
  }
   
  const isOut = product.status === "out_of_stock";
  addToCartBtn.disabled = isOut;
  addToCartBtn.innerText = isOut ? "Товар закінчився" : "Додати в кошик";
  addToCartBtn.classList.toggle("out-of-stock-btn", isOut);

  requestAnimationFrame(() => {
    modal.classList.add("show");
    overlay.classList.add("show");
  });

  document.body.style.overflow = "hidden";
}

function closeModal() {
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
   CART LOGIC
======================= */
function addToCart(product, size) {
  if (product.status === "out_of_stock") return;

  const item = cart.find(i => i.id === product.id && i.size === size);
  if (item) item.qty++;
  else cart.push({ id: product.id, size, qty: 1 });

  saveCart();
}

addToCartBtn.onclick = () => {
  if (!currentProduct) return;
  if (currentProduct.status === "out_of_stock") return;

  const size = document.getElementById("sizeSelect").value;

  if (currentProduct.sizes?.length && !size) {
    alert("Оберіть розмір");
    return;
  }

  addToCart(currentProduct, size);
  closeModal();
};

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
       <div class="cart-item-left">
         <div class="cart-item-info">
           <img src="${product.image}" alt="${product.name}">
           <div>
             <strong>${product.name}</strong>
             ${item.size ? `<span class="cart-size">Розмір: ${item.size}</span>` : ""}
           </div>
         </div>

         <button class="qty-btn" onclick="changeQty('${item.id}', '${item.size}', -1)">−</button>

         <input
           class="qty-input"
           type="number"
           min="1"
           value="${item.qty}"
           onchange="setQty('${item.id}', '${item.size}', this.value)"
         />

         <button class="qty-btn" onclick="changeQty('${item.id}', '${item.size}', 1)">+</button>

         <button class="remove-btn" onclick="removeFromCart('${item.id}', '${item.size}')">×</button>
       </div>
     </div>
    `;
  });

  document.getElementById("cartTotal").innerText =
    total.toLocaleString("uk-UA");
}

function setQty(id, size, value) {
  const qty = parseInt(value);
  if (!qty || qty <= 0) {
    removeFromCart(id, size);
    return;
  }

  const item = cart.find(i => i.id === id && i.size === size);
  if (!item) return;

  item.qty = qty;
  saveCart();
}

function changeQty(id, size, delta) {
  const item = cart.find(i => i.id === id && i.size === size);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(id, size);
    return;
  }

  saveCart();
}

function removeFromCart(id, size) {
  cart = cart.filter(i => !(i.id === id && i.size === size));
  saveCart();
}

function saveCart() {
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
    overlay.classList.add("hidden");
  }, 250);

  document.body.style.overflow = "";
}

/* =======================
   ORDER MODAL
======================= */
checkoutBtn.onclick = () => {
  if (!cart.length) return;

  // Скидаємо стан кнопки перед показом модалки
  singleOrderBtn.innerText = "Скопіювати та замовити";
  singleOrderBtn.style.backgroundColor = ""; // повертаємо колір до оригінального

  // Формуємо код для бота
  const rawData = cart.map(item => {
    const s = item.size ? item.size.replace(/\s+/g, '') : 'N';
    return `${item.id}:${s}:${item.qty}`;
  }).join('|');
  const textToCopy = `ORDER[${rawData}]`;

  // Прев’ю для користувача
  let previewText = `🛒 Ваше замовлення:\n`;
  cart.forEach(item => {
    const product = products.find(p => p.id === item.id);
    previewText += `• ${product ? product.name : item.id} ${item.size ? `[${item.size}]` : ''} — ${item.qty} шт.\n`;
  });

  orderPreview.innerText = previewText;

  cartModal.classList.remove("show");
  setTimeout(() => {
    cartModal.classList.add("hidden");
    orderModal.classList.remove("hidden");
    requestAnimationFrame(() => orderModal.classList.add("show"));
  }, 200);

  singleOrderBtn.onclick = () => {
    navigator.clipboard.writeText(textToCopy).catch(() => {});
    const tgWindow = window.open(`https://t.me/patcheddotfunbot`, "_blank");
    if (!tgWindow) location.href = `https://t.me/patcheddotfunbot`;

    cart = [];
    saveCart();

    orderModal.classList.remove("show");
    orderModal.classList.add("hidden");
    hideOverlayIfNoModal();

    singleOrderBtn.innerText = "✅ Скопійовано! Переходимо...";
    singleOrderBtn.style.backgroundColor = "#28a745";
  };
};

/* =======================
   UTILS
======================= */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function showSkeleton() {}
function restoreFromHash() {}
function hideOverlayIfNoModal() {
  const modalOpen = modal.classList.contains("show");
  const cartOpen = cartModal.classList.contains("show");
  const orderOpen = orderModal.classList.contains("show"); // додано

  if (!modalOpen && !cartOpen && !orderOpen) {
    overlay.classList.remove("show");
    setTimeout(() => {
      overlay.classList.add("hidden");
    }, 250);
  }
}
