# 0006. Leitura pública sem sessão e cache por página

- Status: aceito
- Data: 2026-09-29

## Contexto

Home, busca e perfil são as páginas de maior tráfego e não dependem de quem está logado. Ler cookies de sessão nessas páginas tornaria toda renderização dinâmica.

## Decisão

- Dados públicos usam `createPublicClient()` (chave anônima, sem cookies), só no servidor.
- Home e perfil usam ISR com `revalidate = 300`. Perfis são gerados no primeiro acesso.
- Categorias e cidades ficam em `unstable_cache` por 1 hora.
- `/buscar` é dinâmica (depende dos filtros) e usa a função `search_companies`, paginada.
- Eventos de métrica vão por `navigator.sendBeacon` para `/api/events`, que chama `track_event`.

## Consequências

- Mudanças no perfil levam até 5 minutos para aparecer. Quando existir edição de perfil, a action chama `revalidatePath`.
- O cliente com sessão (`@supabase/ssr`) entra junto com login e painel.
