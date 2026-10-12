# 0009. Orçamento do fornecedor com link público

- Status: aceito
- Data: 2026-10-10

## Contexto

A resposta a um pedido era só mensagem, valor e prazo. Fornecedores industriais mandam orçamento item a item, com validade e condições, e muitas vezes para clientes que não usam o InduxHub.

## Decisão

- Tabelas `proposals` e `proposal_items`. Um orçamento serve para responder um pedido (`quote_id`) ou para cliente avulso (nome, documento, contato em texto).
- Toda escrita passa por funções `SECURITY DEFINER`. Totais são calculados no banco a partir dos itens.
- Número sequencial por fornecedor, definido no envio. Nova versão mantém o número e marca a anterior como `substituido`.
- O cliente acessa por `token_publico` (uuid) em `/p/[token]`, sem login. Orçamento avulso é aceito por quem tem o link. Orçamento de pedido só é aceito pelo solicitante logado, para ninguém fechar o pedido de outra empresa.
- Enviar orçamento de pedido grava/atualiza `quote_replies` (valor = total, `proposal_id`). Comparação, avaliação e reputação continuam funcionando sem mudança.
- Aceitar fecha o pedido com o fornecedor. Gatilho em `quote_requests` marca os outros orçamentos do pedido como recusados, também quando o solicitante usa "Escolher".
- Vencido não é status gravado: `enviado` com validade passada aparece como "Vencido" (`proposal_effective_status`).
- PDF gerado na hora com `@react-pdf/renderer` em `/p/[token]/pdf`, sem guardar arquivo.

## Consequências

- Quem recebe o link encaminhado também pode aceitar um orçamento avulso. Aceitável: o fornecedor confirma com o cliente antes de executar.
- Sem limite de orçamentos no plano gratuito por enquanto.
- Sem e-mail automático: o fornecedor manda o link pelo WhatsApp ou copia.
