# Forex Portfolio Tracker

Um dashboard web multi-utilizador para acompanhar trades de Forex de uma conta MetaTrader 5: win rate, lucro e prejuízo por dia num calendário (green days / red days), posições abertas com valor atual e histórico de trades.

Cada utilizador entra com as suas credenciais do Myfxbook. A sincronização da conta MT5 é feita na cloud (via Myfxbook AutoSync com a investor password, só leitura), por isso funciona mesmo usando apenas a app de telemóvel do MetaTrader. O site lê os dados e desenha o painel.

As credenciais nunca são guardadas. O login passa por um proxy (Cloudflare Worker) que troca email e password por um token de sessão temporário; a password é descartada de imediato e nunca é registada.

## Funcionalidades

- Resumo da conta: saldo, equity, ganho total, profit factor e drawdown
- Win rate calculado a partir do histórico de trades
- Posições abertas com tipo, volume, pips e valor atual
- Calendário mensal com o total por dia (green days / red days); clicar num dia mostra as trades desse dia
- Histórico das trades fechadas

## Estrutura

- [index.html](index.html), [assets/](assets/) - frontend estático (login + dashboard)
- [assets/data.js](assets/data.js) - camada de dados, com modo de demonstração e modo real
- [worker/](worker/) - proxy Cloudflare Worker que protege as credenciais do Myfxbook

## Estado

Modo de demonstração com dados de exemplo ativo por defeito. Para ligar a contas reais, ativa-se o modo real na camada de dados e o proxy do Worker.

---

Made by EERIE ·
[Buy Me a Coffee](https://www.buymeacoffee.com/eerie) ·
[Report Issue](https://github.com/EerieGoesD/forex-portfolio-tracker/issues/new) ·
[Feedback](https://github.com/EerieGoesD/forex-portfolio-tracker/issues/new?labels=feedback) ·
[Feature Request](https://github.com/EerieGoesD/forex-portfolio-tracker/issues/new?labels=enhancement)
