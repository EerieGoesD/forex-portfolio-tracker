/*
 * data.js - camada de dados do tracker.
 *
 * AGORA: USE_MOCK = true -> usa dados de exemplo (este ficheiro), 100% estatico,
 * funciona no GitHub Pages tal como esta, sem servidor.
 *
 * PARA LIGAR A CONTA REAL (Myfxbook):
 *   1. O amigo cria conta gratuita no Myfxbook e usa o AutoSync com a INVESTOR
 *      password (so leitura) da conta MT5 do FP Markets. Sync e na cloud do
 *      Myfxbook, por isso funciona mesmo usando so a app de telemovel.
 *   2. A API gratuita do Myfxbook (https://www.myfxbook.com/api) precisa de
 *      Login (email+password do Myfxbook) para obter um "session" token e depois
 *      get-my-accounts / get-open-trades / get-history / get-data-daily.
 *
 *   ATENCAO (verificar antes de por em producao):
 *   - O GitHub Pages so serve ficheiros estaticos. NAO mete credenciais Myfxbook
 *     em codigo cliente publico.
 *   - Nao confirmei se a API do Myfxbook permite chamadas diretas do browser
 *     (CORS). Se nao permitir, e/ou para proteger as credenciais, mete um proxy
 *     gratuito (ex.: Cloudflare Workers) que faz Login + chamadas e devolve JSON
 *     ao site. So depois trocas USE_MOCK para false e apontas REAL_API_BASE para
 *     o teu proxy.
 *
 * A win rate NAO vem da API; calcula-se aqui a partir do historico (won/lost).
 */

const USE_MOCK = true;
const REAL_API_BASE = ""; // ex.: "https://o-teu-proxy.workers.dev"

/* ----------------------------- DADOS DE EXEMPLO ---------------------------- */

const MOCK_ACCOUNT = {
  name: "FP Markets - MT5 (exemplo)",
  currency: "USD",
  balance: 5240.18,
  equity: 5302.44,
  profit: 1240.18,   // lucro acumulado desde o deposito inicial (4000)
  gain: 31.0,        // %
  drawdown: 12.4,    // %
  profitFactor: 1.84,
  demo: true,
};

// action: "Buy" | "Sell" (como no Myfxbook get-open-trades)
const MOCK_OPEN_TRADES = [
  { symbol: "EURUSD", action: "Buy",  lots: 0.50, openPrice: 1.08412, pips: 18.2, profit: 91.0 },
  { symbol: "XAUUSD", action: "Sell", lots: 0.10, openPrice: 2342.50, pips: -7.4, profit: -29.6 },
  { symbol: "GBPJPY", action: "Buy",  lots: 0.20, openPrice: 198.214, pips: 22.0, profit: 44.0 },
];

// get-history: trades fechadas (ultimas 50 na API real)
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

// get-data-daily: resultado por dia
const MOCK_DAILY = [
  { date: "2026-05-26", profit: 73.0 },
  { date: "2026-05-27", profit: 136.5 },
  { date: "2026-05-28", profit: -57.5 },
  { date: "2026-05-29", profit: 135.0 },
  { date: "2026-05-30", profit: 169.5 },
  { date: "2026-06-02", profit: 297.0 },
  { date: "2026-06-03", profit: 47.5 },
];

/* ------------------------------- ADAPTADOR -------------------------------- */

const DataSource = {
  async getAccount() {
    if (USE_MOCK) return MOCK_ACCOUNT;
    return fetchReal("account");
  },
  async getOpenTrades() {
    if (USE_MOCK) return MOCK_OPEN_TRADES;
    return fetchReal("open-trades");
  },
  async getHistory() {
    if (USE_MOCK) return MOCK_HISTORY;
    return fetchReal("history");
  },
  async getDaily() {
    if (USE_MOCK) return MOCK_DAILY;
    return fetchReal("daily");
  },
};

// Placeholder para a ligacao real. Implementar quando o proxy existir e
// devolver os campos com os mesmos nomes dos dados de exemplo acima.
async function fetchReal(resource) {
  if (!REAL_API_BASE) {
    throw new Error("REAL_API_BASE nao definido. Ver instrucoes no topo de data.js.");
  }
  const res = await fetch(`${REAL_API_BASE}/${resource}`);
  if (!res.ok) throw new Error(`Falha ao obter ${resource}: ${res.status}`);
  return res.json();
}

window.DataSource = DataSource;
window.IS_MOCK = USE_MOCK;
