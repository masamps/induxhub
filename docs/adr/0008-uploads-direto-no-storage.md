# 0008. Uploads direto do navegador para o Storage

- Status: aceito
- Data: 2026-10-02

## Contexto

Fotos, logos, certificados e anexos de pedidos passam de alguns MB. Server actions na Vercel têm limite de corpo de requisição e cobram pelo tempo de função.

## Decisão

- O navegador envia o arquivo direto ao Supabase Storage, com a sessão do usuário.
- Caminho sempre começa pelo id da empresa: `{company_id}/...`. As policies do Storage (`owns_storage_folder`) só aceitam pastas de empresas do usuário.
- Depois do upload, a action grava só o caminho no banco e confere de novo o prefixo.
- Logo e fotos: bucket público `company-media`. Certificados e anexos: buckets privados, lidos por URL assinada de 10 minutos.
- Limite de fotos do plano é garantido por trigger (`enforce_photo_limit`). Se o insert falha, a action apaga o arquivo enviado.
- Anexos de pedido aceitam desenhos CAD (`dwg`, `dxf`, `step`) como `application/octet-stream`.

## Consequências

- Arquivos de um upload abandonado (usuário fecha a página antes de salvar) ficam órfãos no Storage. Limpeza periódica fica para depois.
