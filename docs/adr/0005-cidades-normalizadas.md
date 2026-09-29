# 0005. Cidades normalizadas com código IBGE

- Status: aceito
- Data: 2026-09-29

## Contexto

Filtros por cidade com texto livre geram variações ("Tatui", "Tatuí", "tatuí") e quebram busca e distribuição de pedidos.

## Decisão

Tabela `cities (ibge_code, nome, uf, slug)`. Empresas, cidades atendidas e pedidos referenciam `city_id`. URLs usam o `slug`.

## Consequências

- Filtro e distribuição de pedidos por igualdade de chave, com índice.
- Expansão para novas regiões é só inserir cidades.
- `raio_km` fica como informação exibida; a distribuição usa as cidades atendidas.
