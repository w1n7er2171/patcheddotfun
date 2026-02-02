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
  .then(r => {
    if (!r.ok) throw new Error("HTTP error " + r.status);
    return r.json();
  })
  .then(data => {
    products = data.products;
    filteredProducts = products;

    populateTypeFilter();
    renderProducts();
    restoreFromHash();
    saveCart();
  })
  .catch(err => {
    console.error("Failed to load products.json:", err);
    showError("Не вдалося завантажити товари. Перевір products.json.");
  });

function showError(message) {
  const preorderEl = document.getElementById("productsPreorder");
  const inStockEl = document.getElementById("productsInStock");
  const outStockEl = document.getElementById("productsOutStock");

  preorderEl.innerHTML = `<p class="error-text">${message}</p>`;
  inStockEl.innerHTML = `<p class="error-text">${message}</p>`;
  outStockEl.innerHTML = `<p class="error-text">${message}</p>`;
}
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
  console.log(product.id, product.sizes);
  history.pushState(null, "", `#${product.id}`);
  currentProduct = product;

  modal.classList.remove("hidden");
  overlay.classList.remove("hidden");

   modal.classList.toggle(
     "out-of-stock",
     product.status === "out_of_stock"
   );


  requestAnimationFrame(() => {
    modal.classList.add("show");
    overlay.classList.add("show");
  });

  // контент
  modalImage.src = product.image || "";
  modalName.innerText = product.name;
  modalDescription.innerText = product.description;
  modalPrice.innerText = product.price + " грн";
  modalStatus.innerText =
    product.status === "low_stock"
      ? "Закінчується"
      : product.status === "out_of_stock"
      ? "Немає в наявності"
      : "В наявності";

  // ⬇️ РОЗМІРИ — ТІЛЬКИ ТУТ
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

  // кнопка
  const isOut = product.status === "out_of_stock";

  addToCart.disabled = isOut;
  addToCart.innerText = isOut
    ? "Товар закінчився"
    : "Додати в кошик";

  addToCart.classList.toggle("out-of-stock-btn", isOut);


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

  hideOverlayIfNoModal();
}

document.getElementById("closeModal").onclick = closeModal;

/* =======================
   CART
======================= */
function addToCart(product, size = null) {
  const item = cart.find(i => i.id === product.id && i.size === size);

  if (item) item.qty++;
  else cart.push({ id: product.id, size, qty: 1 });

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
    `;
  });

  document.getElementById("cartTotal").innerText = total.toLocaleString("uk-UA");
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
  hideOverlayIfNoModal();
}

/* overlay закриває все */
overlay.onclick = () => {
  if (modal.classList.contains("show")) closeModal();
  if (cartModal.classList.contains("show")) closeCart();
};


function hideOverlayIfNoModal() {
  const modalOpen = modal.classList.contains("show");
  const cartOpen = cartModal.classList.contains("show");

  if (!modalOpen && !cartOpen) {
    overlay.classList.remove("show");
    setTimeout(() => {
      overlay.classList.add("hidden");
    }, 250);
  }
}


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
   
  const size = document.getElementById("sizeSelect").value;

  // якщо потрібен розмір, але не вибрано — не додаємо
  if (currentProduct.sizes && currentProduct.sizes.length > 0 && !size) {
    alert("Оберіть розмір");
    return;
  }

  addToCart(currentProduct, size);
  closeModal();
};


/* =======================
   ORDER CONFIRMATION LOGIC
======================= */
const orderModal = document.getElementById("orderModal");
const orderPreview = document.getElementById("orderPreview");
const singleOrderBtn = document.getElementById("singleOrderBtn");

checkoutBtn.onclick = () => {
  if (!cart.length) return;

  // 1. Формуємо "технічний код" для бота (без зайвих слів)
  // Формат: [ID:Розмір:Кількість|...]
  const rawData = cart.map(item => {
    const s = item.size ? item.size.replace(/\s+/g, '') : 'N';
    return `${item.id}:${s}:${item.qty}`;
  }).join('|');

  const textToCopy = `ORDER[${rawData}]`;

  // 2. Людський текст для прев'ю в модалці
  let previewText = `🛒 Ваше замовлення:\n`;
  cart.forEach(item => {
    const product = products.find(p => p.id === item.id);
    previewText += `• ${product ? product.name : item.id} ${item.size ? `[${item.size}]` : ''} — ${item.qty} шт.\n`;
  });

  orderPreview.innerText = previewText;
  
  // Закриваємо кошик і показуємо модалку замовлення
  cartModal.classList.remove("show");
  setTimeout(() => {
    cartModal.classList.add("hidden");
    orderModal.classList.remove("hidden");
    requestAnimationFrame(() => orderModal.classList.add("show"));
  }, 200);

  // 3. Кнопка "Скопіювати та замовити"
  singleOrderBtn.onclick = () => {
    // 1. Копіюємо текст (без await, щоб не переривати потік)
    navigator.clipboard.writeText(textToCopy).then(() => {
      console.log("Код скопійовано");
    }).catch(err => {
      console.error("Помилка копіювання:", err);
    });

    // 2. МИТТЄВО відкриваємо Telegram (це не заблокує браузер)
    const tgWindow = window.open(`https://t.me/patcheddotfunbot`, "_blank");

    // 3. Якщо вікно все ж не відкрилося (блокувальник реклами)
    if (!tgWindow) {
      location.href = `https://t.me/patcheddotfunbot`; // Відкриваємо в тій же вкладці як запасний варіант
    }

    // 4. Очищаємо кошик та закриваємо модалку
    cart = [];
    saveCart();
    closeModal();
    orderModal.classList.remove("show");
    orderModal.classList.add("hidden");
    
    // Візуальний фідбек перед тим як користувач піде
    singleOrderBtn.innerText = "✅ Скопійовано! Переходимо...";
    singleOrderBtn.style.backgroundColor = "#28a745";

    // Закриваємо модалку через мить
    setTimeout(() => {
      closeOrderModalFunc();
    }, 500);
  };
};
/* =======================
   TELEGRAM
======================= 
checkoutBtn.onclick = () => {
  if (!cart.length) return;*/

  /*const order = {
    items: cart.map(i => ({
      id: i.id,
      qty: i.qty,
      size: i.size || null
    })),
    ts: Date.now()
  };

  const payload = btoa(
    encodeURIComponent(JSON.stringify(order))
  );

  window.open(
    `https://t.me/patcheddotfunbot?start=${payload}`,
    "_blank"
  );

   // 1. Формуємо текст замовлення (красивий, зрозумілий людині)
  let orderText = `Прошу прийняти замовлення:\n`;
  cart.forEach(item => {
    orderText += `• ${item.id} [${item.size || '?'}] — ${item.qty} шт.\n`;
  });
  
  // 2. Кодуємо текст для URL
  const encodedText = encodeURIComponent(orderText);
  const botUsername = 'patcheddotfunbot';

  // 3. Відкриваємо вікно "Share"
  // Воно запропонує вибрати чат. Користувач вибере вашого бота.
  window.open(
    `https://t.me/share/url?url=https://t.me/${botUsername}&text=${encodedText}`,
    "_blank"
  );

  // Очищаємо корзину після замовлення
  cart = [];
  saveCart();
};*/
