const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server, { cors: { origin: "*" } });

app.use(cors());
app.use(bodyParser.json());
app.use("/relatorios", express.static(path.join(__dirname, "relatorios")));

// Arquivos JSON simples como banco de dados
const PEDIDOS_FILE = "./pedidos.json";
const CAIXA_FILE = "./caixa.json";

// ================== FUNÇÕES AUXILIARES ==================
function lerArquivo(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function salvarArquivo(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ================== CAIXA ==================
app.get("/api/caixa/status", (req, res) => {
  const caixa = fs.existsSync(CAIXA_FILE) ? JSON.parse(fs.readFileSync(CAIXA_FILE, "utf-8")) : {};
  res.json({ aberto: caixa.aberto || false, aberto_em: caixa.aberto_em || null });
});

app.post("/api/caixa/abrir", (req, res) => {
  fs.writeFileSync(CAIXA_FILE, JSON.stringify({ aberto: true, aberto_em: new Date() }, null, 2));
  res.json({ success: true });
});

app.post("/api/caixa/fechar", (req, res) => {
  const pedidos = lerArquivo(PEDIDOS_FILE);
  if (!pedidos.length) return res.json({ success: true, relatorio: null });

  // Criar PDF
  if (!fs.existsSync("./relatorios")) fs.mkdirSync("./relatorios");
  const filename = `relatorios/relatorio-${new Date().toISOString().slice(0,10)}.pdf`;
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filename));

  doc.fontSize(18).text("Relatório Diário - Mickey Lanches", { align: "center" });
  doc.moveDown();
  doc.fontSize(12);
  let totalDia = 0;
  pedidos.forEach(p => {
    doc.text(`Cliente: ${p.customer_name}`);
    doc.text(`Telefone: ${p.customer_phone}`);
    doc.text(`Itens: ${JSON.parse(p.items).map(i => i.name + " x" + i.quantity).join(", ")}`);
    doc.text(`Total: R$ ${p.total.toFixed(2)}`);
    doc.text(`Status: ${p.status}`);
    doc.text(`Data/Hora: ${new Date(p.created_at).toLocaleString("pt-BR")}`);
    doc.moveDown();
    totalDia += p.total;
  });
  doc.text(`Valor Total do Dia: R$ ${totalDia.toFixed(2)}`, { align: "right" });
  doc.end();

  // Fechar caixa e resetar pedidos
  fs.writeFileSync(CAIXA_FILE, JSON.stringify({ aberto: false, aberto_em: null }, null, 2));
  salvarArquivo(PEDIDOS_FILE, []);

  res.json({ success: true, relatorio: filename });
});

// ================== PEDIDOS ==================
app.get("/api/pedidos", (req, res) => {
  const pedidos = lerArquivo(PEDIDOS_FILE);
  res.json(pedidos);
});

app.post("/api/pedidos", (req, res) => {
  const caixa = fs.existsSync(CAIXA_FILE) ? JSON.parse(fs.readFileSync(CAIXA_FILE, "utf-8")) : {};
  if (!caixa.aberto) return res.status(400).json({ error: "Caixa fechado" });

  const { customer_name, customer_phone, items, total, observations } = req.body;
  const pedidos = lerArquivo(PEDIDOS_FILE);
  const novoPedido = {
    id: Date.now(),
    customer_name,
    customer_phone,
    items: JSON.stringify(items),
    total,
    status: "pendente",
    created_at: new Date(),
    observations: observations || ""
  };
  pedidos.push(novoPedido);
  salvarArquivo(PEDIDOS_FILE, pedidos);

  io.emit("novo_pedido", novoPedido);
  res.json({ success: true, pedido: novoPedido });
});

app.put("/api/pedidos/:id/status", (req, res) => {
  const pedidos = lerArquivo(PEDIDOS_FILE);
  const pedido = pedidos.find(p => p.id == req.params.id);
  if (!pedido) return res.status(404).json({ error: "Pedido não encontrado" });

  pedido.status = req.body.status;
  salvarArquivo(PEDIDOS_FILE, pedidos);

  io.emit("pedido_atualizado", pedido);
  res.json({ success: true });
});

// ================== SOCKET.IO ==================
io.on("connection", socket => {
  console.log("Cliente conectado:", socket.id);
});

// ================== INICIAR SERVIDOR ==================
const PORT = 3001;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
