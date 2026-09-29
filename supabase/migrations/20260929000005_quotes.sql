-- Pedidos de orçamento, distribuição para prestadores e respostas.

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  solicitante_id uuid not null references public.companies (id) on delete cascade,
  criado_por uuid references auth.users (id) on delete set null,
  titulo text not null check (char_length(titulo) between 5 and 140),
  descricao text not null check (char_length(descricao) between 20 and 5000),
  category_id int not null references public.categories (id),
  city_id int not null references public.cities (id),
  prazo_desejado date,
  -- Caminhos no bucket privado "quote-attachments", sempre em "{solicitante_id}/...".
  anexos text[] not null default '{}' check (cardinality(anexos) <= 10),
  status public.quote_status not null default 'aberto',
  prestador_escolhido_id uuid references public.companies (id) on delete set null,
  fechado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quote_requests_solicitante_idx on public.quote_requests (solicitante_id, created_at desc);
create index quote_requests_escolhido_idx on public.quote_requests (prestador_escolhido_id)
  where prestador_escolhido_id is not null;

create trigger quote_requests_set_updated_at
  before update on public.quote_requests
  for each row execute function public.set_updated_at();

create table public.quote_recipients (
  quote_id uuid not null references public.quote_requests (id) on delete cascade,
  prestador_id uuid not null references public.companies (id) on delete cascade,
  enviado_em timestamptz not null default now(),
  visualizado_em timestamptz,
  respondido_em timestamptz,
  primary key (quote_id, prestador_id)
);

create index quote_recipients_prestador_idx on public.quote_recipients (prestador_id, enviado_em desc);

create table public.quote_replies (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quote_requests (id) on delete cascade,
  prestador_id uuid not null references public.companies (id) on delete cascade,
  autor_user_id uuid references auth.users (id) on delete set null,
  mensagem text not null check (char_length(mensagem) between 10 and 5000),
  valor_estimado numeric(12, 2) check (valor_estimado >= 0),
  prazo_dias smallint check (prazo_dias between 1 and 730),
  created_at timestamptz not null default now(),
  unique (quote_id, prestador_id),
  foreign key (quote_id, prestador_id) references public.quote_recipients (quote_id, prestador_id) on delete cascade
);

create index quote_replies_prestador_idx on public.quote_replies (prestador_id);

-- Helpers de acesso (SECURITY DEFINER evita recursão entre policies das três tabelas).
create function public.is_quote_owner(p_quote_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.quote_requests q
    join public.company_members m on m.company_id = q.solicitante_id
    where q.id = p_quote_id
      and m.user_id = (select auth.uid())
  )
$$;

create function public.is_quote_recipient(p_quote_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.quote_recipients r
    join public.company_members m on m.company_id = r.prestador_id
    where r.quote_id = p_quote_id
      and m.user_id = (select auth.uid())
  )
$$;

-- Máximo de prestadores notificados por pedido. Prioriza premium e melhor reputação.
create function public.quote_max_recipients()
returns int
language sql
immutable
set search_path = ''
as $$
  select 30
$$;

create function public.create_quote_request(
  p_solicitante_id uuid,
  p_titulo text,
  p_descricao text,
  p_category_id int,
  p_city_id int,
  p_prazo_desejado date default null,
  p_anexos text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote_id uuid;
  v_prestador_id uuid;
  v_path text;
begin
  if not public.is_member(p_solicitante_id) then
    raise exception 'Sem permissão para solicitar em nome desta empresa' using errcode = '42501';
  end if;

  foreach v_path in array coalesce(p_anexos, '{}') loop
    if split_part(v_path, '/', 1) <> p_solicitante_id::text then
      raise exception 'Anexo fora da pasta da empresa: %', v_path using errcode = '22023';
    end if;
  end loop;

  insert into public.quote_requests (
    solicitante_id, criado_por, titulo, descricao, category_id, city_id, prazo_desejado, anexos
  )
  values (
    p_solicitante_id, auth.uid(), p_titulo, p_descricao, p_category_id, p_city_id,
    p_prazo_desejado, coalesce(p_anexos, '{}')
  )
  returning id into v_quote_id;

  for v_prestador_id in
    select c.id
    from public.companies c
    left join public.company_stats s on s.company_id = c.id
    where c.tipo in ('prestador', 'ambos')
      and c.id <> p_solicitante_id
      and exists (
        select 1 from public.company_categories cc
        where cc.company_id = c.id and cc.category_id = p_category_id
      )
      and (
        c.city_id = p_city_id
        or exists (
          select 1 from public.company_cities ci
          where ci.company_id = c.id and ci.city_id = p_city_id
        )
      )
    order by c.premium desc, s.nota_media desc nulls last, c.created_at
    limit public.quote_max_recipients()
  loop
    insert into public.quote_recipients (quote_id, prestador_id) values (v_quote_id, v_prestador_id);
    perform public.bump_metric(v_prestador_id, 'orcamentos_recebidos');
  end loop;

  return v_quote_id;
end;
$$;

create function public.mark_quote_viewed(p_quote_id uuid, p_prestador_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_member(p_prestador_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;

  update public.quote_recipients
  set visualizado_em = coalesce(visualizado_em, now())
  where quote_id = p_quote_id and prestador_id = p_prestador_id;
end;
$$;

create function public.reply_to_quote(
  p_quote_id uuid,
  p_prestador_id uuid,
  p_mensagem text,
  p_valor_estimado numeric default null,
  p_prazo_dias int default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reply_id uuid;
  v_status public.quote_status;
begin
  if not public.is_member(p_prestador_id) then
    raise exception 'Sem permissão para responder por esta empresa' using errcode = '42501';
  end if;

  select q.status into v_status
  from public.quote_requests q
  join public.quote_recipients r on r.quote_id = q.id and r.prestador_id = p_prestador_id
  where q.id = p_quote_id
  for update of q;

  if not found then
    raise exception 'Pedido não encontrado para este prestador' using errcode = 'P0002';
  end if;
  if v_status = 'fechado' then
    raise exception 'Pedido já foi fechado' using errcode = 'P0001', hint = 'quote_closed';
  end if;

  insert into public.quote_replies (quote_id, prestador_id, autor_user_id, mensagem, valor_estimado, prazo_dias)
  values (p_quote_id, p_prestador_id, auth.uid(), p_mensagem, p_valor_estimado, p_prazo_dias)
  returning id into v_reply_id;

  update public.quote_recipients
  set respondido_em = now(), visualizado_em = coalesce(visualizado_em, now())
  where quote_id = p_quote_id and prestador_id = p_prestador_id;

  update public.quote_requests
  set status = 'respondido'
  where id = p_quote_id and status = 'aberto';

  return v_reply_id;
end;
$$;

-- Fecha o pedido. O prestador escolhido (opcional) precisa ter respondido.
create function public.close_quote(p_quote_id uuid, p_prestador_escolhido_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_quote_owner(p_quote_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;

  if p_prestador_escolhido_id is not null and not exists (
    select 1 from public.quote_replies r
    where r.quote_id = p_quote_id and r.prestador_id = p_prestador_escolhido_id
  ) then
    raise exception 'Prestador escolhido não respondeu a este pedido' using errcode = '22023';
  end if;

  update public.quote_requests
  set status = 'fechado',
      prestador_escolhido_id = p_prestador_escolhido_id,
      fechado_em = now()
  where id = p_quote_id and status <> 'fechado';
end;
$$;

-- RLS: toda escrita passa pelas funções acima ---------------------------------

alter table public.quote_requests enable row level security;
alter table public.quote_recipients enable row level security;
alter table public.quote_replies enable row level security;

create policy "quote_requests: solicitante e destinatários leem" on public.quote_requests
  for select to authenticated
  using (public.is_member(solicitante_id) or public.is_quote_recipient(id));

create policy "quote_recipients: solicitante e prestador leem" on public.quote_recipients
  for select to authenticated
  using (public.is_member(prestador_id) or public.is_quote_owner(quote_id));

create policy "quote_replies: solicitante e autor leem" on public.quote_replies
  for select to authenticated
  using (public.is_member(prestador_id) or public.is_quote_owner(quote_id));

revoke insert, update, delete on public.quote_requests, public.quote_recipients, public.quote_replies
  from anon, authenticated;
revoke select on public.quote_requests, public.quote_recipients, public.quote_replies from anon;

revoke execute on function public.is_quote_owner(uuid) from public, anon;
revoke execute on function public.is_quote_recipient(uuid) from public, anon;
revoke execute on function public.create_quote_request(uuid, text, text, int, int, date, text[]) from public, anon;
revoke execute on function public.mark_quote_viewed(uuid, uuid) from public, anon;
revoke execute on function public.reply_to_quote(uuid, uuid, text, numeric, int) from public, anon;
revoke execute on function public.close_quote(uuid, uuid) from public, anon;

grant execute on function public.is_quote_owner(uuid) to authenticated;
grant execute on function public.is_quote_recipient(uuid) to authenticated;
grant execute on function public.create_quote_request(uuid, text, text, int, int, date, text[]) to authenticated;
grant execute on function public.mark_quote_viewed(uuid, uuid) to authenticated;
grant execute on function public.reply_to_quote(uuid, uuid, text, numeric, int) to authenticated;
grant execute on function public.close_quote(uuid, uuid) to authenticated;
