-- Catálogos (cidades, categorias), empresas e vínculo usuário ↔ empresa.

create table public.cities (
  id int generated always as identity primary key,
  ibge_code int not null unique,
  nome text not null,
  uf char(2) not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table public.categories (
  id int generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nome text not null unique,
  ordem smallint not null default 0
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  tipo public.company_type not null,
  razao_social text not null check (char_length(razao_social) between 2 and 200),
  nome_fantasia text not null check (char_length(nome_fantasia) between 2 and 120),
  cnpj char(14) not null unique check (public.is_valid_cnpj(cnpj)),
  city_id int not null references public.cities (id),
  descricao text check (char_length(descricao) <= 2000),
  logo_url text,
  capa_url text,
  site text check (site ~* '^https?://'),
  -- Formato E.164 sem "+": 55 + DDD + número.
  whatsapp text check (whatsapp ~ '^55\d{10,11}$'),
  email extensions.citext,
  ano_fundacao smallint check (ano_fundacao between 1850 and 2100),
  raio_km smallint check (raio_km between 0 and 1000),
  premium boolean not null default false,
  search_text text generated always as (
    public.f_unaccent(lower(nome_fantasia || ' ' || razao_social || ' ' || coalesce(descricao, '')))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index companies_city_idx on public.companies (city_id);
create index companies_tipo_premium_idx on public.companies (tipo, premium desc);
create index companies_search_trgm_idx on public.companies using gin (search_text extensions.gin_trgm_ops);

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

create table public.company_members (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create index company_members_user_idx on public.company_members (user_id);

create table public.company_categories (
  company_id uuid not null references public.companies (id) on delete cascade,
  category_id int not null references public.categories (id),
  primary key (company_id, category_id)
);

create index company_categories_category_idx on public.company_categories (category_id, company_id);

-- Cidades atendidas pelo prestador (além da cidade-sede).
create table public.company_cities (
  company_id uuid not null references public.companies (id) on delete cascade,
  city_id int not null references public.cities (id),
  primary key (company_id, city_id)
);

create index company_cities_city_idx on public.company_cities (city_id, company_id);

-- Helper usado pelas policies. SECURITY DEFINER evita recursão de RLS em company_members.
create function public.is_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_members m
    where m.company_id = p_company_id
      and m.user_id = (select auth.uid())
  )
$$;

-- Cadastro: cria a empresa e vincula o usuário atual como owner, numa transação.
create function public.create_company(
  p_tipo public.company_type,
  p_slug text,
  p_razao_social text,
  p_nome_fantasia text,
  p_cnpj text,
  p_city_id int,
  p_whatsapp text default null,
  p_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
begin
  if v_user_id is null then
    raise exception 'Autenticação necessária' using errcode = '42501';
  end if;

  insert into public.companies (tipo, slug, razao_social, nome_fantasia, cnpj, city_id, whatsapp, email)
  values (p_tipo, p_slug, p_razao_social, p_nome_fantasia, p_cnpj, p_city_id, p_whatsapp, p_email)
  returning id into v_company_id;

  insert into public.company_members (company_id, user_id, role)
  values (v_company_id, v_user_id, 'owner');

  return v_company_id;
end;
$$;

-- RLS -----------------------------------------------------------------------

alter table public.cities enable row level security;
alter table public.categories enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.company_categories enable row level security;
alter table public.company_cities enable row level security;

create policy "cities: leitura pública" on public.cities
  for select to anon, authenticated using (true);

create policy "categories: leitura pública" on public.categories
  for select to anon, authenticated using (true);

create policy "companies: leitura pública" on public.companies
  for select to anon, authenticated using (true);

create policy "companies: membros editam" on public.companies
  for update to authenticated
  using (public.is_member(id))
  with check (public.is_member(id));

create policy "company_members: usuário vê os próprios vínculos" on public.company_members
  for select to authenticated using (user_id = (select auth.uid()));

create policy "company_categories: leitura pública" on public.company_categories
  for select to anon, authenticated using (true);

create policy "company_categories: membros inserem" on public.company_categories
  for insert to authenticated with check (public.is_member(company_id));

create policy "company_categories: membros removem" on public.company_categories
  for delete to authenticated using (public.is_member(company_id));

create policy "company_cities: leitura pública" on public.company_cities
  for select to anon, authenticated using (true);

create policy "company_cities: membros inserem" on public.company_cities
  for insert to authenticated with check (public.is_member(company_id));

create policy "company_cities: membros removem" on public.company_cities
  for delete to authenticated using (public.is_member(company_id));

-- Privilégios de coluna: premium, slug e cnpj não são editáveis pelo cliente.
revoke insert, update, delete on public.companies from anon, authenticated;
grant update (
  razao_social, nome_fantasia, city_id, descricao, logo_url, capa_url,
  site, whatsapp, email, ano_fundacao, raio_km
) on public.companies to authenticated;

revoke insert, update, delete on public.cities, public.categories from anon, authenticated;
revoke insert, update, delete on public.company_members from anon, authenticated;
revoke insert, update, delete on public.company_categories, public.company_cities from anon;
revoke update on public.company_categories, public.company_cities from authenticated;

revoke execute on function public.is_member(uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;
revoke execute on function public.create_company(public.company_type, text, text, text, text, int, text, text) from public, anon;
grant execute on function public.create_company(public.company_type, text, text, text, text, int, text, text) to authenticated;
