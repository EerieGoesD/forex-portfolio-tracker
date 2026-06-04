/* app.js - renderiza o dashboard a partir do DataSource. */

const BUDGET_KEY = "fpt.budgetPerTrade";
let CURRENCY = "USD";

function money(value) {
  try {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: CURRENCY,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${CURRENCY}`;
  }
}

function signed(value) {
  const cls = value >= 0 ? "pos" : "neg";
  const prefix = value >= 0 ? "+" : "";
  return `<span class="${cls}">${prefix}${money(value)}</span>`;
}

function signedPips(value) {
  const cls = value >= 0 ? "pos" : "neg";
  const prefix = value >= 0 ? "+" : "";
  return `<span class="${cls}">${prefix}${value.toFixed(1)}</span>`;
}

function el(id) {
  return document.getElementById(id);
}

/* ------------------------------- Render ----------------------------------- */

function renderAccount(acc) {
  CURRENCY = acc.currency || "USD";
  el("accountName").textContent = acc.name || "Conta";
  el("kpiBalance").textContent = money(acc.balance);
  el("kpiEquity").textContent = `Equity: ${money(acc.equity)}`;
  el("kpiGain").innerHTML = `<span class="${acc.gain >= 0 ? "pos" : "neg"}">${acc.gain >= 0 ? "+" : ""}${acc.gain.toFixed(1)}%</span>`;
  el("kpiProfit").textContent = `Lucro: ${money(acc.profit)}`;
  el("kpiProfitFactor").textContent = acc.profitFactor != null ? acc.profitFactor.toFixed(2) : "-";
  el("kpiDrawdown").textContent = `Drawdown: ${acc.drawdown != null ? acc.drawdown.toFixed(1) + "%" : "-"}`;
  el("budgetCur").textContent = CURRENCY === "USD" ? "$" : CURRENCY === "EUR" ? "€" : CURRENCY;
  return acc;
}

function renderWinRate(history) {
  const closed = history.filter((t) => typeof t.profit === "number");
  const won = closed.filter((t) => t.profit > 0).length;
  const lost = closed.filter((t) => t.profit < 0).length;
  const total = won + lost;
  const rate = total ? (won / total) * 100 : 0;
  el("kpiWinRate").innerHTML = `${rate.toFixed(0)}%`;
  el("kpiWinLoss").textContent = `${won} ganhas / ${lost} perdidas`;
}

function renderOpenTrades(trades) {
  const tbody = el("openTradesTable").querySelector("tbody");
  el("openCount").textContent = String(trades.length);
  if (!trades.length) {
    tbody.innerHTML = "";
    el("openTradesEmpty").hidden = false;
    el("openTradesTable").hidden = true;
    return;
  }
  el("openTradesEmpty").hidden = true;
  el("openTradesTable").hidden = false;
  tbody.innerHTML = trades
    .map((t) => {
      const tag = t.action.toLowerCase() === "buy" ? "tag-buy" : "tag-sell";
      return `<tr>
        <td class="sym">${t.symbol}</td>
        <td><span class="tag ${tag}">${t.action}</span></td>
        <td class="num">${t.lots.toFixed(2)}</td>
        <td class="num">${t.openPrice}</td>
        <td class="num">${signedPips(t.pips)}</td>
        <td class="num">${signed(t.profit)}</td>
      </tr>`;
    })
    .join("");
}

function renderHistory(history) {
  const tbody = el("historyTable").querySelector("tbody");
  el("historyCount").textContent = String(history.length);
  tbody.innerHTML = history
    .map((t) => {
      const tag = t.action.toLowerCase() === "buy" ? "tag-buy" : "tag-sell";
      return `<tr>
        <td class="date">${t.closeDate}</td>
        <td class="sym">${t.symbol}</td>
        <td><span class="tag ${tag}">${t.action}</span></td>
        <td class="num">${signedPips(t.pips)}</td>
        <td class="num">${signed(t.profit)}</td>
      </tr>`;
    })
    .join("");
}

/* ------------------------------ Calendario -------------------------------- */

let DAY_MAP = new Map(); // "yyyy-mm-dd" -> profit
let calYear = 0;
let calMonth = 0; // 0-11
const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

// Aceita "yyyy-mm-dd" (mock/ISO) e "dd/mm/yyyy" (Myfxbook). O formato real do
// Myfxbook segue o perfil do utilizador; validar no primeiro teste com conta real.
function parseDayKey(s) {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    return `${m[3]}-${mm}-${dd}`;
  }
  return null;
}

function fmtCompact(value) {
  const v = Math.round(value);
  return (v > 0 ? "+" : "") + v;
}

function setupCalendar(daily) {
  DAY_MAP = new Map();
  let latest = null;
  for (const d of daily) {
    const key = parseDayKey(d.date);
    if (!key) continue;
    DAY_MAP.set(key, d.profit);
    if (!latest || key > latest) latest = key;
  }

  const base = latest ? new Date(latest + "T00:00:00") : new Date();
  calYear = base.getFullYear();
  calMonth = base.getMonth();

  el("calPrev").onclick = () => shiftMonth(-1);
  el("calNext").onclick = () => shiftMonth(1);
  renderCalendar();
}

function shiftMonth(delta) {
  calMonth += delta;
  if (calMonth < 0) { calMonth = 11; calYear -= 1; }
  if (calMonth > 11) { calMonth = 0; calYear += 1; }
  renderCalendar();
}

function renderCalendar() {
  el("calMonth").textContent = `${MONTH_NAMES[calMonth]} ${calYear}`;

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDow = (new Date(calYear, calMonth, 1).getDay() + 6) % 7; // 0 = segunda

  let green = 0;
  let red = 0;
  let total = 0;
  const cells = [];

  for (let i = 0; i < firstDow; i++) {
    cells.push('<div class="cal-cell empty"></div>');
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (DAY_MAP.has(key)) {
      const p = DAY_MAP.get(key);
      total += p;
      let tone = "flat";
      if (p > 0) { green++; tone = "win"; }
      else if (p < 0) { red++; tone = "loss"; }
      cells.push(
        `<div class="cal-cell ${tone}" title="${key}: ${p}">
          <span class="cal-day">${day}</span>
          <span class="cal-val">${fmtCompact(p)}</span>
        </div>`
      );
    } else {
      cells.push(`<div class="cal-cell"><span class="cal-day">${day}</span></div>`);
    }
  }

  el("calGrid").innerHTML = cells.join("");
  el("greenDays").textContent = String(green);
  el("redDays").textContent = String(red);
  const totalEl = el("monthTotal");
  totalEl.textContent = (total >= 0 ? "+" : "") + money(total);
  totalEl.className = "day-num " + (total > 0 ? "green" : total < 0 ? "red" : "");
}

/* ------------------------------- Orcamento -------------------------------- */

function initBudget(account) {
  const input = el("budgetInput");
  const saved = localStorage.getItem(BUDGET_KEY);
  if (saved !== null) input.value = saved;
  updateBudgetReadout(account);

  el("budgetSave").addEventListener("click", () => {
    const val = parseFloat(input.value);
    if (isNaN(val) || val < 0) {
      input.value = "";
      localStorage.removeItem(BUDGET_KEY);
    } else {
      localStorage.setItem(BUDGET_KEY, String(val));
    }
    updateBudgetReadout(account);
  });
}

function updateBudgetReadout(account) {
  const saved = localStorage.getItem(BUDGET_KEY);
  if (saved === null || saved === "") {
    el("budgetShown").textContent = "-";
    el("budgetPct").textContent = "-";
    return;
  }
  const val = parseFloat(saved);
  el("budgetShown").textContent = money(val);
  const pct = account.balance ? (val / account.balance) * 100 : 0;
  el("budgetPct").textContent = `${pct.toFixed(1)}%`;
}

/* --------------------------------- Auth ----------------------------------- */

function getSession() {
  return window.IS_MOCK ? null : sessionStorage.getItem(window.SESSION_KEY);
}

function showLogin(message) {
  el("loginOverlay").hidden = false;
  el("logoutBtn").hidden = true;
  const errEl = el("loginError");
  if (message) {
    errEl.textContent = message;
    errEl.hidden = false;
  } else {
    errEl.hidden = true;
  }
}

function hideLogin() {
  el("loginOverlay").hidden = true;
}

function setLiveBadge() {
  const badge = el("dataModeBadge");
  badge.textContent = "Conta ligada";
  badge.classList.remove("badge-demo");
  badge.classList.add("badge-live");
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = el("loginBtn");
  const email = el("loginEmail").value.trim();
  const passEl = el("loginPassword");
  const password = passEl.value;
  el("loginError").hidden = true;
  btn.disabled = true;
  btn.textContent = "A entrar...";
  try {
    const session = await DataSource.login(email, password);
    sessionStorage.setItem(window.SESSION_KEY, session);
    passEl.value = ""; // nao mantemos a password
    hideLogin();
    await loadDashboard(session);
  } catch (err) {
    showLogin(err.message || "Falha no login.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Entrar";
  }
}

async function handleLogout() {
  const session = getSession();
  if (session) await DataSource.logout(session);
  sessionStorage.removeItem(window.SESSION_KEY);
  location.reload();
}

/* --------------------------------- Boot ----------------------------------- */

async function loadDashboard(session) {
  try {
    const account = await DataSource.loadAccount(session);
    const [openTrades, history, daily] = await Promise.all([
      DataSource.getOpenTrades(session),
      DataSource.getHistory(session),
      DataSource.getDaily(session),
    ]);

    renderAccount(account);
    renderWinRate(history);
    renderOpenTrades(openTrades);
    renderHistory(history);
    setupCalendar(daily);
    initBudget(account);

    if (!window.IS_MOCK) {
      setLiveBadge();
      el("logoutBtn").hidden = false;
    }

    const now = new Date();
    el("lastUpdated").textContent =
      "Atualizado " +
      now.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  } catch (err) {
    if (!window.IS_MOCK) {
      // sessao invalida ou expirada -> volta ao login
      sessionStorage.removeItem(window.SESSION_KEY);
      showLogin("Sessão inválida ou expirada. Entra novamente.");
    } else {
      el("accountName").textContent = "Erro ao carregar dados: " + err.message;
    }
  }
}

async function boot() {
  el("loginForm").addEventListener("submit", handleLogin);
  el("logoutBtn").addEventListener("click", handleLogout);

  if (window.IS_MOCK) {
    await loadDashboard(null);
    return;
  }

  const session = getSession();
  if (!session) {
    showLogin();
    return;
  }
  await loadDashboard(session);
}

document.addEventListener("DOMContentLoaded", boot);
