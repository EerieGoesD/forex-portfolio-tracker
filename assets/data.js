/*
 * data.js - camada de dados do tracker (multi-utilizador).
 *
 * MODO DEMO: USE_MOCK = true -> dados de exemplo, 100% estatico, sem login.
 *
 * MODO REAL (multi-utilizador, seguro):
 *   1. USE_MOCK = false
 *   2. PROXY_BASE = URL do teu Cloudflare Worker (ver pasta /worker e README).
 *
 *   Fluxo seguro:
 *   - Cada utilizador entra com as SUAS credenciais Myfxbook no ecra de login.
 *   - A password vai no CORPO do pedido (POST, HTTPS) para o Worker, nunca no URL.
 *   - O Worker faz login no Myfxbook e devolve SO o token de sessao.
 *   - A password nunca e guardada nem registada em lado nenhum.
 *   - O token de sessao fica em sessionStorage (apagado ao fechar o separador)
 *     e segue nos pedidos seguintes no cabecalho Authorization: Bearer <sessao>.
 *
 *   Antes de ligar a conta MT5: o utilizador usa o Myfxbook AutoSync com a
 *   INVESTOR password (so leitura) do MT5/FP Markets - nunca a master password.
 *
 *   A win rate e calculada no cliente (app.js) a partir do historico.
 */

const USE_MOCK = true;
const PROXY_BASE = ""; // ex.: "https://myfxbook-proxy.<o-teu-subdominio>.workers.dev"
const SESSION_KEY = "fpt.session";

/* ----------------------------- DADOS DE EXEMPLO ---------------------------- */

const MOCK_ACCOUNT = {
  name: "FP Markets - MT5 (exemplo)",
  currency: "USD",
  balance: 5240.18,
  equity: 5302.44,
  profit: 1240.18,
  gain: 31.0,
  drawdown: 12.4,
  profitFactor: 1.84,
};

const MOCK_OPEN_TRADES = [
  { symbol: "EURUSD", action: "Buy",  lots: 0.50, openPrice: 1.08412, pips: 18.2, profit: 91.0 },
  { symbol: "XAUUSD", action: "Sell", lots: 0.10, openPrice: 2342.50, pips: -7.4, profit: -29.6 },
  { symbol: "GBPJPY", action: "Buy",  lots: 0.20, openPrice: 198.214, pips: 22.0, profit: 44.0 },
];

const MOCK_HISTORY = [
  { closeDate: "2026-06-03", symbol: "EURUSD", action: "Buy",  pips: 24.5, profit: 122.5 },
  { closeDate: "2026-06-03", symbol: "US30",   action: "Sell", pips: -15.0, profit: -75.0 },
  { closeDate: "2026-06-02", symbol: "XAUUSD", action: "Buy",  pips: 31.2, profit: 156.0 },
  { closeDate: "2026-06-02", symbol: "GBPUSD", action: "Sell", pips: 12.8, profit: 64.0 },
  { closeDate: "2026-06-02", symbol: "EURUSD", action: "Buy",  pips: -9.4, profit: -47.0 },
  { closeDate: "2026-05-30", symbol: "GBPJPY", action: "Buy",  pips: 40.1, profit: 200.5 },
  { closeDate: "2026-05-30", symbol: "USDJPY", action: "Sell", pips: -6.2, profit: -31.0 },
  { closeDate: "2026-05-29", symbol: "XAUUSD", action: "Buy",  pips: 18.0, profit: 90.0 },
  { closeDate: "2026-05-29", symbol: "EURUSD", action: "Sell", pips: 9.0,  profit: 45.0 },
  { closeDate: "2026-05-28", symbol: "US30",   action: "Buy",  pips: -11.5, profit: -57.5 },
  { closeDate: "2026-05-27", symbol: "GBPUSD", action: "Buy",  pips: 27.3, profit: 136.5 },
  { closeDate: "2026-05-26", symbol: "XAUUSD", action: "Sell", pips: 14.6, profit: 73.0 },
];

const MOCK_DAILY = [
  { date: "2026-05-26", profit: 73.0 },
  { date: "2026-05-27", profit: 136.5 },
  { date: "2026-05-28", profit: -57.5 },
  { date: "2026-05-29", profit: 135.0 },
  { date: "2026-05-30", profit: 169.5 },
  { date: "2026-06-02", profit: 297.0 },
  { date: "2026-06-03", profit: 47.5 },
];

/* -------------------------------- Helpers --------------------------------- */

function num(x) {
  const n = Number(x);
  return isNaN(n) ? 0 : n;
}

function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Faz um pedido ao proxy. method GET por defeito; body para POST.
async function call(path, { params = {}, method = "GET", body = null, session = null } = {}) {
  if (!PROXY_BASE) {
    throw new Error("PROXY_BASE nao definido. Ver instrucoes no topo de data.js.");
  }
  const url = new URL(`${PROXY_BASE.replace(/\/+$/, "")}/${path}`);
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, v);

  const headers = {};
  const opts = { method, headers };
  if (session) headers["Authorization"] = `Bearer ${session}`;
  if (body) {
    headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url.toString(), opts);
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("Resposta invalida do servidor.");
  }
  if (!res.ok || data.error) {
    throw new Error(data.message || `Erro ${res.status}`);
  }
  return data;
}

/* ------------------------------- Mapeamento ------------------------------- */
// Converte respostas Myfxbook para a forma usada pelo render (app.js).

function mapAccount(a) {
  return {
    name: a.name,
    currency: a.currency || "USD",
    balance: num(a.balance),
    equity: num(a.equity),
    profit: num(a.profit),
    gain: num(a.gain),
    drawdown: num(a.drawdown),
    profitFactor: num(a.profitFactor),
  };
}

function mapOpenTrade(t) {
  return {
    symbol: t.symbol,
    action: t.action,
    lots: num(t.sizing && t.sizing.value),
    openPrice: t.openPrice,
    pips: num(t.pips),
    profit: num(t.profit),
  };
}

function mapHistoryTrade(t) {
  const closeDate = (t.closeTime || "").split(" ")[0];
  return {
    closeDate,
    symbol: t.symbol,
    action: t.action,
    pips: num(t.pips),
    profit: num(t.profit),
  };
}

function mapDaily(d) {
  return { date: d.date, profit: num(d.profit) };
}

/* ------------------------------- DataSource ------------------------------- */

const DataSource = {
  _accountId: null,
  _currency: "USD",

  // Apenas modo real. Devolve o token de sessao.
  async login(email, password) {
    const data = await call("login", { method: "POST", body: { email, password } });
    if (!data.session) throw new Error(data.message || "Falha no login.");
    return data.session;
  },

  // Carrega a conta (primeira conta do Myfxbook) e guarda o id para os pedidos seguintes.
  async loadAccount(session) {
    if (USE_MOCK) return MOCK_ACCOUNT;
    const data = await call("accounts", { session });
    const acc = (data.accounts || [])[0];
    if (!acc) throw new Error("Esta conta Myfxbook nao tem contas ligadas.");
    this._accountId = acc.id;
    this._currency = acc.currency || "USD";
    return mapAccount(acc);
  },

  async getOpenTrades(session) {
    if (USE_MOCK) return MOCK_OPEN_TRADES;
    const data = await call("open-trades", { session, params: { id: this._accountId } });
    return (data.openTrades || []).map(mapOpenTrade);
  },

  async getHistory(session) {
    if (USE_MOCK) return MOCK_HISTORY;
    const data = await call("history", { session, params: { id: this._accountId } });
    return (data.history || []).map(mapHistoryTrade);
  },

  async getDaily(session) {
    if (USE_MOCK) return MOCK_DAILY;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 90);
    const data = await call("daily", {
      session,
      params: { id: this._accountId, start: ymd(start), end: ymd(end) },
    });
    return (data.dataDaily || []).flat().map(mapDaily);
  },

  async logout(session) {
    if (USE_MOCK) return;
    try {
      await call("logout", { method: "POST", body: { session }, session });
    } catch {
      /* ignora erros de logout */
    }
  },
};

window.DataSource = DataSource;
window.IS_MOCK = USE_MOCK;
window.SESSION_KEY = SESSION_KEY;
