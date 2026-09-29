# InduxHub

Conectando a indústria ao fornecedor certo.

Marketplace industrial que liga indústrias que precisam de serviços a prestadores especializados. Região inicial: Sorocaba e interior de São Paulo.

> Etapa atual: banco de dados (schema, RLS e seed). O app Next.js entra nos próximos PRs.

## Banco de dados local

Requisitos: Docker e Node 20+.

```bash
npx supabase start      # sobe Postgres, Auth e Storage locais
npx supabase db reset   # aplica migrations e seed
npx supabase test db    # roda os testes de RLS (pgTAP)
```

Studio local: http://127.0.0.1:54323

### Usuários de teste

Todo usuário do seed usa o e-mail `<slug>@induxhub.test` e a senha `induxhub123`.

| Perfil | E-mail |
|---|---|
| Prestador premium | `usinagem-precisao-sorocaba@induxhub.test` |
| Prestador sem avaliações | `solda-forte-salto@induxhub.test` |
| Contratante com pedidos | `embalagens-itu@induxhub.test` |

### Estrutura

```
supabase/
  migrations/   schema, RLS e funções, em ordem
  seed.sql      19 empresas fictícias, pedidos, respostas e avaliações
  tests/        testes pgTAP de RLS e regras de negócio
docs/adr/       decisões de arquitetura
```

### Regras principais

- RLS ativa em todas as tabelas.
- Membro da empresa (`company_members`) edita só o próprio perfil. `premium` não é editável pelo cliente.
- Pedidos, respostas e fechamento passam por funções (`create_quote_request`, `reply_to_quote`, `close_quote`).
- Avaliação só por quem pediu o orçamento e recebeu resposta daquele prestador.
- Plano gratuito: até 5 fotos. Premium: até 30.
- Métricas do perfil via `track_event()`, agregadas por dia.
- Busca: `search_companies(query, cidade, categoria, ordenação, limite, offset)`. Premium sempre primeiro.

Fotos do seed apontam para `/seed/fotos/*.svg`, placeholders servidos pelo app. Caminhos sem `/` inicial ficam no bucket `company-media`.
