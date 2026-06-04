/*
 * myfxbook-proxy.js - Cloudflare Worker (proxy seguro para a API do Myfxbook).
 *
 * Porque existe:
 *   - O GitHub Pages so serve ficheiros estaticos (sem backend).
 *   - O login da API do Myfxbook leva email+password no URL. Para nao expor isso
 *     no browser, o site manda as credenciais a este Worker no CORPO do pedido
 *     (POST, HTTPS). O Worker faz o login e devolve SO o token de sessao.
 *
 * Seguranca:
 *   - A password nunca e guardada nem registada. So e usada uma vez para o login.
 *   - Nada de credenciais em console.log (nao registamos o URL de saida).
 *   - CORS bloqueado as origens em ALLOWED_ORIGIN (proxy nao e aberto).
 *   - So encaminha os endpoints da whitelist abaixo.
 *
 * Multi-utilizador: nao ha base de dados nem estado. Cada utilizador autentica-se
 * com as suas credenciais e recebe a sua propria sessao.
 *
 * Config: define ALLOWED_ORIGIN em wrangler.toml (uma ou varias origens separadas
 * por virgula), ex.: "https://eeriegoesd.github.io".
 */

const MYFXBOOK = "https://www.myfxbook.com/api";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGIN || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const corsOrigin = allowed.includes(origin) ? origin : allowed[0] || "";

    const cors = {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Vary": "Origin",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // Bloqueia origens nao autorizadas (se a lista estiver definida).
    if (allowed.length && !allowed.includes(origin)) {
      return json({ error: true, message: "Origem nao autorizada." }, 403, cors);
    }

    const path = new URL(request.url).pathname.replace(/^\/+/, "").split("/")[0];

    try {
      // Login: credenciais no corpo (nunca no URL deste pedido).
      if (path === "login" && request.method === "POST") {
        const { email, password } = await request.json();
        if (!email || !password) {
          return json({ error: true, message: "Faltam credenciais." }, 400, cors);
        }
        const r = await mfx("login", { email, password });
        // Devolve apenas o necessario - nunca a password.
        return json({ error: !!r.error, message: r.message || "", session: r.session || null }, 200, cors);
      }

      // A partir daqui exige sessao (no cabecalho Authorization).
      const session = bearer(request);
      if (!session) {
        return json({ error: true, message: "Sessao em falta." }, 401, cors);
      }

      if (path === "logout" && request.method === "POST") {
        const r = await mfx("logout", { session });
        return json({ error: !!r.error, message: r.message || "" }, 200, cors);
      }

      if (path === "accounts") {
        return json(await mfx("get-my-accounts", { session }), 200, cors);
      }

      const url = new URL(request.url);
      const id = url.searchParams.get("id");

      if (path === "open-trades") {
        return json(await mfx("get-open-trades", { session, id }), 200, cors);
      }
      if (path === "history") {
        return json(await mfx("get-history", { session, id }), 200, cors);
      }
      if (path === "daily") {
        const start = url.searchParams.get("start");
        const end = url.searchParams.get("end");
        return json(await mfx("get-data-daily", { session, id, start, end }), 200, cors);
      }

      return json({ error: true, message: "Rota desconhecida." }, 404, cors);
    } catch (err) {
      return json({ error: true, message: "Erro no proxy." }, 502, cors);
    }
  },
};

// Chama a API do Myfxbook. NUNCA registar o URL (contem credenciais/sessao).
async function mfx(method, params) {
  const u = new URL(`${MYFXBOOK}/${method}.json`);
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") u.searchParams.set(k, v);
  }
  const res = await fetch(u.toString(), { method: "GET" });
  return res.json();
}

function bearer(req) {
  const h = req.headers.get("Authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
