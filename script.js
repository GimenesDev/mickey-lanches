// Certifique-se de que você incluiu a biblioteca Socket.io no seu index.html:
// <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>

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
const trocoResumo = document.getElementById("troco-resumo");


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
const confirmPixBtn = document.getElementById("confirm-pix-btn"); 
const changeForInput = document.getElementById("change-for");

// Entrega
const deliveryTypeRadios = document.getElementsByName("delivery-type");
const addressSection = document.getElementById("address-section");
const streetInput = document.getElementById("street");
const neighborhoodInput = document.getElementById("neighborhood");
const numberInput = document.getElementById("number");
const observationsInput = document.getElementById("observations");

// =====================
// ATUALIZAÇÕES PARA O PEDIDO / SOCKET.IO
// =====================
const socket = io('http://localhost:3333'); // Conexão global e única!
const API_URL_PEDIDOS = "http://localhost:3333/api/pedidos"; // URL da API

// Header status
const headerStatus = document.getElementById("header-status");

// Status do Pedido (Novo)
const statusModal = document.getElementById("status-modal");
const statusBtn = document.getElementById("status-btn");
const closeStatusBtn = document.getElementById("close-status-btn");
const currentOrderIdEl = document.getElementById("current-order-id");
const statusFooterIdEl = document.getElementById("status-footer-id");
const currentStatusTextEl = document.getElementById("current-status-text");
const statusIconEl = document.getElementById("status-icon");

let cart = [];
let pixConfirmed = false;
let currentOrderId = null; // ID do pedido para acompanhamento
let currentDeliveryType = null; // Tipo de entrega do pedido atual

// Chave PIX fixa
const RECEIVER_PIX_KEY = "hauankawai@gmail.com";
// =====================


// Mapa de Status
const STATUS_MAP = {
    // A chave DEVE ser o status que o servidor envia, convertido para minúsculas
    'pendente': { text: 'Pendente de Confirmação', icon: 'fa-clock', color: 'text-gray-500', bg: 'bg-gray-100', step: 'step-pendente' },
    'em preparo': { text: 'Em Preparo', icon: 'fa-cutlery', color: 'text-orange-500', bg: 'bg-orange-100', step: 'step-preparo' }, 
    'pronto': { text: 'Pronto para Retirada/Envio', icon: 'fa-shopping-bag', color: 'text-green-500', bg: 'bg-green-100', step: 'step-pronto' }, 
    'a caminho': { text: 'Saiu para Entrega', icon: 'fa-motorcycle', color: 'text-blue-500', bg: 'bg-blue-100', step: 'step-a-caminho' },
    'entregue': { text: 'Finalizado (Entregue)', icon: 'fa-check-circle', color: 'text-green-500', bg: 'bg-green-100', step: 'step-entregue' },
    'cancelado': { text: 'Pedido Cancelado', icon: 'fa-times-circle', color: 'text-red-500', bg: 'bg-red-100', step: 'step-pendente' },
};
// =====================
// Funções utilitárias
// =====================
function currencyBRL(value) {
    // Garante que o número seja formatado corretamente como moeda
    const num = parseFloat(value);
    return isNaN(num) ? 'R$ 0,00' : num.toLocaleString("pt-br", { style: "currency", currency: "BRL" });
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
// Carrinho / modal - LISTENERS
// =====================
if (cartBtn) {
    cartBtn.addEventListener("click", () => {
        updateCartModal();
        cartModal.style.display = "flex";
        document.body.classList.add("body-no-scroll");
    });
}
if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
        cartModal.style.display = "none";
        document.body.classList.remove("body-no-scroll");
    });
}
if (cartModal) {
    cartModal.addEventListener("click", (e) => {
        if (e.target === cartModal) {
            cartModal.style.display = "none";
            document.body.classList.remove("body-no-scroll");
        }
    });
}

// =====================
// Header status (mantido igual ao seu original)
// =====================
function checkRestaurantOpen() {
  const data = new Date();
  const dia = data.getDay();
  const minAtual = data.getHours() * 60 + data.getMinutes();
  const diasAbertos = [3, 5, 6, 2];
  if (!diasAbertos.includes(dia)) return false;
  return minAtual >= 16 * 60 && minAtual <= 23 * 60 + 59;
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
// ADICIONAR AO CARRINHO - LISTENER DO MENU
// =====================
if (menu) {
    menu.addEventListener("click", (e) => {
        const btn = e.target.closest(".add-to-cart-btn");
        if (!btn) return;
        const name = btn.getAttribute("data-name");
        const price = parseFloat(btn.getAttribute("data-price"));
        addToCart(name, price);
    });
}

function addToCart(name, price) {
    const ex = cart.find(i => i.name === name);
    if (ex) ex.quantity++;
    else cart.push({ name, price, quantity: 1 });

    Toastify({ text: "Item adicionado ao carrinho!", duration: 2000, gravity: "top", position: "right", style: { background: "linear-gradient(to right, #4caf50,#81c784)" } }).showToast();
    updateCartModal();
}

// FUNÇÃO ATUALIZADA: Gera o novo HTML do carrinho com botões de controle
function updateCartModal() {
    cartItemsContainer.innerHTML = "";
    let total = 0;
    
    // Adiciona mensagem se o carrinho estiver vazio
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="text-center text-gray-500 font-semibold mt-4">Seu carrinho está vazio.</p>';
        cartTotal.textContent = currencyBRL(0);
        cartCounter.textContent = 0;
        return; 
    }

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const div = document.createElement("div");
        div.className = "flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0";
        div.innerHTML = `
            <div class="flex-1 min-w-0 pr-2">
                <p class="font-semibold text-gray-800">${item.name}</p>
                <p class="text-sm text-gray-500">Valor Unitário: ${currencyBRL(item.price)}</p>
            </div>
            
            <div class="flex items-center space-x-4">
                <div class="flex items-center space-x-2 border rounded-full overflow-hidden shadow-sm">
                    <button class="decrease-qty-btn w-6 h-6 text-center text-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition" data-name="${item.name}">-</button>
                    <span class="font-bold text-sm w-4 text-center text-gray-800">${item.quantity}</span>
                    <button class="increase-qty-btn w-6 h-6 text-center text-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition" data-name="${item.name}">+</button>
                </div>
                
                <div class="w-24 text-right font-bold text-gray-800 text-base">
                    ${currencyBRL(itemTotal)}
                </div>
            </div>

            <button class="remove-from-cart-btn ml-4 text-red-500 hover:text-red-700 text-lg transition" data-name="${item.name}" title="Remover item completamente">
                <i class="fa fa-trash"></i>
            </button>
        `;
        cartItemsContainer.appendChild(div);
    });
    
    // Atualiza Total e Contador
    cartTotal.textContent = currencyBRL(total);
    cartCounter.textContent = cart.reduce((a, b) => a + b.quantity, 0);

    // Lógica para PIX / Botões
    pixConfirmed = false;
    const oldMsg = document.getElementById("pix-confirm-msg");
    if (oldMsg) oldMsg.remove();
    
    // Garante que o PIX Key Container esteja escondido se não for PIX
    if (getSelectedPaymentMethod() !== "Pix") {
         pixKeyContainer.classList.add('hidden');
    }

    if (getSelectedPaymentMethod() === "Pix") {
        if (pixKeyText) pixKeyText.textContent = RECEIVER_PIX_KEY;
        if (confirmPixBtn) confirmPixBtn.classList.remove("hidden");
    } else {
        if (confirmPixBtn) confirmPixBtn.classList.add("hidden");
    }
}

if (cartItemsContainer) {
    cartItemsContainer.addEventListener("click", (e) => {
        // Usa closest("button") para garantir que o data-name seja pego corretamente
        const name = e.target.closest("button")?.getAttribute("data-name"); 
        if (!name) return;
        
        // Se o target for o botão de remover (lixeira)
        if (e.target.closest(".remove-from-cart-btn")) removeItemCart(name);
        // Se for o botão de diminuir
        if (e.target.closest(".decrease-qty-btn")) changeItemQuantity(name, -1);
        // Se for o botão de aumentar
        if (e.target.closest(".increase-qty-btn")) changeItemQuantity(name, +1);
    });
}

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
// Pagamento UI
// =====================
function handlePaymentUIChange() {
    const selectedPayment = getSelectedPaymentMethod();
    
    // Mostra/Esconde Troco
    if (selectedPayment === 'Dinheiro') {
        changeContainer.classList.remove('hidden');
    } else {
        changeContainer.classList.add('hidden');
        changeForInput.value = ''; // Limpa o troco
        trocoResumo.classList.add('hidden');
    }

    // Mostra/Esconde PIX Info
    if (selectedPayment === 'Pix') {
        pixKeyContainer.classList.remove('hidden');
        if (confirmPixBtn) confirmPixBtn.classList.remove("hidden");
    } else {
        pixKeyContainer.classList.add('hidden');
        if (confirmPixBtn) confirmPixBtn.classList.add("hidden");
        pixConfirmed = false; // Reseta a confirmação do PIX
    }
}

// Listener para a mudança de tipo de pagamento
document.getElementsByName("payment").forEach(radio => {
    radio.addEventListener('change', () => {
        updateCartModal(); // Chama para re-renderizar e ajustar o botão PIX
        handlePaymentUIChange();
    });
});

// Listener para a mudança de tipo de entrega
document.getElementsByName("delivery-type").forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentDeliveryType = e.target.value; // Atualiza a variável global
        if (e.target.value === 'entrega') {
            addressSection.classList.remove('hidden');
        } else {
            addressSection.classList.add('hidden');
            // Limpar campos de endereço ao mudar para retirada
            streetInput.value = '';
            neighborhoodInput.value = '';
            numberInput.value = '';
            addressWarn.classList.add('hidden');
        }
    });
});
currentDeliveryType = getSelectedDeliveryType(); // Inicializa o tipo de entrega

// Listener para cálculo do troco
changeForInput.addEventListener('input', () => {
    const total = cart.reduce((a, b) => a + b.price * b.quantity, 0);
    const trocoPara = parseFloat(changeForInput.value) || 0;
    
    if (trocoPara > total) {
        trocoResumo.textContent = `Troco necessário: ${currencyBRL(trocoPara - total)}`;
        trocoResumo.classList.remove('hidden');
    } else if (trocoPara > 0 && trocoPara <= total) {
        trocoResumo.textContent = 'O valor deve ser maior que o total para troco.';
        trocoResumo.classList.remove('hidden');
    } else {
        trocoResumo.classList.add('hidden');
    }
});

// Listener para o botão de confirmação do PIX
if (confirmPixBtn) {
    confirmPixBtn.addEventListener('click', () => {
        pixConfirmed = true;
        confirmPixBtn.classList.add('hidden');
        
        Toastify({ 
            text: "✅ PIX Confirmado! Pode finalizar o pedido.", 
            duration: 3000, 
            style: { background: "linear-gradient(to right, #10b981, #34d399)" } 
        }).showToast();
        
        // Adiciona uma mensagem de sucesso na interface (opcional, mas bom)
        const successMsg = document.createElement('p');
        successMsg.id = "pix-confirm-msg";
        successMsg.className = "text-green-600 font-bold mt-2";
        successMsg.textContent = "✅ Pagamento PIX confirmado.";
        pixKeyContainer.after(successMsg);
    });
}

// Listener para copiar chave PIX
if (copyPixBtn) {
    copyPixBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(RECEIVER_PIX_KEY).then(() => {
            Toastify({ text: "Chave PIX copiada!", duration: 1500 }).showToast();
        });
    });
}

// =====================
// RASTREAMENTO DO PEDIDO (STATUS MODAL) - LÓGICA DE ABERTURA
// =====================

// No seu script.js

function handleOrderSuccess(orderId, deliveryType) {
    currentOrderId = orderId;
    currentDeliveryType = deliveryType;
    
    // 1. Mostrar o botão de rastreamento no footer (Como fallback/referência)
    if (statusBtn) {
        statusBtn.classList.remove('hidden');
        statusBtn.classList.add('flex');
        statusFooterIdEl.textContent = `#${orderId}`;
    }

    // 2. Atualizar o status inicial (deve ser 'Pendente') ANTES de abrir o modal
    updateOrderStatusUI('Pendente');

    // 3. Limpar o carrinho e fechar o modal de checkout
    cart = [];
    updateCartModal();
    if (cartModal) cartModal.style.display = "none";

    // 4. Exibe a notificação de sucesso (AGORA COM TIMER E SEM BOTÃO)
    Swal.fire({
        title: "Pedido Recebido!",
        text: `Seu pedido #${orderId} foi enviado para a cozinha. O status será exibido em instantes.`,
        icon: "success",
        showConfirmButton: false, // <-- IMPORTANTE: Remove o botão
        timer: 3000, // <-- IMPORTANTE: Fecha automaticamente após 3 segundos
        timerProgressBar: true,
    // SEU CÓDIGO ATUAL
// ...
}).then(() => {
    // ESTA FUNÇÃO É EXECUTADA APÓS O SWEETALERT FECHAR
    if (statusModal) {
        statusModal.classList.remove('hidden'); 
        // 🚀 MUDANÇA: Usamos style.display para garantir que o modal abra.
        statusModal.style.display = 'flex'; 
    }
});
}
// No seu script.js

// Listener para o botão de rastreamento do pedido no footer
if (statusBtn) {
    statusBtn.addEventListener("click", () => {
    if (currentOrderId) {
        statusModal.classList.remove("hidden"); 
        // 🚀 MUDANÇA: Usamos style.display para garantir que o modal abra.
        statusModal.style.display = "flex"; 
    } else {
             Toastify({ text: "Nenhum pedido recente encontrado para rastrear.", duration: 3000, style: { background: "linear-gradient(to right, #f59e0b, #facc15)" } }).showToast();
        }
    });
}

// Listener para fechar o modal de status
if (closeStatusBtn) {
    closeStatusBtn.addEventListener("click", () => {
        // Opção 1: Usar a classe hidden (o suficiente, pois ela define display: none)
        statusModal.classList.add("hidden"); 

        // Opção 2 (Garantia extra):
        // statusModal.style.display = "none";
        
        // Opcional: Remova o 'flex' apenas para limpeza de classes
        statusModal.classList.remove("flex");
    });
}
/**
 * @CORREÇÃO 2: Lógica completa para atualizar o rastreio na tela.
 */
function updateOrderStatusUI(newStatus) {
    const statusLower = newStatus.toLowerCase().trim();
    const statusInfo = STATUS_MAP[statusLower] || STATUS_MAP['pendente'];

    // 1. Atualizar o ID do pedido no modal
    currentOrderIdEl.textContent = `#${currentOrderId}`;

    // 2. Atualizar o texto de status
    currentStatusTextEl.textContent = statusInfo.text;
    
    // 3. Atualizar o estilo do container de status
    const statusContainer = document.getElementById("status-display-container");
    if (statusContainer) {
        statusContainer.className = `flex items-center justify-center p-3 rounded-xl shadow-inner ${statusInfo.bg}`;
        currentStatusTextEl.className = `text-2xl font-extrabold ${statusInfo.color}`;
    }

    // 4. Atualizar o ícone de animação/principal
    statusIconEl.innerHTML = `<i class="fa ${statusInfo.icon} text-5xl ${statusInfo.color}"></i>`;
    
    // 5. Atualizar a trilha de passos (progress bar)
    const allSteps = document.querySelectorAll('.status-step');
    allSteps.forEach(step => {
        step.classList.remove('text-green-600', 'font-extrabold', 'text-red-600');
        step.classList.add('text-gray-400', 'font-semibold');
    });

    // Marca o passo atual e anteriores como ativos
    let reachedActive = false;

    // Garante que os passos anteriores também sejam destacados
    for (const key in STATUS_MAP) {
        const stepElement = document.getElementById(STATUS_MAP[key].step);
        if (stepElement) {
            
            if (key === statusLower) {
                reachedActive = true;
                // O status 'cancelado' deve ter cor vermelha
                if (statusLower === 'cancelado') {
                    stepElement.classList.remove('text-gray-400', 'font-semibold');
                    stepElement.classList.add('text-red-600', 'font-extrabold');
                } else {
                    stepElement.classList.remove('text-gray-400', 'font-semibold');
                    stepElement.classList.add('text-green-600', 'font-extrabold');
                }
            }
            
            // Passos anteriores (apenas se não for cancelado)
            if (!reachedActive && statusLower !== 'cancelado') {
                stepElement.classList.remove('text-gray-400', 'font-semibold');
                stepElement.classList.add('text-green-600', 'font-extrabold');
            }
            
            // Quebra o loop após passar pelo status ativo
            if (key === statusLower && statusLower !== 'cancelado') break;
        }
    }
    
    // Lida com a visibilidade de passos específicos ('A Caminho' só para Entrega)
    const stepACaminho = document.getElementById('step-a-caminho');
    if (stepACaminho) {
        if (currentDeliveryType === 'retirada') {
             // Esconde o passo "A Caminho" para retirada
             stepACaminho.style.display = 'none'; 
        } else {
             // Mostra o passo "A Caminho" para entrega
             stepACaminho.style.display = 'block'; 
        }
    }
}


// =====================
// FINALIZAR PEDIDO (CHECKOUT) - LÓGICA DE ENVIO
// =====================

/**
 * @CORREÇÃO 3: Lógica completa do checkout para chamar o rastreamento.
 */
if (checkoutBtn) {
    checkoutBtn.addEventListener("click", async () => {
        if (cart.length === 0) {
            Toastify({ text: "O carrinho está vazio!", duration: 2000, style: { background: "linear-gradient(to right, #f87171, #ef4444)" } }).showToast();
            return;
        }

        const customerName = customerNameInput.value.trim();
        const customerPhone = customerPhoneInput.value.replace(/\D/g, ''); // Limpa, só números
        const total = cart.reduce((a, b) => a + b.price * b.quantity, 0);
        const deliveryType = getSelectedDeliveryType();
        const paymentMethod = getSelectedPaymentMethod();
        const observations = observationsInput.value.trim();
        const trocoPara = (paymentMethod === 'Dinheiro' && changeForInput.value.trim() !== '') ? parseFloat(changeForInput.value) : null;


        // VALIDAÇÃO: Nome
        if (customerName === "") {
            nameWarn.classList.remove("hidden");
            customerNameInput.focus();
            return;
        } else {
            nameWarn.classList.add("hidden");
        }

        // VALIDAÇÃO: Telefone (mínimo 10 dígitos)
        if (customerPhone.length < 10) {
            phoneWarn.classList.remove("hidden");
            customerPhoneInput.focus();
            return;
        } else {
            phoneWarn.classList.add("hidden");
        }

        // VALIDAÇÃO: Entrega
        let address = null;
        if (deliveryType === 'entrega') {
            const street = streetInput.value.trim();
            const neighborhood = neighborhoodInput.value.trim();
            const number = numberInput.value.trim();

            if (!street || !neighborhood || !number) {
                addressWarn.classList.remove('hidden');
                streetInput.focus();
                return;
            } else {
                addressWarn.classList.add('hidden');
                address = { street, neighborhood, number };
            }
        }
        
        // VALIDAÇÃO: Troco (se for Dinheiro)
        if (paymentMethod === 'Dinheiro' && trocoPara && trocoPara <= total) {
            Toastify({ text: "O valor do troco deve ser maior que o total do pedido.", duration: 3000, style: { background: "linear-gradient(to right, #f87171, #ef4444)" } }).showToast();
            changeForInput.focus();
            return;
        }

        // VALIDAÇÃO: PIX (se for PIX)
        if (paymentMethod === 'Pix' && !pixConfirmed) {
            Toastify({ text: "Confirme o pagamento PIX antes de finalizar.", duration: 3000, style: { background: "linear-gradient(to right, #f59e0b, #facc15)" } }).showToast();
            return;
        }


        // CONSTRUÇÃO DO OBJETO DE PEDIDO
        const orderData = {
            customer: { 
                name: customerName, 
                phone: customerPhone 
            },
            delivery: { 
                type: deliveryType, 
                address: address 
            },
            payment: { 
                method: paymentMethod, 
                total: total,
                troco_para: trocoPara,
                pix_confirmado: paymentMethod === 'Pix' ? pixConfirmed : false 
            },
            items: cart.map(item => ({
                name: item.name,
                price: item.price,
                quantity: item.quantity
            })),
            observations: observations,
            time: new Date().toISOString()
        };

        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Enviando...';

        // ENVIO PARA A API
        try {
            const response = await fetch(API_URL_PEDIDOS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
            }

            const data = await response.json();
            
            // Sucesso!
            handleOrderSuccess(data.pedidoId, deliveryType); // CHAMA A FUNÇÃO DE RASTREAMENTO

        } catch (error) {
            console.error('Erro ao enviar pedido:', error);
            Toastify({ text: `❌ Erro ao enviar pedido: ${error.message || 'Verifique o console.'}`, duration: 5000, style: { background: "linear-gradient(to right, #f87171, #ef4444)" } }).showToast();
        } finally {
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = 'Finalizar Pedido';
        }
    });
}


// =====================
// SOCKET.IO LISTENERS (ATUALIZAÇÃO EM TEMPO REAL)
// =====================

/**
 * Ouve as atualizações de status do servidor e atualiza o modal, se for o pedido atual.
 */
socket.on('status_atualizado', (data) => {
    // Verifica se o status atualizado é para o pedido que estamos rastreando
    if (data.id === currentOrderId) {
        updateOrderStatusUI(data.status);
        
        Toastify({ 
            text: `📢 STATUS ATUALIZADO: Pedido #${data.id} agora está ${data.status.toUpperCase()}`, 
            duration: 5000, 
            style: { background: "linear-gradient(to right, #007bff, #0056b3)" } 
        }).showToast();
    }
});