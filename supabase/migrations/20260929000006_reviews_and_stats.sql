-- Avaliações e reputação desnormalizada (nota média, total, projetos concluídos).

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quote_requests (id) on delete cascade,
  prestador_id uuid not null references public.companies (id) on delete cascade,
  autor_company_id uuid not null references public.companies (id) on delete cascade,
  autor_user_id uuid references auth.users (id) on delete set null,
  nota smallint not null check (nota between 1 and 5),
  comentario text check (char_length(comentario) <= 2000),
  projeto_descricao text check (char_length(projeto_descricao) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quote_id, prestador_id)
);

create index reviews_prestador_idx on public.reviews (prestador_id, created_at desc);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- Regra de negócio: só avalia quem pediu o orçamento e recebeu resposta daquele prestador.
create function public.can_review(p_quote_id uuid, p_prestador_id uuid, p_autor_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_member(p_autor_company_id)
    and exists (
      select 1
      from public.quote_requests q
      join public.quote_replies r on r.quote_id = q.id
      where q.id = p_quote_id
        and q.solicitante_id = p_autor_company_id
        and r.prestador_id = p_prestador_id
    )
$$;

create table public.company_stats (
  company_id uuid primary key references public.companies (id) on delete cascade,
  nota_media numeric(3, 2),
  total_avaliacoes int not null default 0,
  projetos_concluidos int not null default 0,
  updated_at timestamptz not null default now()
);

create index company_stats_nota_idx on public.company_stats (nota_media desc nulls last, total_avaliacoes desc);

create function public.refresh_company_stats(p_company_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.company_stats as s (company_id, nota_media, total_avaliacoes, projetos_concluidos, updated_at)
  select
    p_company_id,
    (select round(avg(r.nota), 2) from public.reviews r where r.prestador_id = p_company_id),
    (select count(*) from public.reviews r where r.prestador_id = p_company_id),
    (select count(*) from public.quote_requests q
      where q.prestador_escolhido_id = p_company_id and q.status = 'fechado'),
    now()
  on conflict (company_id) do update set
    nota_media = excluded.nota_media,
    total_avaliacoes = excluded.total_avaliacoes,
    projetos_concluidos = excluded.projetos_concluidos,
    updated_at = excluded.updated_at
$$;

create function public.companies_init_stats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.company_stats (company_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger companies_init_stats
  after insert on public.companies
  for each row execute function public.companies_init_stats();

create function public.reviews_refresh_stats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_company_stats(old.prestador_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or new.prestador_id <> old.prestador_id or new.nota <> old.nota) then
    perform public.refresh_company_stats(new.prestador_id);
  end if;
  return null;
end;
$$;

create trigger reviews_refresh_stats
  after insert or update or delete on public.reviews
  for each row execute function public.reviews_refresh_stats();

create function public.quotes_refresh_stats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.prestador_escolhido_id is not null then
    perform public.refresh_company_stats(old.prestador_escolhido_id);
  end if;
  if new.prestador_escolhido_id is not null
     and new.prestador_escolhido_id is distinct from old.prestador_escolhido_id then
    perform public.refresh_company_stats(new.prestador_escolhido_id);
  end if;
  return null;
end;
$$;

create trigger quotes_refresh_stats
  after update of status, prestador_escolhido_id on public.quote_requests
  for each row
  when (old.status is distinct from new.status or old.prestador_escolhido_id is distinct from new.prestador_escolhido_id)
  execute function public.quotes_refresh_stats();

-- RLS -------------------------------------------------------------------------

alter table public.reviews enable row level security;
alter table public.company_stats enable row level security;

create policy "reviews: leitura pública" on public.reviews
  for select to anon, authenticated using (true);

create policy "reviews: solicitante com resposta avalia" on public.reviews
  for insert to authenticated
  with check (
    autor_user_id = (select auth.uid())
    and public.can_review(quote_id, prestador_id, autor_company_id)
  );

create policy "reviews: autor edita" on public.reviews
  for update to authenticated
  using (public.is_member(autor_company_id))
  with check (public.is_member(autor_company_id));

create policy "reviews: autor remove" on public.reviews
  for delete to authenticated
  using (public.is_member(autor_company_id));

create policy "company_stats: leitura pública" on public.company_stats
  for select to anon, authenticated using (true);

revoke insert, update, delete on public.reviews from anon;
revoke update on public.reviews from authenticated;
grant update (nota, comentario, projeto_descricao) on public.reviews to authenticated;
revoke insert, update, delete on public.company_stats from anon, authenticated;

revoke execute on function public.can_review(uuid, uuid, uuid) from public, anon;
grant execute on function public.can_review(uuid, uuid, uuid) to authenticated;
revoke execute on function public.refresh_company_stats(uuid) from public, anon, authenticated;
revoke execute on function public.companies_init_stats() from public, anon, authenticated;
revoke execute on function public.reviews_refresh_stats() from public, anon, authenticated;
revoke execute on function public.quotes_refresh_stats() from public, anon, authenticated;
