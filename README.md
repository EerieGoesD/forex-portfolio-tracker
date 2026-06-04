# Forex Portfolio Tracker

Um dashboard web para acompanhar trades de Forex de uma conta MetaTrader 5: win rate, lucro e prejuízo por dia (green days / red days), posições abertas com valor atual, histórico de trades e orçamento por trade.

A sincronização da conta é feita na cloud (via Myfxbook AutoSync com a investor password, só leitura), por isso funciona mesmo usando apenas a app de telemóvel do MetaTrader. O site lê os dados e desenha o painel.

## Funcionalidades

- Resumo da conta: saldo, equity, ganho total, profit factor e drawdown
- Win rate calculado a partir do histórico de trades
- Posições abertas com tipo, volume, pips e valor atual
- Resultado por dia com contagem de green days e red days
- Histórico das trades fechadas
- Orçamento por trade definido pelo utilizador e guardado no navegador

## Estado

Versão de demonstração com dados de exemplo. A camada de dados está isolada em [assets/data.js](assets/data.js), pronta para ligar à API gratuita do Myfxbook.

---

Made by EERIE ·
[Buy Me a Coffee](https://www.buymeacoffee.com/eerie) ·
[Report Issue](https://github.com/EerieGoesD/forex-portfolio-tracker/issues/new) ·
[Feedback](https://github.com/EerieGoesD/forex-portfolio-tracker/issues/new?labels=feedback) ·
[Feature Request](https://github.com/EerieGoesD/forex-portfolio-tracker/issues/new?labels=enhancement)
