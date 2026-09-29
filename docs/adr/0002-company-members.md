# 0002. Vínculo usuário ↔ empresa por `company_members`

- Status: aceito
- Data: 2026-09-29

## Contexto

O modelo inicial não ligava usuários a empresas. Sem isso, a regra "prestador só edita o próprio perfil" não tem como ser expressa em RLS. Indústrias costumam ter mais de uma pessoa cuidando de compras.

## Decisão

Tabela `company_members (company_id, user_id, role)`. Policies usam `is_member(company_id)`, uma função `security definer` que evita recursão de RLS. A empresa é criada por `create_company()`, que vincula o usuário como `owner` na mesma transação.

## Consequências

- Várias pessoas por empresa desde o início, sem migração futura.
- Um usuário pode pertencer a mais de uma empresa; o app escolhe a empresa ativa.
- Convites de novos membros ficam para uma etapa futura.
