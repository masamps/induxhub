# 0007. Autenticação, sessão e empresa ativa

- Status: aceito
- Data: 2026-10-02

## Contexto

Login, cadastro, painel e orçamentos precisam de sessão. Home, busca e perfil público não, e devem continuar estáticos e em cache (ADR 0006).

## Decisão

- Supabase Auth com e-mail e senha, via `@supabase/ssr` (sessão em cookies).
- `src/middleware.ts` roda só em `/painel`, `/orcamentos`, `/login`, `/cadastro` e `/auth`. Renova o token e manda para `/login?next=` quem não está logado.
- Páginas e actions validam de novo com `getUser()` (servidor de auth), não só o cookie.
- O header lê a sessão no navegador (`AccountNav`). Assim o layout raiz não lê cookies e as páginas públicas seguem estáticas.
- Cadastro em etapas: a conta é criada na primeira etapa. Se a confirmação de e-mail estiver ligada, o rascunho fica no `localStorage` e o link de confirmação (`/auth/confirm?next=`) volta para a etapa seguinte.
- Empresa ativa: a primeira empresa do usuário (`company_members` mais antigo). Troca de empresa fica para quando houver usuários com mais de uma.
- `next` só aceita caminhos internos (`safeNext`).

## Consequências

- Header mostra um espaço vazio por um instante antes de saber se há sessão.
- Sem SMTP próprio, o Supabase envia poucos e-mails por hora. Até configurar SMTP, a confirmação de e-mail deve ficar desligada no projeto.
