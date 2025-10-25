// =====================
// Variáveis principais
// =====================
const menu = document.getElementById("menu");
const cartBtn = document.getElementById("cart-btn");
const cartModal = document.getElementById("cart-modal");
const cartItemsContainer = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");
const checkoutBtn = document.getElementById("checkout-btn");
const closeModalBtn = document.getElementById("close-modal-btn");
const cartCounter = document.getElementById("cart-count");
const addressWarn = document.getElementById("address-warn");

// Cliente
const customerNameInput = document.getElementById("customer-name");
const customerPhoneInput = document.getElementById("customer-phone");
const nameWarn = document.getElementById("name-warn");
const phoneWarn = document.getElementById("phone-warn");

// Pagamento / PIX
const paymentWarn = document.getElementById("payment-warn");
const pixKeyContainer = document.getElementById("pix-key-container");
const changeContainer = document.getElementById("change-container");
const paymentMethods = document.getElementsByName("payment");
const pixKeyText = document.getElementById("pix-key");
const copyPixBtn = document.getElementById("copy-pix-btn");
const pixQrContainer = document.getElementById("pix-qrcode-container");
const pixTimerEl = document.getElementById("pix-timer");
const confirmPixBtn = document.getElementById("confirm-pix-btn");
const changeForInput = document.getElementById("change-for");

// Entrega
const deliveryTypeRadios = document.getElementsByName("delivery-type");
const addressSection = document.getElementById("address-section");
const streetInput = document.getElementById("street");
const neighborhoodInput = document.getElementById("neighborhood");
const numberInput = document.getElementById("number");
const observationsInput = document.getElementById("observations");

// Header status
const headerStatus = document.getElementById("header-status");

let cart = [];
let currentGeneratedPixRef = "";
let pixTimerInterval = null;
let pixConfirmed = false;

// Chave PIX fixa
const RECEIVER_PIX_KEY = "hauankawai@gmail.com";

// =====================
// Funções utilitárias
// =====================
function currencyBRL(value) {
  return value.toLocaleString("pt-br", { style: "currency", currency: "BRL" });
}

function getSelectedPaymentMethod() {
  for (const pm of paymentMethods) if (pm.checked) return pm.value;
  return null;
}

function getSelectedDeliveryType() {
  for (const r of deliveryTypeRadios) if (r.checked) return r.value;
  return "retirada";
}

// =====================
// Carrinho / modal
// =====================
cartBtn.addEventListener("click", () => {
  updateCartModal();
  cartModal.style.display = "flex";
  document.body.classList.add("body-no-scroll");
});

closeModalBtn.addEventListener("click", () => {
  cartModal.style.display = "none";
  document.body.classList.remove("body-no-scroll");
});

cartModal.addEventListener("click", (e) => {
  if (e.target === cartModal) {
    cartModal.style.display = "none";
    document.body.classList.remove("body-no-scroll");
  }
});

menu.addEventListener("click", (e) => {
  const btn = e.target.closest(".add-to-cart-btn");
  if (!btn) return;
  const name = btn.getAttribute("data-name");
  const price = parseFloat(btn.getAttribute("data-price"));
  addToCart(name, price);
});

function addToCart(name, price) {
  const ex = cart.find(i => i.name === name);
  if (ex) ex.quantity++;
  else cart.push({ name, price, quantity: 1 });

  Toastify({ text: "Item adicionado ao carrinho!", duration: 2000, gravity: "top", position: "right", style: { background: "linear-gradient(to right, #4caf50,#81c784)" } }).showToast();
  updateCartModal();
}

function updateCartModal() {
  cartItemsContainer.innerHTML = "";
  let total = 0;
  cart.forEach(item => {
    const div = document.createElement("div");
    div.className = "flex justify-between mb-4 flex-col";
    div.innerHTML = `
      <div class="flex items-center justify-between w-full">
        <div>
          <p class="font-medium">${item.name}</p>
          <p>Qtd: ${item.quantity}</p>
          <p class="font-medium mt-2">${currencyBRL(item.price)}</p>
        </div>
        <div class="flex gap-2">
          <button class="decrease-qty-btn" data-name="${item.name}">-</button>
          <button class="increase-qty-btn" data-name="${item.name}">+</button>
          <button class="remove-from-cart-btn" data-name="${item.name}">Remover</button>
        </div>
      </div>
    `;
    total += item.price * item.quantity;
    cartItemsContainer.appendChild(div);
  });
  cartTotal.textContent = total.toLocaleString("pt-br", { style: "currency", currency: "BRL" });
  cartCounter.textContent = cart.reduce((a, b) => a + b.quantity, 0);

  pixConfirmed = false;
  invalidatePixRef();
}

cartItemsContainer.addEventListener("click", (e) => {
  const name = e.target.getAttribute("data-name");
  if (!name) return;
  if (e.target.classList.contains("remove-from-cart-btn")) removeItemCart(name);
  if (e.target.classList.contains("decrease-qty-btn")) changeItemQuantity(name, -1);
  if (e.target.classList.contains("increase-qty-btn")) changeItemQuantity(name, +1);
});

function changeItemQuantity(name, delta) {
  const idx = cart.findIndex(i => i.name === name);
  if (idx === -1) return;
  cart[idx].quantity += delta;
  if (cart[idx].quantity <= 0) cart.splice(idx, 1);
  updateCartModal();
}
function removeItemCart(name) {
  const idx = cart.findIndex(i => i.name === name);
  if (idx !== -1) { cart.splice(idx, 1); updateCartModal(); }
}

// =====================
// PIX UI / Confirmação de pagamento
// =====================
function handlePaymentUIChange() {
  const sel = getSelectedPaymentMethod();
  paymentWarn.classList.add("hidden");

  if (sel === "Pix") {
    pixKeyContainer.classList.remove("hidden");
    changeContainer.classList.add("hidden");
    showPixUI();
  } else if (sel === "Dinheiro") {
    changeContainer.classList.remove("hidden");
    pixKeyContainer.classList.add("hidden");
    invalidatePixRef();
  } else { // Cartão
    pixKeyContainer.classList.add("hidden");
    changeContainer.classList.add("hidden");
    invalidatePixRef();
  }
}

paymentMethods.forEach(pm => pm.addEventListener("change", handlePaymentUIChange));

function showPixUI() {
  const total = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);

  if (total <= 0) {
    pixQrContainer.innerHTML = `<p class="text-red-600">Adicione itens ao carrinho para gerar pagamento.</p>`;
    pixKeyText.textContent = "--";
    return;
  }

  pixKeyText.textContent = RECEIVER_PIX_KEY;

  pixQrContainer.innerHTML = `
    <div class="text-center">
      <p class="font-medium text-lg mb-2">Chave PIX:</p>
      <p class="break-all select-all text-xl font-semibold mb-2">${RECEIVER_PIX_KEY}</p>
      <p class="mt-2 mb-4 text-lg">Valor: <strong>${currencyBRL(total)}</strong></p>
    </div>
  `;

  confirmPixBtn.classList.remove("hidden");

  const oldMsg = document.getElementById("pix-confirm-msg");
  if (oldMsg) oldMsg.remove();

  pixConfirmed = false;
  currentGeneratedPixRef = generatePaymentRef(total);
}

confirmPixBtn.addEventListener("click", () => {
  if (!cart.length) {
    Toastify({ text: "Carrinho vazio.", duration: 2500, style: { background: "#ef4444" } }).showToast();
    return;
  }

  pixConfirmed = true;

  Toastify({
    text: "Pagamento confirmado!",
    duration: 3000,
    style: { background: "#10b981" }
  }).showToast();

  let msg = document.getElementById("pix-confirm-msg");
  if (!msg) {
    msg = document.createElement("p");
    msg.id = "pix-confirm-msg";
    msg.className = "mt-2 text-sm text-gray-700";
    confirmPixBtn.insertAdjacentElement("afterend", msg);
  }
  msg.textContent = "Após finalizar o pedido, envie o comprovante em nosso WhatsApp para que possamos confirmar rapidamente.";
});

function invalidatePixRef() {
  currentGeneratedPixRef = "";
  pixKeyText.textContent = "--";
  pixQrContainer.innerHTML = "";
  pixTimerEl.classList.add("hidden");
  confirmPixBtn.classList.add("hidden");
  const oldMsg = document.getElementById("pix-confirm-msg");
  if (oldMsg) oldMsg.remove();
  pixConfirmed = false;
}

// =====================
// Header status
// =====================
function checkRestaurantOpen() {
  const data = new Date();
  const dia = data.getDay();
  const minAtual = data.getHours() * 60 + data.getMinutes();
  const diasAbertos = [3, 5, 6, 2, 4];
  if (!diasAbertos.includes(dia)) return false;
  return minAtual >= 8 * 60 && minAtual <= 23 * 60 + 59;
}

function updateHeaderStatus() {
  if (!headerStatus) return;
  const open = checkRestaurantOpen();
  if (open) {
    headerStatus.textContent = "Aberto agora - Quarta, Sexta e Sábado: 19:00 às 23:30";
    headerStatus.classList.remove("bg-red-500"); headerStatus.classList.add("bg-green-500");
  } else {
    headerStatus.textContent = "Fechado no momento - Quarta, Sexta e Sábado: 19:00 às 23:30";
    headerStatus.classList.remove("bg-green-500"); headerStatus.classList.add("bg-red-500");
  }
}
updateHeaderStatus();
setInterval(updateHeaderStatus, 60000);

// =====================
// Entrega UI
// =====================
deliveryTypeRadios.forEach(r => r.addEventListener("change", () => {
  if (getSelectedDeliveryType() === "entrega") addressSection.classList.remove("hidden");
  else addressSection.classList.add("hidden");
}));

// =====================
// Checkout / enviar pedido para WhatsApp
// =====================
checkoutBtn.addEventListener("click", () => {
  if (!checkRestaurantOpen()) {
    Toastify({ text: "Lanchonete fechada!", duration: 2500, style: { background: "#ef4444" } }).showToast();
    return;
  }
  if (!cart.length) { Toastify({ text: "Carrinho vazio.", duration: 2500 }).showToast(); return; }
  if (!customerNameInput.value.trim()) { nameWarn.classList.remove("hidden"); return; }
  if (!/^\d{8,15}$/.test(customerPhoneInput.value.trim())) { phoneWarn.classList.remove("hidden"); return; }

  const deliveryType = getSelectedDeliveryType();
  if (deliveryType === "entrega" && (!streetInput.value.trim() || !neighborhoodInput.value.trim() || !numberInput.value.trim())) {
    addressWarn.classList.remove("hidden"); return;
  }
  addressWarn.classList.add("hidden");

  const paymentMethod = getSelectedPaymentMethod();
  if (!paymentMethod) { paymentWarn.classList.remove("hidden"); return; }

  const total = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);

  if (paymentMethod === "Pix" && !pixConfirmed) {
    Toastify({ text: "Pague e confirme o Pix antes de finalizar.", duration: 3000, style: { background: "#f59e0b" } }).showToast();
    return;
  }

  if (paymentMethod === "Dinheiro") {
    const trocoValor = parseFloat(changeForInput.value);
    if (isNaN(trocoValor) || trocoValor < total) {
      Toastify({ text: "Troco inválido! O valor deve ser maior que o total do pedido.", duration: 3000, style: { background: "#ef4444" } }).showToast();
      return;
    }
  }

  let textoPedido = `📦 *Novo Pedido*\n\n`;
  textoPedido += `👤 Cliente: ${customerNameInput.value.trim()}\n`;
  textoPedido += `📱 Telefone: ${customerPhoneInput.value.trim()}\n`;
  textoPedido += `🚚 Tipo de entrega: ${deliveryType}\n`;
  if (deliveryType === "entrega") {
    textoPedido += `🏠 Endereço: ${streetInput.value.trim()}, ${numberInput.value.trim()}, ${neighborhoodInput.value.trim()}\n`;
  }
  textoPedido += `💰 Pagamento: ${paymentMethod}\n`;
  if (paymentMethod === "Pix") {
    textoPedido += `💵 Valor: ${currencyBRL(total)}\n`;
  }
  if (paymentMethod === "Dinheiro") {
    textoPedido += `💵 Troco para: ${currencyBRL(parseFloat(changeForInput.value))}\n`;
  }
  textoPedido += `📝 Observações: ${observationsInput.value.trim() || "Nenhuma"}\n\n`;
  textoPedido += `🛒 Itens:\n`;
  cart.forEach(i => {
    textoPedido += `- ${i.name} x${i.quantity} (${currencyBRL(i.price * i.quantity)})\n`;
  });
  textoPedido += `\n💵 Total: ${currencyBRL(total)}`;

  // const whatsappNumber = "5544999038033"; // seu número
  // const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(textoPedido)}`;
  // window.open(whatsappURL, "_blank");
  fetch("http://localhost:3001/api/pedidos", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    customer_name: customerNameInput.value.trim(),
    customer_phone: customerPhoneInput.value.trim(),
    delivery_type: deliveryType,
    address: deliveryType === "entrega" ? `${streetInput.value}, ${numberInput.value}, ${neighborhoodInput.value}` : "",
    payment_method: paymentMethod,
    total,
    observations: observationsInput.value.trim(),
    items: cart
  })
})
.then(() => {
  Toastify({ text: "Pedido enviado ao painel!", duration: 3000, style: { background: "#16a34a" } }).showToast();
})
.catch(() => {
  Toastify({ text: "Erro ao enviar pedido!", duration: 3000, style: { background: "#ef4444" } }).showToast();
});

  // Resetar carrinho
  cart = [];
  updateCartModal();
  streetInput.value = neighborhoodInput.value = numberInput.value = observationsInput.value = "";
  customerNameInput.value = customerPhoneInput.value = changeForInput.value = "";
  pixConfirmed = false; currentGeneratedPixRef = "";
  paymentMethods.forEach(pm => pm.checked = pm.value === "Cartão");
  handlePaymentUIChange();
});
