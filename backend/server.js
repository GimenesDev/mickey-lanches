import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

const dbPromise = open({
  filename: path.join(process.cwd(), "db.sqlite"),
  driver: sqlite3.Database
});

(async () => {
  const db = await dbPromise;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT,
      customer_phone TEXT,
      delivery_type TEXT,
      address TEXT,
      payment_method TEXT,
      total REAL,
      observations TEXT,
      items TEXT,
      status TEXT DEFAULT 'pendente',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
})();

// ====== ROTAS ======

app.post("/api/pedidos", async (req, res) => {
  const db = await dbPromise;
  const {
    customer_name,
    customer_phone,
    delivery_type,
    address,
    payment_method,
    total,
    observations,
    items
  } = req.body;

  await db.run(
    `INSERT INTO orders (customer_name, customer_phone, delivery_type, address, payment_method, total, observations, items)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [customer_name, customer_phone, delivery_type, address, payment_method, total, observations, JSON.stringify(items)]
  );

  res.json({ success: true });
});

app.get("/api/pedidos", async (req, res) => {
  const db = await dbPromise;
  const pedidos = await db.all("SELECT * FROM orders ORDER BY created_at DESC");
  res.json(pedidos);
});

app.put("/api/pedidos/:id/status", async (req, res) => {
  const db = await dbPromise;
  const { id } = req.params;
  const { status } = req.body;
  await db.run("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
  res.json({ success: true });
});

// Servir o painel administrativo
app.use(express.static("public"));

app.listen(3001, () => console.log("✅ Servidor rodando em http://localhost:3001"));
