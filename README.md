# InduxHub

Conectando a indústria ao fornecedor certo.

Marketplace industrial que liga indústrias que precisam de serviços a prestadores especializados. Região inicial: Sorocaba e interior de São Paulo.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Supabase (Postgres, Auth, Storage, RLS) · Zod · Vercel.

## Rodando localmente

Requisitos: Node 20+ e Docker (para o Supabase local).

```bash
npm install
npx supabase start          # sobe Postgres, Auth, Storage e API locais
npm run db:reset            # aplica migrations e seed
cp .env.example .env.local  # preencha com a saída de `npx supabase status`
npm run dev                 # http://localhost:3000
```

### Variáveis de ambiente

| Variável | Onde encontrar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `API URL` em `npx supabase status`, ou Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon key` (ou `publishable key`) na mesma saída |
| `NEXT_PUBLIC_SITE_URL` | URL pública do site. Local: `http://localhost:3000` |

O build gera a home estaticamente, então precisa do banco acessível.

### Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` / `npm run typecheck` | ESLint e TypeScript |
| `npm run db:reset` | Recria o banco local com migrations e seed |
| `npm run db:test` | Testes pgTAP de RLS e regras de negócio |
| `npm run db:types` | Regenera `src/types/database.ts` a partir do banco local |
| `npm run test:e2e` | Fluxo completo no navegador (Playwright). Precisa do banco local com seed e de `npm run build` |

## Deploy (Vercel)

1. Crie um projeto no Supabase e rode `npx supabase link` e `npx supabase db push`.
2. Importe o repositório na Vercel e configure as três variáveis acima.
3. Não rode o seed em produção: ele cria usuários de teste.
4. No Supabase, em Authentication > URL Configuration: Site URL com a URL da Vercel e Redirect URL `https://<seu-dominio>/**`.
5. Sem SMTP próprio, desligue "Confirm email" em Authentication > Providers > Email (o envio gratuito é limitado). Ao ligar, o cadastro continua funcionando: o usuário confirma pelo link e volta para a etapa seguinte.
6. Ambiente de teste sem SMTP: defina `AUTH_AUTOCONFIRM=true` e `SUPABASE_SERVICE_ROLE_KEY` (Project Settings > API) só nesse ambiente. O cadastro cria a conta já confirmada e não envia e-mail. Nunca em produção.

## Páginas

| Rota | Estado |
|---|---|
| `/` | Home com busca, categorias e destaques |
| `/buscar` | Resultados com filtros, ordenação e paginação |
| `/prestador/[slug]` | Perfil público completo |
| `/login`, `/login/recuperar`, `/login/nova-senha` | Entrar e recuperar senha |
| `/cadastro` | Escolha entre contratar ou oferecer serviços |
| `/cadastro/empresa`, `/cadastro/prestador` | Cadastro em etapas com barra de progresso e rascunho salvo |
| `/painel` | Métricas de 30 dias, gráfico, checklist do perfil, pedidos recentes |
| `/painel/perfil` | Dados, área de atuação, logo e fotos, equipamentos, certificações, clientes |
| `/painel/orcamentos` | Pedidos recebidos pelo prestador (novos, respondidos) |
| `/orcamentos` | Pedidos do solicitante |
| `/orcamentos/novo` | Novo pedido com anexos e prévia de quantos fornecedores recebem |
| `/orcamentos/[id]` | Solicitante compara propostas, escolhe e avalia. Prestador responde |

## Estrutura

```
src/
  app/                  rotas (Server Components por padrão)
  components/ui/        componentes base (padrão shadcn)
  components/layout/    header, footer, container
  features/<domínio>/   queries, schemas e componentes por domínio
  lib/                  env, cliente Supabase, validação (CNPJ, telefone), formatação
  types/database.ts     tipos gerados do banco
supabase/               migrations, seed e testes
docs/adr/               decisões de arquitetura
```

Regra de camadas: componentes não acessam o banco. Páginas chamam `features/*/queries.ts`, que devolvem tipos de domínio.

## Banco de dados

Studio local: http://127.0.0.1:54323

### Usuários de teste

Todo usuário do seed usa o e-mail `<slug>@induxhub.test` e a senha `induxhub123`.

| Perfil | E-mail |
|---|---|
| Prestador premium | `usinagem-precisao-sorocaba@induxhub.test` |
| Prestador sem avaliações | `solda-forte-salto@induxhub.test` |
| Contratante com pedidos | `embalagens-itu@induxhub.test` |

### Regras principais

- RLS ativa em todas as tabelas.
- Membro da empresa (`company_members`) edita só o próprio perfil. `premium` não é editável pelo cliente.
- Pedidos, respostas e fechamento passam por funções (`create_quote_request`, `reply_to_quote`, `close_quote`).
- Avaliação só por quem pediu o orçamento e recebeu resposta daquele prestador.
- Plano gratuito: até 5 fotos. Premium: até 30.
- Prestador liga ou desliga "também contrato serviços" por `set_company_buyer` (único jeito de mudar `tipo`).
- Métricas do perfil via `track_event()`, agregadas por dia.
- Busca: `search_companies(query, cidade, categoria, ordenação, limite, offset)`. Premium sempre primeiro.

Fotos do seed apontam para `/seed/fotos/*.svg` (placeholders em `public/`). Caminhos sem `/` inicial ficam no bucket `company-media`.
