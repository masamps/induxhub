-- Perfil completo do prestador: fotos, equipamentos, certificações e principais clientes.

create table public.company_photos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  -- Caminho no bucket "company-media". Caminhos iniciados por "/" são assets estáticos (seed).
  storage_path text not null,
  legenda text check (char_length(legenda) <= 160),
  tipo public.photo_kind not null default 'trabalho',
  ordem smallint not null default 0,
  created_at timestamptz not null default now()
);

create index company_photos_company_idx on public.company_photos (company_id, ordem);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 120),
  modelo text check (char_length(modelo) <= 120),
  quantidade smallint not null default 1 check (quantidade between 1 and 999),
  capacidade text check (char_length(capacidade) <= 160),
  created_at timestamptz not null default now()
);

create index equipment_company_idx on public.equipment (company_id);

create table public.certifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 120),
  orgao text check (char_length(orgao) <= 120),
  validade date,
  -- Caminho no bucket privado "certifications".
  arquivo_path text,
  created_at timestamptz not null default now()
);

create index certifications_company_idx on public.certifications (company_id);

create table public.key_clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 120),
  logo_url text,
  ordem smallint not null default 0
);

create index key_clients_company_idx on public.key_clients (company_id, ordem);

-- Limite de fotos por plano. Valores centralizados aqui até existir tabela de planos.
create function public.photo_limit(p_premium boolean)
returns int
language sql
immutable
set search_path = ''
as $$
  select case when p_premium then 30 else 5 end
$$;

-- SECURITY DEFINER: o lock em companies não deve depender dos privilégios do usuário.
create function public.enforce_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_premium boolean;
  v_count int;
begin
  -- Serializa inserts concorrentes da mesma empresa.
  select c.premium into v_premium
  from public.companies c
  where c.id = new.company_id
  for update;

  select count(*) into v_count
  from public.company_photos p
  where p.company_id = new.company_id;

  if v_count >= public.photo_limit(v_premium) then
    raise exception 'Limite de % fotos atingido para o plano atual', public.photo_limit(v_premium)
      using errcode = 'P0001', hint = 'photo_limit_reached';
  end if;

  return new;
end;
$$;

create trigger company_photos_enforce_limit
  before insert on public.company_photos
  for each row execute function public.enforce_photo_limit();

-- RLS: leitura pública, escrita só por membros da empresa -----------------

alter table public.company_photos enable row level security;
alter table public.equipment enable row level security;
alter table public.certifications enable row level security;
alter table public.key_clients enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['company_photos', 'equipment', 'certifications', 'key_clients'] loop
    execute format(
      'create policy "%1$s: leitura pública" on public.%1$I for select to anon, authenticated using (true)', t);
    execute format(
      'create policy "%1$s: membros inserem" on public.%1$I for insert to authenticated '
      'with check (public.is_member(company_id))', t);
    execute format(
      'create policy "%1$s: membros editam" on public.%1$I for update to authenticated '
      'using (public.is_member(company_id)) with check (public.is_member(company_id))', t);
    execute format(
      'create policy "%1$s: membros removem" on public.%1$I for delete to authenticated '
      'using (public.is_member(company_id))', t);
    execute format('revoke insert, update, delete on public.%I from anon', t);
  end loop;
end;
$$;
