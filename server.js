require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-prod';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'eilzo5050';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function ensureAdmin() {
  const exists = await prisma.user.findUnique({ where: { username: ADMIN_USER } });
  if (!exists) {
    const hash = await bcrypt.hash(ADMIN_PASS, 10);
    await prisma.user.create({ data: { username: ADMIN_USER, password: hash } });
    console.log(`Admin user created: ${ADMIN_USER}`);
  }
}

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'no token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'invalid token' });
  }
}

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  const user = await prisma.user.findUnique({ where: { username: String(username || '') } });
  if (!user) return res.status(401).json({ error: 'credenciais inválidas' });
  const ok = await bcrypt.compare(String(password || ''), user.password);
  if (!ok) return res.status(401).json({ error: 'credenciais inválidas' });
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username });
});

// Containers
app.get('/api/containers', auth, async (_req, res) => {
  const list = await prisma.container.findMany({
    orderBy: { createdAt: 'desc' },
    include: { produtos: true, lancamentos: true },
  });
  res.json(list);
});

app.post('/api/containers', auth, async (req, res) => {
  const { nome, dataEstimada, valorTotalEsperado, status } = req.body || {};
  const c = await prisma.container.create({
    data: {
      nome: String(nome || 'Novo contêiner'),
      dataEstimada: dataEstimada ? new Date(dataEstimada) : null,
      valorTotalEsperado: Number(valorTotalEsperado || 0),
      status: status || 'Em andamento',
    },
  });
  res.json(c);
});

app.get('/api/containers/:id', auth, async (req, res) => {
  const id = Number(req.params.id);
  const c = await prisma.container.findUnique({
    where: { id },
    include: { produtos: { orderBy: { id: 'asc' } }, lancamentos: { orderBy: { data: 'desc' } } },
  });
  if (!c) return res.status(404).json({ error: 'not found' });
  res.json(c);
});

app.put('/api/containers/:id', auth, async (req, res) => {
  const id = Number(req.params.id);
  const { nome, dataEstimada, valorTotalEsperado, status } = req.body || {};
  const c = await prisma.container.update({
    where: { id },
    data: {
      nome,
      dataEstimada: dataEstimada ? new Date(dataEstimada) : null,
      valorTotalEsperado: valorTotalEsperado != null ? Number(valorTotalEsperado) : undefined,
      status,
    },
  });
  res.json(c);
});

app.delete('/api/containers/:id', auth, async (req, res) => {
  await prisma.container.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// Produtos
app.post('/api/containers/:id/produtos', auth, async (req, res) => {
  const containerId = Number(req.params.id);
  const { descricao, quantidade, valorUnitarioChina, moeda, custoUnitarioBrasil } = req.body || {};
  const p = await prisma.produto.create({
    data: {
      containerId,
      descricao: String(descricao || ''),
      quantidade: Number(quantidade || 1),
      valorUnitarioChina: Number(valorUnitarioChina || 0),
      moeda: moeda || 'USD',
      custoUnitarioBrasil: Number(custoUnitarioBrasil || 0),
    },
  });
  res.json(p);
});

app.put('/api/produtos/:id', auth, async (req, res) => {
  const id = Number(req.params.id);
  const { descricao, quantidade, valorUnitarioChina, moeda, custoUnitarioBrasil } = req.body || {};
  const p = await prisma.produto.update({
    where: { id },
    data: {
      descricao,
      quantidade: quantidade != null ? Number(quantidade) : undefined,
      valorUnitarioChina: valorUnitarioChina != null ? Number(valorUnitarioChina) : undefined,
      moeda,
      custoUnitarioBrasil: custoUnitarioBrasil != null ? Number(custoUnitarioBrasil) : undefined,
    },
  });
  res.json(p);
});

app.delete('/api/produtos/:id', auth, async (req, res) => {
  await prisma.produto.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// Lançamentos
app.post('/api/containers/:id/lancamentos', auth, async (req, res) => {
  const containerId = Number(req.params.id);
  const { data, descricao, categoria, moeda, valorOriginal, cambio, valorBRL } = req.body || {};
  const vo = Number(valorOriginal || 0);
  const cb = Number(cambio || 1);
  const brl = valorBRL != null ? Number(valorBRL) : vo * cb;
  const l = await prisma.lancamento.create({
    data: {
      containerId,
      data: data ? new Date(data) : new Date(),
      descricao: String(descricao || ''),
      categoria: categoria || 'Outro',
      moeda: moeda || 'BRL',
      valorOriginal: vo,
      cambio: cb,
      valorBRL: brl,
    },
  });
  res.json(l);
});

app.put('/api/lancamentos/:id', auth, async (req, res) => {
  const id = Number(req.params.id);
  const { data, descricao, categoria, moeda, valorOriginal, cambio, valorBRL } = req.body || {};
  const l = await prisma.lancamento.update({
    where: { id },
    data: {
      data: data ? new Date(data) : undefined,
      descricao,
      categoria,
      moeda,
      valorOriginal: valorOriginal != null ? Number(valorOriginal) : undefined,
      cambio: cambio != null ? Number(cambio) : undefined,
      valorBRL: valorBRL != null ? Number(valorBRL) : undefined,
    },
  });
  res.json(l);
});

app.delete('/api/lancamentos/:id', auth, async (req, res) => {
  await prisma.lancamento.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

ensureAdmin()
  .then(() => {
    app.listen(PORT, () => console.log(`Server on :${PORT}`));
  })
  .catch((e) => {
    console.error('Startup error', e);
    process.exit(1);
  });
