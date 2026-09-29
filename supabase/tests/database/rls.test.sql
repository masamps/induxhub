-- Testes de RLS e regras de negócio. Rodam sobre o seed: `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(24);

-- Helpers ------------------------------------------------------------------------

create function pg_temp.login(p_slug text) returns void language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', md5('induxhub-seed-user:' || p_slug)::uuid, 'role', 'authenticated')::text,
    true
  );
  set local role authenticated;
end;
$$;

create function pg_temp.logout() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '', true);
end;
$$;

create function pg_temp.cid(p_slug text) returns uuid language sql stable security definer as $$
  select id from public.companies where slug = p_slug
$$;

create function pg_temp.quote(p_titulo text) returns uuid language sql stable security definer as $$
  select id from public.quote_requests where titulo = p_titulo
$$;

-- Validação de CNPJ --------------------------------------------------------------

select ok(public.is_valid_cnpj('11222333000181'), 'CNPJ válido é aceito');
select ok(not public.is_valid_cnpj('11222333000182'), 'CNPJ com dígito errado é rejeitado');
select ok(not public.is_valid_cnpj('11111111111111'), 'CNPJ com dígitos repetidos é rejeitado');

-- Visitante anônimo --------------------------------------------------------------

set local role anon;

select ok((select count(*) from public.companies) > 0, 'anônimo lê empresas');
select throws_ok($$ select 1 from public.quote_requests $$, '42501', null, 'anônimo não acessa pedidos');
select is((select count(*) from public.profile_metrics), 0::bigint, 'anônimo não vê métricas');
select throws_ok(
  $$ update public.companies set descricao = 'x' $$,
  '42501', null, 'anônimo não edita empresas'
);
select lives_ok(
  format($$ select public.track_event(%L, 'view') $$, pg_temp.cid('solda-forte-salto')),
  'anônimo registra visualização'
);

select is(
  (select slug from public.search_companies(null, 'itu', 'usinagem') limit 1),
  'usinagem-precisao-sorocaba',
  'busca: premium vem primeiro'
);
select is(
  (select count(*) from public.search_companies('precisao usinagem')),
  1::bigint,
  'busca por texto ignora acentos'
);
select is(
  (select count(*) from public.search_companies(null, 'cidade-inexistente')),
  0::bigint,
  'busca com cidade inválida retorna vazio'
);

reset role;

select is(
  (select views from public.profile_metrics
    where company_id = pg_temp.cid('solda-forte-salto') and dia = public.today_local()) > 0,
  true,
  'track_event incrementa o contador do dia'
);

-- Prestador editando perfil -----------------------------------------------------

select pg_temp.login('solda-forte-salto');

select results_eq(
  format($$ with u as (update public.companies set descricao = 'Nova descrição' where id = %L returning 1)
            select count(*)::int from u $$, pg_temp.cid('solda-forte-salto')),
  array[1],
  'prestador edita o próprio perfil'
);
select results_eq(
  format($$ with u as (update public.companies set descricao = 'Invasão' where id = %L returning 1)
            select count(*)::int from u $$, pg_temp.cid('termo-boituva')),
  array[0],
  'prestador não edita perfil alheio'
);
select throws_ok(
  $$ update public.companies set premium = true $$,
  '42501', null, 'prestador não se marca premium'
);

-- Limite de 5 fotos no plano gratuito (seed tem 3).
insert into public.company_photos (company_id, storage_path)
values (pg_temp.cid('solda-forte-salto'), 'x/4.jpg'), (pg_temp.cid('solda-forte-salto'), 'x/5.jpg');
select throws_ok(
  format($$ insert into public.company_photos (company_id, storage_path) values (%L, 'x/6.jpg') $$,
    pg_temp.cid('solda-forte-salto')),
  'P0001', null, 'plano gratuito limita a 5 fotos'
);

select is((select count(*) from public.quote_requests), 0::bigint, 'prestador sem pedidos não vê pedidos');

select throws_ok(
  format($$ select public.reply_to_quote(%L, %L, 'Mensagem de teste longa') $$,
    pg_temp.quote('Têmpera por indução em pinos'), pg_temp.cid('solda-forte-salto')),
  'P0002', null, 'prestador não responde pedido que não recebeu'
);

select pg_temp.logout();

-- Solicitante ------------------------------------------------------------------

select pg_temp.login('embalagens-itu');

select is((select count(*) from public.quote_requests), 3::bigint, 'solicitante vê os próprios pedidos');

select throws_ok(
  format($$ select public.create_quote_request(%L, 'Pedido falso', 'Descrição com mais de vinte caracteres', 1, 1) $$,
    pg_temp.cid('autopecas-sorocaba')),
  '42501', null, 'não cria pedido em nome de outra empresa'
);

-- Pedido 13: Salto CNC respondeu, ainda sem avaliação.
select lives_ok(
  format($$ insert into public.reviews (quote_id, prestador_id, autor_company_id, autor_user_id, nota)
            values (%L, %L, %L, auth.uid(), 5) $$,
    pg_temp.quote('Usinagem de buchas em bronze'), pg_temp.cid('metalurgica-salto-cnc'), pg_temp.cid('embalagens-itu')),
  'solicitante avalia prestador que respondeu'
);

-- Ferramentaria Votorantim recebeu o pedido 13 mas não respondeu.
select throws_ok(
  format($$ insert into public.reviews (quote_id, prestador_id, autor_company_id, autor_user_id, nota)
            values (%L, %L, %L, auth.uid(), 1) $$,
    pg_temp.quote('Usinagem de buchas em bronze'), pg_temp.cid('ferramentaria-votorantim'), pg_temp.cid('embalagens-itu')),
  '42501', null, 'não avalia prestador que não respondeu'
);

select pg_temp.logout();

select is(
  (select total_avaliacoes from public.company_stats where company_id = pg_temp.cid('metalurgica-salto-cnc')),
  1,
  'avaliação atualiza reputação'
);

-- Prestador destinatário ----------------------------------------------------------

select pg_temp.login('termo-boituva');
select ok(
  (select count(*) from public.quote_requests where id = pg_temp.quote('Têmpera por indução em pinos')) = 1,
  'destinatário vê o pedido recebido'
);
select pg_temp.logout();

select * from finish();
rollback;
