-- Orçamentos do fornecedor: rascunho, envio, link público, aceite e integração com pedidos.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(32);

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

create function pg_temp.prop(p_titulo text) returns public.proposals language sql stable security definer as $$
  select * from public.proposals where titulo = p_titulo order by created_at desc, versao desc limit 1
$$;

create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated, anon;

-- Orçamento avulso ------------------------------------------------------------------

select pg_temp.login('solda-forte-salto');

select lives_ok(
  format($$ insert into ids values ('avulso', public.save_proposal(%L,
    '{"titulo": "Portão industrial", "cliente_nome": "Fazenda Boa Vista", "cliente_documento": "123.456.789-09",
      "cliente_whatsapp": "(15) 99999-0000", "desconto": "50", "frete": "30"}',
    '[{"descricao": "Estrutura metálica", "unidade": "kg", "quantidade": 120, "valor_unitario": 18.5},
      {"descricao": "Mão de obra", "unidade": "h", "quantidade": 16, "valor_unitario": 95}]')) $$,
    pg_temp.cid('solda-forte-salto')),
  'fornecedor cria rascunho avulso'
);

select results_eq(
  $$ select subtotal, total, status::text, cliente_documento, cliente_whatsapp from public.proposals
     where id = (select v from ids where k = 'avulso') $$,
  $$ values (3740.00::numeric(14, 2), 3720.00::numeric(14, 2), 'rascunho', '12345678909', '15999990000') $$,
  'totais calculados e campos normalizados'
);

select is((select count(*) from public.proposal_items where proposal_id = (select v from ids where k = 'avulso')),
  2::bigint, 'fornecedor lê os itens');

select throws_ok(
  format($$ select public.save_proposal(%L, '{"titulo": "Invasão"}', '[]') $$, pg_temp.cid('termo-boituva')),
  '42501', null, 'não cria orçamento por outra empresa'
);

select is(public.send_proposal((select v from ids where k = 'avulso')), 1, 'envio numera o primeiro orçamento');

select throws_ok(
  format($$ select public.save_proposal(%L, '{"titulo": "Editado"}', '[]', %L) $$,
    pg_temp.cid('solda-forte-salto'), (select v from ids where k = 'avulso')),
  'P0001', null, 'enviado não é editável'
);

-- Segundo orçamento sem itens não é enviado.
insert into ids values ('vazio', public.save_proposal(pg_temp.cid('solda-forte-salto'),
  '{"titulo": "Sem itens", "cliente_nome": "Cliente X"}', '[]'));
select throws_ok(
  format($$ select public.send_proposal(%L) $$, (select v from ids where k = 'vazio')),
  'P0001', 'Adicione ao menos um item', 'orçamento sem itens não é enviado'
);
select lives_ok(
  format($$ select public.cancel_proposal(%L) $$, (select v from ids where k = 'vazio')),
  'rascunho é descartado'
);
select is((select count(*) from public.proposals where id = (select v from ids where k = 'vazio')), 0::bigint,
  'rascunho descartado some');

-- O próprio fornecedor abre o link: não marca visualizado nem responde.
select is(
  (public.get_public_proposal((select token_publico from public.proposals where id = (select v from ids where k = 'avulso'))) ->> 'pode_responder'),
  'false', 'fornecedor não responde o próprio orçamento'
);

select pg_temp.logout();

-- Cliente sem login pelo link -----------------------------------------------------------

set local role anon;

select throws_ok($$ select 1 from public.proposals $$, '42501', null, 'anônimo não lista orçamentos');
select is(public.get_public_proposal(gen_random_uuid()), null, 'token inválido não retorna nada');

reset role;
create temp table tok as select token_publico as t from public.proposals where id = (select v from ids where k = 'avulso');
grant select on tok to anon, authenticated;
set local role anon;

select is(
  (public.get_public_proposal((select t from tok)) -> 'itens' -> 0 ->> 'descricao'),
  'Estrutura metálica', 'anônimo vê o orçamento pelo link'
);
select is(public.respond_proposal((select t from tok), true), 'aceito', 'anônimo aceita orçamento avulso');
select throws_ok(
  $$ select public.respond_proposal((select t from tok), false) $$,
  'P0001', null, 'não responde duas vezes'
);

reset role;

select ok(
  (select visualizado_em is not null and respondido_em is not null from public.proposals
   where id = (select v from ids where k = 'avulso')),
  'aceite registra visualização e resposta'
);

-- Nova versão mantém o número -------------------------------------------------------------

select pg_temp.login('solda-forte-salto');
select throws_ok(
  format($$ select public.copy_proposal(%L, true) $$, (select v from ids where k = 'avulso')),
  'P0001', null, 'aceito não ganha nova versão'
);
insert into ids values ('copia', public.copy_proposal((select v from ids where k = 'avulso')));
select is(public.send_proposal((select v from ids where k = 'copia')), 2, 'cópia recebe número novo');
insert into ids values ('v2', public.copy_proposal((select v from ids where k = 'copia'), true));
select is(public.send_proposal((select v from ids where k = 'v2')), 2, 'nova versão mantém o número');
select results_eq(
  format($$ select status::text from public.proposals where id in (%L, %L) order by versao $$,
    (select v from ids where k = 'copia'), (select v from ids where k = 'v2')),
  $$ values ('substituido'), ('enviado') $$,
  'versão anterior fica substituída'
);
select pg_temp.logout();

-- Orçamento como resposta a pedido ------------------------------------------------------------

select pg_temp.login('caldeiraria-porto-feliz');
insert into ids values ('pedido_a', public.save_proposal(pg_temp.cid('caldeiraria-porto-feliz'),
  format('{"titulo": "Reparo do chassi", "quote_id": "%s", "prazo_entrega_dias": 5,
    "observacoes": "Inclui inspeção por líquido penetrante."}', pg_temp.quote('Solda de reparo em chassi de implemento'))::jsonb,
  '[{"descricao": "Solda MIG", "unidade": "servico", "quantidade": 1, "valor_unitario": 2400}]'));
select is((select cliente_nome from public.proposals where id = (select v from ids where k = 'pedido_a')),
  'Agromaq', 'cliente do pedido preenchido sozinho');
select is(public.send_proposal((select v from ids where k = 'pedido_a')), 1, 'pedido usa a numeração do fornecedor');
select pg_temp.logout();

select pg_temp.login('tatui-manutencao-industrial');
insert into ids values ('pedido_b', public.save_proposal(pg_temp.cid('tatui-manutencao-industrial'),
  format('{"titulo": "Solda do chassi", "quote_id": "%s"}', pg_temp.quote('Solda de reparo em chassi de implemento'))::jsonb,
  '[{"descricao": "Reparo", "quantidade": 1, "valor_unitario": 1900}]'));
select lives_ok(format($$ select public.send_proposal(%L) $$, (select v from ids where k = 'pedido_b')), 'concorrente envia orçamento');
select pg_temp.logout();

select pg_temp.login('solda-forte-salto');
select throws_ok(
  format($$ select public.save_proposal(%L, '{"titulo": "Intruso", "quote_id": "%s"}', '[]') $$,
    pg_temp.cid('solda-forte-salto'), pg_temp.quote('Solda de reparo em chassi de implemento')),
  'P0002', null, 'só destinatário do pedido orça nele'
);
select pg_temp.logout();

select results_eq(
  format($$ select valor_estimado, prazo_dias, proposal_id from public.quote_replies
            where quote_id = %L and prestador_id = %L $$,
    pg_temp.quote('Solda de reparo em chassi de implemento'), pg_temp.cid('caldeiraria-porto-feliz')),
  format($$ values (2400.00::numeric(12, 2), 5::smallint, %L::uuid) $$, (select v from ids where k = 'pedido_a')),
  'envio registra a resposta no pedido'
);
select is((select status::text from public.quote_requests where id = pg_temp.quote('Solda de reparo em chassi de implemento')),
  'respondido', 'pedido passa a respondido');

-- Anônimo com o link não aceita orçamento de pedido.
reset role;
delete from tok;
insert into tok select token_publico from public.proposals where id = (select v from ids where k = 'pedido_a');
set local role anon;
select throws_ok($$ select public.respond_proposal((select t from tok), true) $$,
  '42501', null, 'orçamento de pedido exige o solicitante logado');
reset role;

select pg_temp.login('agromaq-boituva');
select is((select count(*) from public.proposals), 2::bigint, 'solicitante vê os orçamentos do pedido');
select is((public.get_public_proposal((select t from tok)) ->> 'pode_responder'), 'true', 'solicitante pode responder');
select is(public.respond_proposal((select t from tok), true), 'aceito', 'solicitante aceita');
select pg_temp.logout();

select results_eq(
  format($$ select status::text, prestador_escolhido_id from public.quote_requests where id = %L $$,
    pg_temp.quote('Solda de reparo em chassi de implemento')),
  format($$ values ('fechado', %L::uuid) $$, pg_temp.cid('caldeiraria-porto-feliz')),
  'aceite fecha o pedido com o fornecedor'
);
select is((select status::text from public.proposals where id = (select v from ids where k = 'pedido_b')),
  'recusado', 'orçamento concorrente vira recusado');

select * from finish();
rollback;
