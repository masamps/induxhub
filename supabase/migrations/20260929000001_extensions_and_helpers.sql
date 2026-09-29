-- Extensões, enums e funções utilitárias usadas pelo restante do schema.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists unaccent with schema extensions;

create type public.company_type as enum ('contratante', 'prestador', 'ambos');
create type public.member_role as enum ('owner', 'member');
create type public.quote_status as enum ('aberto', 'respondido', 'fechado');
create type public.photo_kind as enum ('empresa', 'trabalho');
create type public.metric_event as enum ('view', 'whatsapp', 'quote_click');

-- unaccent() não é IMMUTABLE; este wrapper permite usá-lo em colunas geradas e índices.
create function public.f_unaccent(value text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, value)
$$;

-- Valida CNPJ numérico (14 dígitos) pelos dígitos verificadores.
create function public.is_valid_cnpj(cnpj text)
returns boolean
language plpgsql
immutable
parallel safe
set search_path = ''
as $$
declare
  weights_1 int[] := array[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  weights_2 int[] := array[6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  total int;
  digit int;
begin
  if cnpj is null or cnpj !~ '^\d{14}$' or cnpj ~ '^(\d)\1{13}$' then
    return false;
  end if;

  total := 0;
  for i in 1..12 loop
    total := total + substr(cnpj, i, 1)::int * weights_1[i];
  end loop;
  digit := case when total % 11 < 2 then 0 else 11 - total % 11 end;
  if digit <> substr(cnpj, 13, 1)::int then
    return false;
  end if;

  total := 0;
  for i in 1..13 loop
    total := total + substr(cnpj, i, 1)::int * weights_2[i];
  end loop;
  digit := case when total % 11 < 2 then 0 else 11 - total % 11 end;
  return digit = substr(cnpj, 14, 1)::int;
end;
$$;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Dia corrente no fuso da operação (métricas agregadas por dia local).
create function public.today_local()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;
