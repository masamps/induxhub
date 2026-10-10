-- Orçamentos (propostas) criados pelo fornecedor: item a item, com totais, validade e link público.
-- Servem para responder um pedido do marketplace ou para um cliente avulso, fora da plataforma.

create type public.proposal_status as enum ('rascunho', 'enviado', 'aceito', 'recusado', 'cancelado', 'substituido');

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  prestador_id uuid not null references public.companies (id) on delete cascade,
  criado_por uuid references auth.users (id) on delete set null,
  -- Número sequencial por fornecedor, definido no envio. Novas versões mantêm o número.
  numero int,
  versao smallint not null default 1 check (versao between 1 and 99),
  origem_id uuid references public.proposals (id) on delete set null,
  quote_id uuid references public.quote_requests (id) on delete set null,
  cliente_company_id uuid references public.companies (id) on delete set null,
  cliente_nome text check (char_length(cliente_nome) between 2 and 160),
  cliente_documento text check (cliente_documento ~ '^(\d{11}|\d{14})$'),
  cliente_email extensions.citext check (char_length(cliente_email) <= 254),
  cliente_whatsapp text check (cliente_whatsapp ~ '^\d{10,13}$'),
  titulo text not null check (char_length(titulo) between 3 and 140),
  observacoes text check (char_length(observacoes) <= 5000),
  condicoes_pagamento text check (char_length(condicoes_pagamento) <= 500),
  prazo_entrega_dias smallint check (prazo_entrega_dias between 1 and 730),
  validade date not null,
  desconto numeric(12, 2) not null default 0 check (desconto >= 0),
  frete numeric(12, 2) not null default 0 check (frete >= 0),
  subtotal numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0 check (total >= 0),
  status public.proposal_status not null default 'rascunho',
  -- Quem tem o link vê o orçamento. Só vale depois do envio.
  token_publico uuid not null default gen_random_uuid() unique,
  enviado_em timestamptz,
  visualizado_em timestamptz,
  respondido_em timestamptz,
  motivo_recusa text check (char_length(motivo_recusa) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (prestador_id, numero, versao),
  check (status = 'rascunho' or (numero is not null and enviado_em is not null and cliente_nome is not null))
);

create index proposals_prestador_idx on public.proposals (prestador_id, updated_at desc);
create index proposals_quote_idx on public.proposals (quote_id) where quote_id is not null;
create index proposals_cliente_idx on public.proposals (cliente_company_id) where cliente_company_id is not null;
-- Um rascunho por pedido e fornecedor.
create unique index proposals_quote_draft_uniq on public.proposals (quote_id, prestador_id)
  where quote_id is not null and status = 'rascunho';

create trigger proposals_set_updated_at
  before update on public.proposals
  for each row execute function public.set_updated_at();

create table public.proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  ordem smallint not null check (ordem between 1 and 200),
  descricao text not null check (char_length(descricao) between 1 and 500),
  unidade text not null default 'un' check (unidade in ('un', 'h', 'kg', 'm', 'm2', 'm3', 'l', 'pc', 'cj', 'servico')),
  quantidade numeric(12, 3) not null check (quantidade > 0),
  valor_unitario numeric(12, 2) not null check (valor_unitario >= 0),
  total numeric(14, 2) generated always as (round(quantidade * valor_unitario, 2)) stored,
  unique (proposal_id, ordem)
);

-- Resposta do marketplace aponta para o orçamento que a gerou.
alter table public.quote_replies
  add column proposal_id uuid references public.proposals (id) on delete set null;

-- Helpers ---------------------------------------------------------------------

-- Status visto pelas telas: enviado com validade vencida aparece como expirado.
create function public.proposal_effective_status(p_status public.proposal_status, p_validade date)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_status = 'enviado' and p_validade < public.today_local() then 'expirado'
    else p_status::text
  end
$$;

create function public.can_read_proposal(p_proposal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.proposals p
    where p.id = p_proposal_id
      and (
        public.is_member(p.prestador_id)
        or (p.status <> 'rascunho' and p.cliente_company_id is not null and public.is_member(p.cliente_company_id))
      )
  )
$$;

-- Escrita -----------------------------------------------------------------------

-- Cria (p_id nulo) ou edita um rascunho, trocando todos os itens.
-- p_dados: titulo, quote_id, cliente_nome, cliente_documento, cliente_email, cliente_whatsapp,
--          observacoes, condicoes_pagamento, prazo_entrega_dias, validade, desconto, frete.
-- p_itens: [{descricao, unidade, quantidade, valor_unitario}]
create function public.save_proposal(p_prestador_id uuid, p_dados jsonb, p_itens jsonb, p_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := p_id;
  v_quote_id uuid := nullif(p_dados ->> 'quote_id', '')::uuid;
  v_cliente_company uuid;
  v_cliente_nome text := nullif(btrim(p_dados ->> 'cliente_nome'), '');
  v_status public.proposal_status;
  v_quote_status public.quote_status;
  v_subtotal numeric(14, 2);
  v_desconto numeric(12, 2) := coalesce(nullif(p_dados ->> 'desconto', '')::numeric, 0);
  v_frete numeric(12, 2) := coalesce(nullif(p_dados ->> 'frete', '')::numeric, 0);
begin
  if not public.is_member(p_prestador_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.companies where id = p_prestador_id and tipo in ('prestador', 'ambos')
  ) then
    raise exception 'Só fornecedores criam orçamentos' using errcode = '22023';
  end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) > 200 then
    raise exception 'Itens inválidos' using errcode = '22023';
  end if;

  if v_id is not null then
    select status, quote_id into v_status, v_quote_id
    from public.proposals
    where id = v_id and prestador_id = p_prestador_id
    for update;
    if not found then
      raise exception 'Orçamento não encontrado' using errcode = 'P0002';
    end if;
    if v_status <> 'rascunho' then
      raise exception 'Só rascunhos podem ser editados' using errcode = 'P0001', hint = 'proposal_not_draft';
    end if;
  end if;

  if v_quote_id is not null then
    select q.status, q.solicitante_id into v_quote_status, v_cliente_company
    from public.quote_requests q
    join public.quote_recipients r on r.quote_id = q.id and r.prestador_id = p_prestador_id
    where q.id = v_quote_id;
    if not found then
      raise exception 'Pedido não encontrado para este fornecedor' using errcode = 'P0002';
    end if;
    if v_quote_status = 'fechado' then
      raise exception 'Pedido já foi fechado' using errcode = 'P0001', hint = 'quote_closed';
    end if;
    if v_cliente_nome is null then
      select c.nome_fantasia into v_cliente_nome
      from public.companies c where c.id = v_cliente_company;
    end if;
  end if;

  if v_id is null then
    insert into public.proposals (prestador_id, criado_por, quote_id, cliente_company_id, titulo, validade)
    values (
      p_prestador_id, auth.uid(), v_quote_id, v_cliente_company,
      coalesce(p_dados ->> 'titulo', ''),
      coalesce(nullif(p_dados ->> 'validade', '')::date, public.today_local() + 15)
    )
    returning id into v_id;
  end if;

  delete from public.proposal_items where proposal_id = v_id;
  insert into public.proposal_items (proposal_id, ordem, descricao, unidade, quantidade, valor_unitario)
  select
    v_id,
    i.ordinality,
    btrim(i.value ->> 'descricao'),
    coalesce(nullif(i.value ->> 'unidade', ''), 'un'),
    (i.value ->> 'quantidade')::numeric,
    (i.value ->> 'valor_unitario')::numeric
  from jsonb_array_elements(p_itens) with ordinality as i;

  select coalesce(sum(total), 0) into v_subtotal from public.proposal_items where proposal_id = v_id;

  update public.proposals set
    titulo = btrim(coalesce(p_dados ->> 'titulo', '')),
    cliente_company_id = v_cliente_company,
    cliente_nome = v_cliente_nome,
    cliente_documento = nullif(regexp_replace(coalesce(p_dados ->> 'cliente_documento', ''), '\D', '', 'g'), ''),
    cliente_email = nullif(btrim(p_dados ->> 'cliente_email'), ''),
    cliente_whatsapp = nullif(regexp_replace(coalesce(p_dados ->> 'cliente_whatsapp', ''), '\D', '', 'g'), ''),
    observacoes = nullif(btrim(p_dados ->> 'observacoes'), ''),
    condicoes_pagamento = nullif(btrim(p_dados ->> 'condicoes_pagamento'), ''),
    prazo_entrega_dias = nullif(p_dados ->> 'prazo_entrega_dias', '')::smallint,
    validade = coalesce(nullif(p_dados ->> 'validade', '')::date, validade),
    desconto = v_desconto,
    frete = v_frete,
    subtotal = v_subtotal,
    total = v_subtotal - v_desconto + v_frete
  where id = v_id;

  return v_id;
end;
$$;

-- Envia o rascunho: numera, libera o link e, se veio de um pedido, registra a resposta nele.
create function public.send_proposal(p_id uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.proposals;
  v_origem public.proposals;
  v_numero int;
  v_versao smallint := 1;
  v_quote_status public.quote_status;
  v_mensagem text;
begin
  select * into p from public.proposals where id = p_id for update;
  if not found or not public.is_member(p.prestador_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  if p.status <> 'rascunho' then
    raise exception 'Orçamento já enviado' using errcode = 'P0001', hint = 'proposal_not_draft';
  end if;
  if not exists (select 1 from public.proposal_items where proposal_id = p_id) then
    raise exception 'Adicione ao menos um item' using errcode = 'P0001', hint = 'proposal_no_items';
  end if;
  if p.cliente_nome is null then
    raise exception 'Informe o cliente' using errcode = 'P0001', hint = 'proposal_no_client';
  end if;
  if p.validade < public.today_local() then
    raise exception 'Validade já passou' using errcode = 'P0001', hint = 'proposal_expired';
  end if;

  -- Serializa a numeração por fornecedor.
  perform pg_advisory_xact_lock(hashtextextended('proposals:' || p.prestador_id::text, 0));

  if p.origem_id is not null then
    select * into v_origem from public.proposals where id = p.origem_id;
  end if;

  if v_origem.numero is not null then
    v_numero := v_origem.numero;
    select coalesce(max(versao), 0) + 1 into v_versao
    from public.proposals where prestador_id = p.prestador_id and numero = v_numero;
    update public.proposals set status = 'substituido'
    where prestador_id = p.prestador_id and numero = v_numero and status = 'enviado';
  else
    select coalesce(max(numero), 0) + 1 into v_numero
    from public.proposals where prestador_id = p.prestador_id;
  end if;

  if p.quote_id is not null then
    select status into v_quote_status from public.quote_requests where id = p.quote_id for update;
    if v_quote_status = 'fechado' then
      raise exception 'Pedido já foi fechado' using errcode = 'P0001', hint = 'quote_closed';
    end if;
    -- Envio de um novo orçamento para o mesmo pedido substitui o anterior.
    update public.proposals set status = 'substituido'
    where quote_id = p.quote_id and prestador_id = p.prestador_id and status = 'enviado';
  end if;

  update public.proposals set
    status = 'enviado',
    numero = v_numero,
    versao = v_versao,
    enviado_em = now()
  where id = p_id;

  if p.quote_id is not null then
    v_mensagem := left(coalesce(p.observacoes, p.titulo), 4900);
    if char_length(v_mensagem) < 10 then
      v_mensagem := 'Orçamento: ' || v_mensagem;
    end if;

    insert into public.quote_replies (quote_id, prestador_id, autor_user_id, mensagem, valor_estimado, prazo_dias, proposal_id)
    values (p.quote_id, p.prestador_id, auth.uid(), v_mensagem, p.total, p.prazo_entrega_dias, p_id)
    on conflict (quote_id, prestador_id) do update set
      mensagem = excluded.mensagem,
      valor_estimado = excluded.valor_estimado,
      prazo_dias = excluded.prazo_dias,
      proposal_id = excluded.proposal_id,
      autor_user_id = excluded.autor_user_id;

    update public.quote_recipients
    set respondido_em = coalesce(respondido_em, now()), visualizado_em = coalesce(visualizado_em, now())
    where quote_id = p.quote_id and prestador_id = p.prestador_id;

    update public.quote_requests set status = 'respondido'
    where id = p.quote_id and status = 'aberto';
  end if;

  return v_numero;
end;
$$;

-- Copia um orçamento para um novo rascunho. Como nova versão, mantém número e pedido.
create function public.copy_proposal(p_id uuid, p_nova_versao boolean default false)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.proposals;
  v_new uuid;
begin
  select * into p from public.proposals where id = p_id;
  if not found or not public.is_member(p.prestador_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  if p_nova_versao and p.status not in ('enviado', 'recusado') then
    raise exception 'Só orçamentos enviados ou recusados ganham nova versão' using errcode = 'P0001', hint = 'proposal_no_version';
  end if;
  if p_nova_versao and p.quote_id is not null
     and exists (select 1 from public.quote_requests where id = p.quote_id and status = 'fechado') then
    raise exception 'Pedido já foi fechado' using errcode = 'P0001', hint = 'quote_closed';
  end if;
  if p_nova_versao and p.quote_id is not null and exists (
    select 1 from public.proposals
    where quote_id = p.quote_id and prestador_id = p.prestador_id and status = 'rascunho'
  ) then
    raise exception 'Já existe um rascunho para este pedido' using errcode = 'P0001', hint = 'proposal_draft_exists';
  end if;

  insert into public.proposals (
    prestador_id, criado_por, origem_id, quote_id, cliente_company_id,
    cliente_nome, cliente_documento, cliente_email, cliente_whatsapp,
    titulo, observacoes, condicoes_pagamento, prazo_entrega_dias, validade,
    desconto, frete, subtotal, total
  )
  values (
    p.prestador_id, auth.uid(),
    case when p_nova_versao then p.id end,
    case when p_nova_versao then p.quote_id end,
    case when p_nova_versao then p.cliente_company_id end,
    p.cliente_nome, p.cliente_documento, p.cliente_email, p.cliente_whatsapp,
    p.titulo, p.observacoes, p.condicoes_pagamento, p.prazo_entrega_dias,
    greatest(p.validade, public.today_local() + 15),
    p.desconto, p.frete, p.subtotal, p.total
  )
  returning id into v_new;

  insert into public.proposal_items (proposal_id, ordem, descricao, unidade, quantidade, valor_unitario)
  select v_new, ordem, descricao, unidade, quantidade, valor_unitario
  from public.proposal_items where proposal_id = p_id;

  return v_new;
end;
$$;

-- Rascunho é apagado. Enviado vira cancelado.
create function public.cancel_proposal(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.proposals;
begin
  select * into p from public.proposals where id = p_id for update;
  if not found or not public.is_member(p.prestador_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;

  if p.status = 'rascunho' then
    delete from public.proposals where id = p_id;
  elsif p.status = 'enviado' then
    update public.proposals set status = 'cancelado' where id = p_id;
  else
    raise exception 'Este orçamento não pode mais ser cancelado' using errcode = 'P0001', hint = 'proposal_final';
  end if;
end;
$$;

-- Acesso pelo link --------------------------------------------------------------

-- Orçamento completo pelo token, sem login. Marca visualizado quando quem abre não é o fornecedor.
create function public.get_public_proposal(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.proposals;
  v_owner boolean;
  v_quote_owner boolean := false;
begin
  select * into p from public.proposals where token_publico = p_token and status <> 'rascunho';
  if not found then
    return null;
  end if;

  v_owner := public.is_member(p.prestador_id);
  if p.quote_id is not null then
    v_quote_owner := public.is_quote_owner(p.quote_id);
  end if;

  if not v_owner and p.visualizado_em is null then
    update public.proposals set visualizado_em = now() where id = p.id;
    p.visualizado_em := now();
  end if;

  return jsonb_build_object(
    'id', p.id,
    'numero', p.numero,
    'versao', p.versao,
    'status', public.proposal_effective_status(p.status, p.validade),
    'titulo', p.titulo,
    'quote_id', p.quote_id,
    'cliente_nome', p.cliente_nome,
    'cliente_documento', p.cliente_documento,
    'observacoes', p.observacoes,
    'condicoes_pagamento', p.condicoes_pagamento,
    'prazo_entrega_dias', p.prazo_entrega_dias,
    'validade', p.validade,
    'desconto', p.desconto,
    'frete', p.frete,
    'subtotal', p.subtotal,
    'total', p.total,
    'enviado_em', p.enviado_em,
    'respondido_em', p.respondido_em,
    'motivo_recusa', p.motivo_recusa,
    'e_fornecedor', v_owner,
    -- Orçamento de pedido só é aceito pelo solicitante logado.
    'pode_responder', not v_owner and (p.quote_id is null or v_quote_owner),
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object(
        'descricao', i.descricao, 'unidade', i.unidade, 'quantidade', i.quantidade,
        'valor_unitario', i.valor_unitario, 'total', i.total
      ) order by i.ordem)
      from public.proposal_items i where i.proposal_id = p.id
    ), '[]'::jsonb),
    'fornecedor', (
      select jsonb_build_object(
        'id', c.id, 'slug', c.slug, 'nome', c.nome_fantasia,
        'razao_social', c.razao_social, 'cnpj', c.cnpj, 'logo_url', c.logo_url,
        'whatsapp', c.whatsapp, 'email', c.email, 'cidade', ci.nome, 'uf', ci.uf
      )
      from public.companies c
      left join public.cities ci on ci.id = c.city_id
      where c.id = p.prestador_id
    )
  );
end;
$$;

-- Aceite ou recusa pelo cliente. Aceitar orçamento de pedido fecha o pedido com este fornecedor.
create function public.respond_proposal(p_token uuid, p_aceito boolean, p_motivo text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.proposals;
begin
  select * into p from public.proposals where token_publico = p_token and status <> 'rascunho' for update;
  if not found then
    raise exception 'Orçamento não encontrado' using errcode = 'P0002';
  end if;
  if public.is_member(p.prestador_id) then
    raise exception 'O fornecedor não responde o próprio orçamento' using errcode = '42501';
  end if;
  if p.quote_id is not null and not public.is_quote_owner(p.quote_id) then
    raise exception 'Entre com a conta que fez o pedido' using errcode = '42501', hint = 'proposal_login';
  end if;
  if p.status <> 'enviado' then
    raise exception 'Orçamento já respondido ou indisponível' using errcode = 'P0001', hint = 'proposal_final';
  end if;
  if p.validade < public.today_local() then
    raise exception 'Orçamento vencido' using errcode = 'P0001', hint = 'proposal_expired';
  end if;

  update public.proposals set
    status = case when p_aceito then 'aceito'::public.proposal_status else 'recusado'::public.proposal_status end,
    respondido_em = now(),
    visualizado_em = coalesce(visualizado_em, now()),
    motivo_recusa = case when p_aceito then null else left(nullif(btrim(p_motivo), ''), 1000) end
  where id = p.id;

  if p_aceito and p.quote_id is not null then
    -- O gatilho de pedidos fechados marca os demais orçamentos como recusados.
    update public.quote_requests
    set status = 'fechado', prestador_escolhido_id = p.prestador_id, fechado_em = now()
    where id = p.quote_id and status <> 'fechado';
  end if;

  return case when p_aceito then 'aceito' else 'recusado' end;
end;
$$;

-- Pedido fechado: orçamento do escolhido vira aceito, os demais recusados.
create function public.quotes_close_proposals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.proposals set
    status = case when prestador_id = new.prestador_escolhido_id
      then 'aceito'::public.proposal_status else 'recusado'::public.proposal_status end,
    respondido_em = now(),
    motivo_recusa = case when prestador_id = new.prestador_escolhido_id
      then null else 'Pedido fechado com outro fornecedor.' end
  where quote_id = new.id and status = 'enviado';
  return null;
end;
$$;

create trigger quotes_close_proposals
  after update of status on public.quote_requests
  for each row
  when (new.status = 'fechado' and old.status is distinct from new.status)
  execute function public.quotes_close_proposals();

-- RLS: leitura direta, escrita só pelas funções -----------------------------------

alter table public.proposals enable row level security;
alter table public.proposal_items enable row level security;

create policy "proposals: fornecedor e cliente da plataforma leem" on public.proposals
  for select to authenticated
  using (
    public.is_member(prestador_id)
    or (status <> 'rascunho' and cliente_company_id is not null and public.is_member(cliente_company_id))
  );

create policy "proposal_items: quem lê o orçamento lê os itens" on public.proposal_items
  for select to authenticated
  using (public.can_read_proposal(proposal_id));

revoke all on public.proposals, public.proposal_items from anon;
revoke insert, update, delete on public.proposals, public.proposal_items from authenticated;

revoke execute on function public.can_read_proposal(uuid) from public, anon;
revoke execute on function public.save_proposal(uuid, jsonb, jsonb, uuid) from public, anon;
revoke execute on function public.send_proposal(uuid) from public, anon;
revoke execute on function public.copy_proposal(uuid, boolean) from public, anon;
revoke execute on function public.cancel_proposal(uuid) from public, anon;
revoke execute on function public.get_public_proposal(uuid) from public;
revoke execute on function public.respond_proposal(uuid, boolean, text) from public;
revoke execute on function public.quotes_close_proposals() from public, anon, authenticated;

grant execute on function public.can_read_proposal(uuid) to authenticated;
grant execute on function public.save_proposal(uuid, jsonb, jsonb, uuid) to authenticated;
grant execute on function public.send_proposal(uuid) to authenticated;
grant execute on function public.copy_proposal(uuid, boolean) to authenticated;
grant execute on function public.cancel_proposal(uuid) to authenticated;
grant execute on function public.get_public_proposal(uuid) to anon, authenticated;
grant execute on function public.respond_proposal(uuid, boolean, text) to anon, authenticated;
