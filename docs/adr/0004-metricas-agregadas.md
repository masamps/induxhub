# 0004. Métricas agregadas por dia via função

- Status: aceito
- Data: 2026-09-29

## Contexto

O painel mostra visualizações, cliques no WhatsApp e orçamentos recebidos nos últimos 30 dias. Visitantes anônimos geram esses eventos.

## Decisão

`profile_metrics` tem uma linha por empresa por dia (fuso `America/Sao_Paulo`). O cliente não escreve na tabela: chama `track_event(company_id, event)`, que faz upsert incrementando o contador. Orçamentos recebidos são contados por `create_quote_request`.

## Consequências

- Volume fixo: 365 linhas por empresa por ano, independente do tráfego.
- Consulta do gráfico é uma leitura por chave primária.
- Não há deduplicação por visitante. Se inflar, adicionar controle por cookie ou rate limit na borda antes de chamar a função.
- Relatórios detalhados do Premium podem exigir uma tabela de eventos brutos no futuro.
