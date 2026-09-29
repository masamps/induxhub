-- Busca paginada de prestadores com filtros. Premium sempre primeiro.

create function public.search_companies(
  p_query text default null,
  p_city_slug text default null,
  p_category_slug text default null,
  p_sort text default 'relevancia',
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  slug text,
  nome_fantasia text,
  descricao text,
  logo_url text,
  premium boolean,
  whatsapp text,
  cidade text,
  uf char(2),
  categorias text[],
  nota_media numeric,
  total_avaliacoes int,
  projetos_concluidos int,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_query text := nullif(public.f_unaccent(lower(btrim(p_query))), '');
  v_city_id int;
  v_category_id int;
  v_like text;
begin
  if p_sort not in ('relevancia', 'nota') then
    raise exception 'Ordenação inválida: %', p_sort using errcode = '22023';
  end if;

  v_like := '%' || replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  if p_city_slug is not null then
    select c.id into v_city_id from public.cities c where c.slug = p_city_slug;
    if v_city_id is null then
      return;
    end if;
  end if;

  if p_category_slug is not null then
    select c.id into v_category_id from public.categories c where c.slug = p_category_slug;
    if v_category_id is null then
      return;
    end if;
  end if;

  return query
  select
    co.id,
    co.slug,
    co.nome_fantasia,
    left(co.descricao, 240),
    co.logo_url,
    co.premium,
    co.whatsapp,
    ci.nome,
    ci.uf,
    array(
      select cat.nome
      from public.company_categories cc
      join public.categories cat on cat.id = cc.category_id
      where cc.company_id = co.id
      order by cat.ordem
    ),
    st.nota_media,
    coalesce(st.total_avaliacoes, 0),
    coalesce(st.projetos_concluidos, 0),
    count(*) over ()
  from public.companies co
  join public.cities ci on ci.id = co.city_id
  left join public.company_stats st on st.company_id = co.id
  where co.tipo in ('prestador', 'ambos')
    and (
      v_category_id is null
      or exists (
        select 1 from public.company_categories cc
        where cc.company_id = co.id and cc.category_id = v_category_id
      )
    )
    and (
      v_city_id is null
      or co.city_id = v_city_id
      or exists (
        select 1 from public.company_cities cci
        where cci.company_id = co.id and cci.city_id = v_city_id
      )
    )
    and (
      v_query is null
      or co.search_text operator(extensions.%>) v_query
      or co.search_text like v_like
    )
  order by
    co.premium desc,
    case when p_sort = 'relevancia' and v_query is not null
      then extensions.word_similarity(v_query, co.search_text) end desc nulls last,
    st.nota_media desc nulls last,
    st.total_avaliacoes desc nulls last,
    co.nome_fantasia,
    co.id
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
end;
$$;

grant execute on function public.search_companies(text, text, text, text, int, int) to anon, authenticated;
