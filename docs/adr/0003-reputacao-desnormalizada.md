# 0003. Reputação desnormalizada em `company_stats`

- Status: aceito
- Data: 2026-09-29

## Contexto

A busca ordena por nota e mostra selo de reputação em cada card. Calcular `avg()` sobre `reviews` a cada busca cresce com o volume de avaliações.

## Decisão

`company_stats` guarda nota média, total de avaliações e projetos concluídos. Triggers em `reviews` e `quote_requests` recalculam só a empresa afetada.

"Projetos concluídos" = pedidos fechados em que o solicitante marcou o prestador como escolhido (`quote_requests.prestador_escolhido_id`).

## Consequências

- Busca lê uma linha por empresa, com índice.
- Escrita de avaliação fica um pouco mais cara, o que é aceitável.
- Avaliação exige `quote_id`: só avalia quem pediu o orçamento e recebeu resposta daquele prestador (`can_review`).
