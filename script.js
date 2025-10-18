// =====================
// CONFIGURAÇÃO
// =====================
const BACKEND_URL = "https://aggravatedly-chiliadal-yamileth.ngrok-free.dev";
// const BACKEND_URL = "http://localhost:3000"; // use para testes locais

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

// Contadores locais
let nextDeliveryNumber = 1;
let nextBalcaoNumber = 1;

// Chave PIX fixa
const RECEIVER_PIX_KEY = "hauankawai@gmail.com";

// =====================
// Funções utilitárias
// =====================
function currencyBRL(value) {
  return value.toLocaleString("pt-br", { style: "currency", currency: "BRL" });
}
function generatePaymentRef(amount) {
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  const cents = Math.round(amount * 100);
  return `MCKY_${timestamp}_${rand}_V${cents}`;
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
// PIX UI / referência
// =====================
function invalidatePixRef() {
  currentGeneratedPixRef = "";
  pixKeyText.textContent = "--";
  pixQrContainer.innerHTML = "";
  pixTimerEl.classList.add("hidden");
  confirmPixBtn.classList.add("hidden");
  clearInterval(pixTimerInterval);
}

function handlePaymentUIChange() {
  const sel = getSelectedPaymentMethod();
  paymentWarn.classList.add("hidden");
  if (sel === "Pix") {
    pixKeyContainer.classList.remove("hidden");
    changeContainer.classList.add("hidden");
    generatePixRefForUI();
  } else {
    pixKeyContainer.classList.add("hidden");
    changeContainer.classList.toggle("hidden", sel !== "Dinheiro");
    invalidatePixRef();
  }
}
paymentMethods.forEach(pm => pm.addEventListener("change", handlePaymentUIChange));

function generatePixRefForUI() {
  const total = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
  if (total <= 0) {
    pixQrContainer.innerHTML = `<p class="text-red-600">Adicione itens ao carrinho para gerar pagamento.</p>`;
    pixKeyText.textContent = "--";
    return;
  }

  pixKeyText.textContent = RECEIVER_PIX_KEY;
  const whatsappNumber = "5544999038033";
  const whatsappMsg = encodeURIComponent(`Olá, estou enviando o comprovante do pagamento de R$ ${total.toFixed(2)}`);

  pixQrContainer.innerHTML = `
    <div class="text-center">
      <p class="font-medium text-lg mb-2">Chave PIX:</p>
      <p class="break-all select-all text-xl font-semibold mb-4">${RECEIVER_PIX_KEY}</p>
      <p class="mt-2 mb-4 text-lg">Valor: <strong>${currencyBRL(total)}</strong></p>
      <a href="https://wa.me/${whatsappNumber}?text=${whatsappMsg}" target="_blank" 
         class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-green-600 hover:to-green-700 transition duration-300">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.52 3.48A11.987 11.987 0 0012 0C5.37 0 0 5.37 0 12a11.987 11.987 0 003.48 8.52l-1.38 4.98 4.98-1.38A11.987 11.987 0 0012 24c6.63 0 12-5.37 12-12a11.987 11.987 0 00-3.48-8.52zM12 22a10 10 0 01-5.66-1.81l-.4-.25-2.96.82.82-2.96-.25-.4A10 10 0 1122 12a10 10 0 01-10 10z"/>
        </svg>
        Enviar comprovante
      </a>
    </div>
  `;
  confirmPixBtn.classList.add("hidden");
  pixTimerEl.classList.add("hidden");
}

// =====================
// Confirmar PIX
// =====================
confirmPixBtn.addEventListener("click", () => {
  if (!currentGeneratedPixRef) {
    Toastify({ text: "Referência inválida/expirada.", duration: 2500, style: { background: "#ef4444" } }).showToast();
    return;
  }
  const expiresAt = parseInt(pixTimerEl.dataset.expiresAt || "0", 10);
  if (Date.now() > expiresAt) {
    Toastify({ text: "Referência expirada.", duration: 2500, style: { background: "#ef4444" } }).showToast();
    currentGeneratedPixRef = "";
    return;
  }
  pixConfirmed = true;
  Toastify({ text: "Pagamento marcado como confirmado.", duration: 2500, style: { background: "#10b981" } }).showToast();
});

// =====================
// Header status
// =====================
function checkRestaurantOpen() {
  const data = new Date();
  const dia = data.getDay();
  const minAtual = data.getHours() * 60 + data.getMinutes();
  const diasAbertos = [3,5,6];
  if(!diasAbertos.includes(dia)) return false;
  return minAtual >= 19*60 && minAtual <= 23*60+30;
}

function updateHeaderStatus() {
  if(!headerStatus) return;
  const open = checkRestaurantOpen();
  if(open){
    headerStatus.textContent = "Aberto agora - Quarta, Sexta e Sábado: 19:00 às 23:30";
    headerStatus.classList.remove("bg-red-500"); headerStatus.classList.add("bg-green-500");
  } else {
    headerStatus.textContent = "Fechado no momento - Quarta, Sexta e Sábado: 19:00 às 23:30";
    headerStatus.classList.remove("bg-green-500"); headerStatus.classList.add("bg-red-500");
  }
}
updateHeaderStatus();
setInterval(updateHeaderStatus,60000);

// =====================
// Entrega UI
// =====================
deliveryTypeRadios.forEach(r => r.addEventListener("change", () => {
  if(getSelectedDeliveryType() === "entrega") addressSection.classList.remove("hidden");
  else addressSection.classList.add("hidden");
}));

// =====================
// Checkout / enviar pedido
// =====================
checkoutBtn.addEventListener("click", async () => {
  if(!checkRestaurantOpen()){
    Toastify({ text:"Lanchonete fechada!", duration:2500, style:{background:"#ef4444"}}).showToast(); return;
  }
  if(!cart.length){ Toastify({text:"Carrinho vazio.", duration:2500}).showToast(); return; }
  if(!customerNameInput.value.trim()){ nameWarn.classList.remove("hidden"); return; }
  if(!/^\d{8,15}$/.test(customerPhoneInput.value.trim())){ phoneWarn.classList.remove("hidden"); return; }

  const deliveryType = getSelectedDeliveryType();
  if(deliveryType==="entrega" && (!streetInput.value.trim() || !neighborhoodInput.value.trim() || !numberInput.value.trim())){
    addressWarn.classList.remove("hidden"); return;
  }
  addressWarn.classList.add("hidden");

  const paymentMethod = getSelectedPaymentMethod();
  if(!paymentMethod){ paymentWarn.classList.remove("hidden"); return; }
  if(paymentMethod==="Pix" && !pixConfirmed){
    Toastify({text:"Pague e confirme o Pix antes de finalizar.", duration:3000, style:{background:"#f59e0b"}}).showToast();
    return;
  }

  const total = cart.reduce((acc,i)=>acc+i.price*i.quantity,0);

  const pedido = {
    cliente: customerNameInput.value.trim(),
    telefone: customerPhoneInput.value.trim(),
    tipo_entrega: deliveryType,
    endereco: deliveryType==="entrega" ? `${streetInput.value.trim()}, ${numberInput.value.trim()}, ${neighborhoodInput.value.trim()}` : "",
    itens: cart,
    total,
    observacoes: observationsInput.value.trim(),
    pagamento: paymentMethod,
    pix_chave: paymentMethod==="Pix"?RECEIVER_PIX_KEY:null,
    pix_valor: paymentMethod==="Pix"?total:null,
    pix_referencia: paymentMethod==="Pix"?currentGeneratedPixRef:null
  };

  try{
    const res = await fetch(`${BACKEND_URL}/api/pedido`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(pedido)
    });
    const data = await res.json();
    if(!data.sucesso) throw new Error(data.mensagem||"Erro desconhecido");

    Swal.fire({
      title:"Pedido recebido!",
      html:"Seu pedido está sendo processado e chegará em até <strong>30 minutos</strong>.",
      icon:"success",
      confirmButtonText:"Ok"
    });

    cart = [];
    updateCartModal();
    streetInput.value = neighborhoodInput.value = numberInput.value = observationsInput.value = "";
    customerNameInput.value = customerPhoneInput.value = changeForInput.value = "";
    pixConfirmed = false; currentGeneratedPixRef = "";
    paymentMethods.forEach(pm => pm.checked = pm.value==="Cartão");
    handlePaymentUIChange();

    if(typeof refreshPedidosPainel==="function") refreshPedidosPainel();
  } catch(err){
    console.error("Erro ao enviar pedido:", err);
    Swal.fire({title:"Erro", text:"Não foi possível enviar o pedido: "+err.message, icon:"error"});
  }
});
