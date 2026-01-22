const productsEl = document.getElementById("products");
const modal = document.getElementById("modal");
const cartModal = document.getElementById("cartModal");
const overlay = document.getElementById("overlay");

const openCartBtn = document.getElementById("openCart");
const checkoutBtn = document.getElementById("checkout");

const typeFilter = document.getElementById("typeFilter");
const subtypeFilter = document.getElementById("subtypeFilter");

let products = [];
let filteredProducts = [];
let currentProduct = null;
let cart = []; // ← тепер завжди чиста корзина при перезавантаженні

/* =======================
   LOAD PRODUCTS
======================= */
showSkeleton();

fetch("data/products.json")
  .then(r => r.json())
  .then(data => {
    products = data.products;
    filteredProducts = products; // важливо
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
    const count = products.filter(p => p.type === type).length;

    const option = document.createElement("option");
    option.value = type;
    option.innerText = `${capitalize(type)} (${count})`;
    typeFilter.appendChild(option);
  });
}

document.getElementById("resetFilters").onclick = () => {
  typeFilter.value = "";
  subtypeFilter.value = "";
  subtypeFilter.disabled = true;

  filteredProducts = products;
  renderProducts();
};

function populateSubtypeFilter(type) {
  subtypeFilter.innerHTML = `<option value="">Всі підтипи</option>`;

  const subtypes = [...new Set(
    products
      .filter(p => p.type === type)
      .map(p => p.subtype)
  )];

  subtypes.forEach(sub => {
    const option = document.createElement("option");
    option.value = sub;
    option.innerText = capitalize(sub);
    subtypeFilter.appendChild(option);
  });

  subtypeFilter.disabled = subtypes.length === 0;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

typeFilter.onchange = () => {
  const type = typeFilter.value;

  if (!type) {
    filteredProducts = products;
    subtypeFilter.disabled = true;
    subtypeFilter.value = "";
  } else {
    filteredProducts = products.filter(p => p.type === type);
    populateSubtypeFilter(type);
  }

  renderProducts();
};

subtypeFilter.onchange = () => {
  const type = typeFilter.value;
  const subtype = subtypeFilter.value;

  if (!subtype) {
    filteredProducts = products.filter(p => p.type === type);
  } else {
    filteredProducts = products.filter(p => p.type === type && p.subtype === subtype);
  }

  renderProducts();
}

/* =======================
   PRODUCTS (with sections)
======================= */
function renderProducts() {
  const preorderEl = document.getElementById("productsPreorder");
  const inStockEl = document.getElementById("productsInStock");
  const outStockEl = document.getElementById("productsOutStock");

  preorderEl.innerHTML = "";
  inStockEl.innerHTML = "";
  outStockEl.innerHTML = "";

  // render only filteredProducts
  filteredProducts.forEach(p => {
    const div = document.createElement("div");
    div.className = "product";

    if (p.status === "out_of_stock") {
      div.classList.add("out-of-stock");
    }

    div.innerHTML = `
      <img src="${p.image}">
      <h3>${p.name}</h3>
      <p>${p.price.toLocaleString("uk-UA")} грн</p>
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

  // якщо секція пуста — показати текст
  if (preorderEl.children.length === 0) {
    preorderEl.innerHTML = `<p class="empty-text">Товари відсутні</p>`;
  }
  if (inStockEl.children.length === 0) {
    inStockEl.innerHTML = `<p class="empty-text">Товари відсутні</p>`;
  }
  if (outStockEl.children.length === 0) {
    outStockEl.innerHTML = `<p class="empty-text">Товари відсутні</p>`;
  }
}

function showSkeleton() {
  const sections = ["productsPreorder", "productsInStock", "productsOutStock"];
  sections.forEach(id => {
    const el = document.getElementById(id);
    el.innerHTML = `
      <div class="skeleton"></div>
      <div class="skeleton"></div>
      <div class="skeleton"></div>
    `;
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
  btn.innerText = btn.disabled ? "Немає в наявності" : "Додати в кошик";

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
   
         <div class="cart-item-info">
           <img src="${product.image}" alt="${product.name}">
           <strong>${product.name}</strong>
         </div>
   
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
   
       <div class="cart-item-price">
         = ${formattedSum} грн
       </div>
   
       <button class="remove-btn" onclick="removeFromCart('${item.id}')">×</button>
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
