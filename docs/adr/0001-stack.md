# 0001. Stack e hospedagem

- Status: aceito
- Data: 2026-09-29

## Contexto

Marketplace B2B com leitura pública pesada (busca, perfis) e escrita moderada (cadastro, orçamentos). Time pequeno, sem equipe de infraestrutura.

## Decisão

- Next.js 15 (App Router) com Server Components por padrão, na Vercel.
- Supabase: Postgres, Auth, Storage e RLS.
- Regras de acesso ficam no banco (RLS + funções), não só na aplicação.

## Consequências

- O mesmo controle vale para o app, scripts e acesso direto via PostgREST.
- Regras críticas (distribuição de pedidos, avaliação) rodam em funções `security definer`, testadas com pgTAP em `supabase/tests`.
- Dependência do Supabase; migrations em SQL puro reduzem o custo de sair.
