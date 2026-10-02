-- Prestador passa a também contratar serviços (ou deixa de contratar).
-- `tipo` não é editável direto pelo cliente; só esta transição é permitida.
create function public.set_company_buyer(p_company_id uuid, p_enabled boolean)
returns public.company_type
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tipo public.company_type;
begin
  if not public.is_member(p_company_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;

  update public.companies
  set tipo = case when p_enabled then 'ambos'::public.company_type else 'prestador'::public.company_type end
  where id = p_company_id
    and tipo in ('prestador', 'ambos')
  returning tipo into v_tipo;

  if v_tipo is null then
    raise exception 'Só empresas prestadoras podem alternar esta opção' using errcode = '22023';
  end if;

  return v_tipo;
end;
$$;

revoke execute on function public.set_company_buyer(uuid, boolean) from public, anon;
grant execute on function public.set_company_buyer(uuid, boolean) to authenticated;
