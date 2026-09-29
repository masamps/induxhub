-- Buckets e policies do Storage. Todo arquivo fica em "{company_id}/...".

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('company-media', 'company-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('certifications', 'certifications', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png']),
  ('quote-attachments', 'quote-attachments', false, 20971520, array[
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    'application/zip', 'application/octet-stream',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ])
on conflict (id) do nothing;

-- Pasta raiz do objeto pertence a uma empresa do usuário atual.
create function public.owns_storage_folder(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_members m
    where m.user_id = (select auth.uid())
      and m.company_id::text = split_part(p_name, '/', 1)
  )
$$;

-- Destinatário de um pedido que lista este arquivo como anexo.
create function public.can_read_quote_attachment(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.quote_requests q
    join public.quote_recipients r on r.quote_id = q.id
    join public.company_members m on m.company_id = r.prestador_id
    where q.solicitante_id::text = split_part(p_name, '/', 1)
      and p_name = any (q.anexos)
      and m.user_id = (select auth.uid())
  )
$$;

revoke execute on function public.owns_storage_folder(text) from public, anon;
revoke execute on function public.can_read_quote_attachment(text) from public, anon;
grant execute on function public.owns_storage_folder(text) to authenticated;
grant execute on function public.can_read_quote_attachment(text) to authenticated;

-- company-media: bucket público (leitura via URL pública); escrita por membros.
create policy "company-media: membros enviam" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'company-media' and public.owns_storage_folder(name));

create policy "company-media: membros editam" on storage.objects
  for update to authenticated
  using (bucket_id = 'company-media' and public.owns_storage_folder(name))
  with check (bucket_id = 'company-media' and public.owns_storage_folder(name));

create policy "company-media: membros removem" on storage.objects
  for delete to authenticated
  using (bucket_id = 'company-media' and public.owns_storage_folder(name));

-- certifications: privado, só membros.
create policy "certifications: membros leem" on storage.objects
  for select to authenticated
  using (bucket_id = 'certifications' and public.owns_storage_folder(name));

create policy "certifications: membros enviam" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'certifications' and public.owns_storage_folder(name));

create policy "certifications: membros removem" on storage.objects
  for delete to authenticated
  using (bucket_id = 'certifications' and public.owns_storage_folder(name));

-- quote-attachments: solicitante gerencia; destinatários só leem.
create policy "quote-attachments: solicitante e destinatários leem" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'quote-attachments'
    and (public.owns_storage_folder(name) or public.can_read_quote_attachment(name))
  );

create policy "quote-attachments: solicitante envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'quote-attachments' and public.owns_storage_folder(name));

create policy "quote-attachments: solicitante remove" on storage.objects
  for delete to authenticated
  using (bucket_id = 'quote-attachments' and public.owns_storage_folder(name));
