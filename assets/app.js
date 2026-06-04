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

function renderDaily(daily) {
  const green = daily.filter((d) => d.profit > 0).length;
  const red = daily.filter((d) => d.profit < 0).length;
  el("greenDays").textContent = String(green);
  el("redDays").textContent = String(red);

  const maxAbs = Math.max(1, ...daily.map((d) => Math.abs(d.profit)));
  el("dailyBars").innerHTML = daily
    .map((d) => {
      const h = Math.max(6, (Math.abs(d.profit) / maxAbs) * 100);
      const cls = d.profit >= 0 ? "" : "red";
      return `<span class="bar ${cls}" style="height:${h}%" title="${d.date}: ${d.profit}"></span>`;
    })
    .join("");

  el("dailyList").innerHTML = daily
    .slice()
    .reverse()
    .map(
      (d) => `<li>
        <span class="date">${d.date}</span>
        ${signed(d.profit)}
      </li>`
    )
    .join("");
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

/* --------------------------------- Boot ----------------------------------- */

async function boot() {
  if (!window.IS_MOCK) {
    const badge = el("dataModeBadge");
    badge.textContent = "Conta ligada";
    badge.classList.remove("badge-demo");
    badge.classList.add("badge-live");
  }

  try {
    const [account, openTrades, history, daily] = await Promise.all([
      DataSource.getAccount(),
      DataSource.getOpenTrades(),
      DataSource.getHistory(),
      DataSource.getDaily(),
    ]);

    renderAccount(account);
    renderWinRate(history);
    renderOpenTrades(openTrades);
    renderHistory(history);
    renderDaily(daily);
    initBudget(account);

    const now = new Date();
    el("lastUpdated").textContent =
      "Atualizado " +
      now.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  } catch (err) {
    el("accountName").textContent = "Erro ao carregar dados: " + err.message;
  }
}

document.addEventListener("DOMContentLoaded", boot);
