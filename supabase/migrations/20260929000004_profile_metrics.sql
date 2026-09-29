-- Métricas do perfil agregadas por dia. Uma linha por empresa por dia.

create table public.profile_metrics (
  company_id uuid not null references public.companies (id) on delete cascade,
  dia date not null,
  views int not null default 0,
  whatsapp_clicks int not null default 0,
  quote_clicks int not null default 0,
  orcamentos_recebidos int not null default 0,
  primary key (company_id, dia)
);

-- Incremento interno. Não exposto ao cliente.
create function public.bump_metric(p_company_id uuid, p_column text, p_amount int default 1)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_column not in ('views', 'whatsapp_clicks', 'quote_clicks', 'orcamentos_recebidos') then
    raise exception 'Métrica inválida: %', p_column;
  end if;

  execute format(
    'insert into public.profile_metrics as m (company_id, dia, %1$I) values ($1, public.today_local(), $2)
     on conflict (company_id, dia) do update set %1$I = m.%1$I + excluded.%1$I',
    p_column
  )
  using p_company_id, p_amount;
end;
$$;

-- Evento público (visitante anônimo incluso): visualização e cliques de contato.
create function public.track_event(p_company_id uuid, p_event public.metric_event)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.companies c where c.id = p_company_id and c.tipo <> 'contratante') then
    return;
  end if;

  perform public.bump_metric(
    p_company_id,
    case p_event
      when 'view' then 'views'
      when 'whatsapp' then 'whatsapp_clicks'
      when 'quote_click' then 'quote_clicks'
    end
  );
end;
$$;

alter table public.profile_metrics enable row level security;

create policy "profile_metrics: membros leem" on public.profile_metrics
  for select to authenticated using (public.is_member(company_id));

revoke insert, update, delete on public.profile_metrics from anon, authenticated;

revoke execute on function public.bump_metric(uuid, text, int) from public, anon, authenticated;
revoke execute on function public.track_event(uuid, public.metric_event) from public;
grant execute on function public.track_event(uuid, public.metric_event) to anon, authenticated;
