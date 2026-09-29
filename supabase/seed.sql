-- Seed de desenvolvimento. Dados fictícios.
-- Todos os usuários: "<slug>@induxhub.test", senha "induxhub123".
-- Pedidos, respostas e avaliações passam pelas funções reais do schema.

-- Catálogos -------------------------------------------------------------------

insert into public.categories (slug, nome, ordem) values
  ('usinagem', 'Usinagem', 1),
  ('ferramentaria', 'Ferramentaria', 2),
  ('injecao-plastica', 'Injeção Plástica', 3),
  ('solda', 'Solda', 4),
  ('automacao', 'Automação', 5),
  ('manutencao', 'Manutenção', 6),
  ('tratamento-termico', 'Tratamento Térmico', 7),
  ('caldeiraria', 'Caldeiraria', 8),
  ('eletrica-industrial', 'Elétrica Industrial', 9),
  ('pintura-industrial', 'Pintura Industrial', 10),
  ('engenharia', 'Engenharia', 11);

insert into public.cities (ibge_code, nome, uf, slug) values
  (3552205, 'Sorocaba', 'SP', 'sorocaba'),
  (3557006, 'Votorantim', 'SP', 'votorantim'),
  (3523909, 'Itu', 'SP', 'itu'),
  (3545209, 'Salto', 'SP', 'salto'),
  (3554003, 'Tatuí', 'SP', 'tatui'),
  (3507001, 'Boituva', 'SP', 'boituva'),
  (3540606, 'Porto Feliz', 'SP', 'porto-feliz');

-- Helpers temporários -----------------------------------------------------------

-- Completa 12 dígitos com os dígitos verificadores do CNPJ.
create function pg_temp.cnpj(base text) returns text language plpgsql immutable as $$
declare
  w1 int[] := array[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  w2 int[] := array[6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  s int := 0;
  d1 int;
  d2 int;
begin
  for i in 1..12 loop s := s + substr(base, i, 1)::int * w1[i]; end loop;
  d1 := case when s % 11 < 2 then 0 else 11 - s % 11 end;
  base := base || d1;
  s := 0;
  for i in 1..13 loop s := s + substr(base, i, 1)::int * w2[i]; end loop;
  d2 := case when s % 11 < 2 then 0 else 11 - s % 11 end;
  return base || d2;
end;
$$;

-- UUID determinístico do usuário owner de cada empresa.
create function pg_temp.user_id(slug text) returns uuid language sql immutable as $$
  select md5('induxhub-seed-user:' || slug)::uuid
$$;

create function pg_temp.company_id(p_slug text) returns uuid language sql stable as $$
  select id from public.companies where slug = p_slug
$$;

create function pg_temp.act_as(p_slug text) returns void language sql as $$
  select set_config(
    'request.jwt.claims',
    json_build_object('sub', pg_temp.user_id(p_slug), 'role', 'authenticated')::text,
    true
  )
$$;

-- Empresas ----------------------------------------------------------------------

create temp table seed_companies (
  n int,
  slug text,
  tipo public.company_type,
  razao_social text,
  nome_fantasia text,
  cidade text,
  descricao text,
  ano_fundacao int,
  raio_km int,
  premium boolean,
  categorias text[],
  atende text[]
);

insert into seed_companies values
  (1, 'usinagem-precisao-sorocaba', 'ambos', 'Precisão Usinagem Sorocaba Ltda', 'Precisão Usinagem', 'sorocaba',
   'Usinagem CNC de peças seriadas e protótipos em aço, alumínio e bronze. Tolerâncias de até 0,01 mm e inspeção dimensional em todas as entregas.',
   1998, 80, true, '{usinagem,ferramentaria}', '{votorantim,itu,salto,porto-feliz,boituva}'),
  (2, 'ferramentaria-votorantim', 'prestador', 'Ferramentaria Votorantim Eireli', 'Ferramentaria Votorantim', 'votorantim',
   'Estampos, dispositivos e ferramentas de corte e dobra. Manutenção de ferramentas com prazo curto.',
   2006, 50, false, '{ferramentaria,usinagem}', '{sorocaba,itu}'),
  (3, 'injetech-plasticos', 'prestador', 'InjeTech Indústria de Plásticos Ltda', 'InjeTech Plásticos', 'itu',
   'Injeção de peças técnicas em PP, ABS, PA e PC. Desenvolvimento de moldes e produção de lotes de 1 mil a 1 milhão de peças.',
   2003, 120, true, '{injecao-plastica,ferramentaria}', '{salto,sorocaba,porto-feliz}'),
  (4, 'solda-forte-salto', 'prestador', 'Solda Forte Serviços Industriais Ltda', 'Solda Forte', 'salto',
   'Soldagem MIG, TIG e eletrodo revestido em aço carbono e inox. Soldadores qualificados e atendimento em campo.',
   2012, 60, false, '{solda,caldeiraria}', '{itu,sorocaba}'),
  (5, 'automaq-automacao', 'prestador', 'AutoMaq Automação Industrial Ltda', 'AutoMaq Automação', 'sorocaba',
   'Automação de linhas com CLP, IHM e robôs colaborativos. Retrofit de máquinas e integração com sistemas MES.',
   2009, 150, true, '{automacao,eletrica-industrial,engenharia}', '{votorantim,itu,salto,tatui,boituva,porto-feliz}'),
  (6, 'tatui-manutencao-industrial', 'prestador', 'Tatuí Manutenção Industrial Ltda', 'Tatuí Manutenção', 'tatui',
   'Manutenção preventiva, corretiva e preditiva em prensas, compressores e linhas de produção. Plantão 24 horas.',
   2001, 70, false, '{manutencao,solda,eletrica-industrial}', '{boituva,sorocaba}'),
  (7, 'termo-boituva', 'prestador', 'Termo Boituva Tratamentos Térmicos Ltda', 'Termo Boituva', 'boituva',
   'Têmpera, revenimento, cementação e nitretação. Laudo de dureza em todos os lotes.',
   1995, 100, false, '{tratamento-termico}', '{tatui,sorocaba,porto-feliz,itu}'),
  (8, 'caldeiraria-porto-feliz', 'prestador', 'Caldeiraria Porto Feliz Ltda', 'Caldeiraria Porto Feliz', 'porto-feliz',
   'Tanques, reservatórios, dutos e estruturas metálicas sob medida. Projeto, fabricação e montagem.',
   1989, 90, false, '{caldeiraria,solda}', '{boituva,itu,salto}'),
  (9, 'eletro-industria-sorocaba', 'prestador', 'Eletro Indústria Sorocaba Ltda', 'Eletro Indústria', 'sorocaba',
   'Painéis elétricos, quadros de comando e adequação à NR-10. Instalações industriais de média e baixa tensão.',
   2010, 40, false, '{eletrica-industrial,automacao,manutencao}', '{votorantim}'),
  (10, 'pintura-tecnica-itu', 'prestador', 'Pintura Técnica Itu Ltda', 'Pintura Técnica', 'itu',
   'Pintura eletrostática a pó e líquida, epóxi e poliuretano. Jateamento e preparação de superfície.',
   2014, 50, false, '{pintura-industrial}', '{salto,sorocaba}'),
  (11, 'engevale-engenharia', 'prestador', 'Engevale Engenharia Industrial Ltda', 'Engevale Engenharia', 'sorocaba',
   'Projetos mecânicos, dispositivos de fixação e laudos técnicos. Simulação estrutural e digitalização 3D.',
   2016, 200, false, '{engenharia,automacao}', '{votorantim,itu,salto,tatui,boituva,porto-feliz}'),
  (12, 'metalurgica-salto-cnc', 'prestador', 'Metalúrgica Salto CNC Ltda', 'Salto CNC', 'salto',
   'Torneamento e fresamento CNC de peças pequenas e médias. Ideal para lotes de reposição.',
   2019, 30, false, '{usinagem}', '{itu}'),
  (13, 'molde-certo-ferramentaria', 'prestador', 'Molde Certo Ferramentaria Ltda', 'Molde Certo', 'sorocaba',
   'Projeto e fabricação de moldes para injeção plástica. Manutenção e alteração de moldes de terceiros.',
   2008, 60, false, '{ferramentaria,injecao-plastica}', '{votorantim,itu}'),
  (14, 'votorantim-manutencao-montagem', 'prestador', 'Votorantim Manutenção e Montagem Ltda', 'VM Montagens', 'votorantim',
   'Montagem industrial, remoção de máquinas, caldeiraria leve e soldagem em campo.',
   2004, 50, false, '{manutencao,caldeiraria,solda}', '{sorocaba}'),
  (15, 'plastiform-tatui', 'prestador', 'Plastiform Tatuí Indústria Ltda', 'Plastiform', 'tatui',
   'Injeção de peças plásticas para linha branca e agronegócio. Montagem e embalagem inclusas.',
   2011, 80, false, '{injecao-plastica}', '{boituva}'),
  (16, 'autopecas-sorocaba', 'contratante', 'Autopeças Sorocaba S.A.', 'Autopeças Sorocaba', 'sorocaba',
   'Fabricante de componentes automotivos.', 1985, null, false, '{}', '{}'),
  (17, 'embalagens-itu', 'contratante', 'Embalagens Itu Ltda', 'Embalagens Itu', 'itu',
   'Indústria de embalagens plásticas.', 2000, null, false, '{}', '{}'),
  (18, 'agromaq-boituva', 'contratante', 'Agromaq Implementos Agrícolas Ltda', 'Agromaq', 'boituva',
   'Fabricante de implementos agrícolas.', 1992, null, false, '{}', '{}'),
  (19, 'linha-branca-votorantim', 'contratante', 'Linha Branca Votorantim Ltda', 'Linha Branca Votorantim', 'votorantim',
   'Fabricante de eletrodomésticos.', 1997, null, false, '{}', '{}');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', pg_temp.user_id(slug), 'authenticated', 'authenticated',
  slug || '@induxhub.test', extensions.crypt('induxhub123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
from seed_companies;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  pg_temp.user_id(slug), pg_temp.user_id(slug), pg_temp.user_id(slug)::text,
  json_build_object('sub', pg_temp.user_id(slug)::text, 'email', slug || '@induxhub.test', 'email_verified', true)::jsonb,
  'email', now(), now(), now()
from seed_companies;

insert into public.companies (
  slug, tipo, razao_social, nome_fantasia, cnpj, city_id, descricao,
  whatsapp, email, site, ano_fundacao, raio_km, premium, created_at
)
select
  s.slug, s.tipo, s.razao_social, s.nome_fantasia,
  pg_temp.cnpj(lpad((11222000 + s.n * 3137)::text, 8, '0') || '0001'),
  c.id, s.descricao,
  '551599' || lpad((7000000 + s.n * 1301)::text, 7, '0'),
  'contato@' || s.slug || '.test',
  'https://' || s.slug || '.example.com',
  s.ano_fundacao, s.raio_km, s.premium,
  now() - make_interval(days => 120 - s.n * 3)
from seed_companies s
join public.cities c on c.slug = s.cidade;

insert into public.company_members (company_id, user_id, role)
select pg_temp.company_id(slug), pg_temp.user_id(slug), 'owner'
from seed_companies;

insert into public.company_categories (company_id, category_id)
select pg_temp.company_id(s.slug), cat.id
from seed_companies s
cross join lateral unnest(s.categorias) as u(slug)
join public.categories cat on cat.slug = u.slug;

insert into public.company_cities (company_id, city_id)
select pg_temp.company_id(s.slug), c.id
from seed_companies s
cross join lateral unnest(s.atende) as u(slug)
join public.cities c on c.slug = u.slug;

-- Perfil do prestador -------------------------------------------------------------

create temp table seed_equipment (categoria text, nome text, modelo text, quantidade int, capacidade text);

insert into seed_equipment values
  ('usinagem', 'Centro de usinagem CNC', 'Romi D 800', 2, 'Curso 800 x 530 x 580 mm'),
  ('usinagem', 'Torno CNC', 'Romi GL 240', 3, 'Ø 240 x 500 mm'),
  ('ferramentaria', 'Eletroerosão a fio', 'Mitsubishi MV1200R', 1, 'Peças até 1.200 kg'),
  ('ferramentaria', 'Retífica plana', 'Ferdimat TA 60', 2, 'Mesa 600 x 300 mm'),
  ('injecao-plastica', 'Injetora', 'Haitian MA 2500', 4, '250 t de fechamento'),
  ('injecao-plastica', 'Injetora', 'Romi Primax 150', 2, '150 t de fechamento'),
  ('solda', 'Máquina de solda MIG/MAG', 'ESAB Smashweld 408', 6, '400 A'),
  ('solda', 'Fonte TIG', 'Lincoln Invertec V350', 2, '350 A'),
  ('automacao', 'Bancada de testes de CLP', 'Siemens S7-1500', 2, 'Até 64 I/O'),
  ('automacao', 'Robô colaborativo', 'Universal Robots UR10e', 1, '10 kg de carga'),
  ('manutencao', 'Analisador de vibração', 'SKF Microlog', 1, 'Manutenção preditiva'),
  ('manutencao', 'Termovisor', 'Flir E8', 2, '-20 a 250 °C'),
  ('tratamento-termico', 'Forno de têmpera a vácuo', 'Ipsen Turbo2Treater', 1, 'Carga até 600 kg'),
  ('tratamento-termico', 'Forno de revenimento', 'Jung LF 2313', 2, 'Até 700 °C'),
  ('caldeiraria', 'Calandra de chapas', 'Newton CPH 3000', 1, 'Chapas até 3.000 x 19 mm'),
  ('caldeiraria', 'Prensa dobradeira', 'Newton PHS 200', 1, '200 t, 3.000 mm'),
  ('eletrica-industrial', 'Megômetro', 'Fluke 1555', 2, 'Até 10 kV'),
  ('eletrica-industrial', 'Analisador de energia', 'Fluke 435', 1, 'Trifásico'),
  ('pintura-industrial', 'Cabine de pintura pressurizada', null, 1, '12 x 5 m'),
  ('pintura-industrial', 'Estufa de cura', null, 1, 'Até 220 °C'),
  ('engenharia', 'Estação CAD/CAE', 'SolidWorks + Ansys', 6, 'Simulação estrutural'),
  ('engenharia', 'Scanner 3D', 'Creaform HandySCAN', 1, 'Precisão 0,025 mm');

insert into public.equipment (company_id, nome, modelo, quantidade, capacidade)
select pg_temp.company_id(s.slug), e.nome, e.modelo, e.quantidade, e.capacidade
from seed_companies s
cross join lateral unnest(s.categorias) as u(slug)
join seed_equipment e on e.categoria = u.slug;

insert into public.certifications (company_id, nome, orgao, validade)
select pg_temp.company_id(s.slug), 'ISO 9001:2015', 'Bureau Veritas', current_date + (200 + s.n * 20)
from seed_companies s
where s.tipo <> 'contratante' and (s.premium or s.n % 2 = 0)
union all
select pg_temp.company_id(s.slug), 'Soldadores qualificados ASME IX', 'FBTS', current_date + 365
from seed_companies s
where 'solda' = any (s.categorias)
union all
select pg_temp.company_id(s.slug), 'Equipe treinada NR-10', 'Ministério do Trabalho', current_date + 540
from seed_companies s
where 'eletrica-industrial' = any (s.categorias)
union all
select pg_temp.company_id(s.slug), 'Equipe treinada NR-12', 'Ministério do Trabalho', current_date + 480
from seed_companies s
where 'manutencao' = any (s.categorias);

insert into public.key_clients (company_id, nome, ordem)
select pg_temp.company_id(s.slug), cl.nome, cl.ordem
from seed_companies s
cross join lateral (
  select nome, row_number() over () as ordem
  from unnest(array[
    'Autopeças Sorocaba', 'Embalagens Itu', 'Agromaq', 'Linha Branca Votorantim',
    'Metalúrgica Alfa', 'Tietê Motores', 'Grupo Vale do Sorocaba'
  ]) with ordinality as t(nome, i)
  where (i + s.n) % 3 <> 0
  limit 4
) cl
where s.tipo <> 'contratante';

-- Placeholders estáticos em public/seed/fotos (caminho iniciado por "/").
insert into public.company_photos (company_id, storage_path, legenda, tipo, ordem)
select pg_temp.company_id(s.slug), '/seed/fotos/fachada.svg', 'Nossa estrutura', 'empresa'::public.photo_kind, 0
from seed_companies s
where s.tipo <> 'contratante'
union all
select pg_temp.company_id(s.slug), '/seed/fotos/' || s.categorias[1] || '-' || i || '.svg',
  'Trabalho realizado ' || i, 'trabalho', i
from seed_companies s
cross join generate_series(1, case when s.premium then 4 else 2 end) as i
where s.tipo <> 'contratante';

-- Pedidos, respostas, fechamento e avaliações -------------------------------------

create temp table seed_quotes (
  n int,
  solicitante text,
  titulo text,
  descricao text,
  categoria text,
  cidade text,
  dias_atras int,
  respondem text[],
  escolhido text,
  notas jsonb
);

insert into seed_quotes values
  (1, 'autopecas-sorocaba', 'Usinagem de eixos em aço 1045',
   'Lote de 500 eixos em aço 1045, Ø 25 mm x 180 mm, com rasgo de chaveta. Desenho em anexo no pedido original.',
   'usinagem', 'sorocaba', 45, '{usinagem-precisao-sorocaba,ferramentaria-votorantim}', 'usinagem-precisao-sorocaba',
   '{"usinagem-precisao-sorocaba": 5, "ferramentaria-votorantim": 4}'),
  (2, 'autopecas-sorocaba', 'Painel elétrico para nova linha de montagem',
   'Painel de comando para linha com 6 estações, inversores de frequência e adequação à NR-10.',
   'eletrica-industrial', 'sorocaba', 38, '{automaq-automacao,eletro-industria-sorocaba}', 'eletro-industria-sorocaba',
   '{"eletro-industria-sorocaba": 5}'),
  (3, 'embalagens-itu', 'Molde de injeção para tampa 38 mm',
   'Molde de 8 cavidades para tampa rosqueável 38 mm em PP, com câmara quente. Produção estimada de 200 mil peças por mês.',
   'injecao-plastica', 'itu', 35, '{injetech-plasticos,molde-certo-ferramentaria}', 'injetech-plasticos',
   '{"injetech-plasticos": 5, "molde-certo-ferramentaria": 4}'),
  (4, 'embalagens-itu', 'Pintura epóxi em estruturas metálicas',
   'Pintura epóxi de 40 m² de estruturas de mezanino, com jateamento prévio. Serviço em campo.',
   'pintura-industrial', 'itu', 30, '{pintura-tecnica-itu}', 'pintura-tecnica-itu',
   '{"pintura-tecnica-itu": 4}'),
  (5, 'agromaq-boituva', 'Têmpera de engrenagens',
   'Têmpera e revenimento de 300 engrenagens em aço 4140. Dureza final de 50 a 55 HRC com laudo.',
   'tratamento-termico', 'boituva', 28, '{termo-boituva}', 'termo-boituva',
   '{"termo-boituva": 5}'),
  (6, 'agromaq-boituva', 'Manutenção preventiva em prensas hidráulicas',
   'Plano de manutenção preventiva para 4 prensas hidráulicas de 150 t. Visitas mensais.',
   'manutencao', 'boituva', 25, '{tatui-manutencao-industrial}', 'tatui-manutencao-industrial',
   '{"tatui-manutencao-industrial": 4}'),
  (7, 'agromaq-boituva', 'Reservatório em aço inox de 5.000 litros',
   'Fabricação de reservatório vertical em inox 304, 5.000 litros, com bocais e escada de acesso.',
   'caldeiraria', 'boituva', 20, '{caldeiraria-porto-feliz}', 'caldeiraria-porto-feliz',
   '{"caldeiraria-porto-feliz": 5}'),
  (8, 'linha-branca-votorantim', 'Automação de esteira com CLP',
   'Automação de esteira de 30 m com CLP, sensores de presença e IHM. Integração com a linha existente.',
   'automacao', 'votorantim', 22, '{automaq-automacao,engevale-engenharia,eletro-industria-sorocaba}', 'automaq-automacao',
   '{"automaq-automacao": 5, "engevale-engenharia": 4}'),
  (9, 'linha-branca-votorantim', 'Soldagem de suportes em aço carbono',
   'Soldagem de 120 suportes em aço carbono conforme desenho. Material fornecido pelo cliente.',
   'solda', 'votorantim', 18, '{votorantim-manutencao-montagem}', 'votorantim-manutencao-montagem',
   '{"votorantim-manutencao-montagem": 3}'),
  (10, 'linha-branca-votorantim', 'Ferramenta de corte e dobra para chapas',
   'Estampo progressivo para corte e dobra de chapa 1,5 mm. Produção de 20 mil peças por mês.',
   'ferramentaria', 'votorantim', 15, '{ferramentaria-votorantim,molde-certo-ferramentaria}', 'ferramentaria-votorantim',
   '{"ferramentaria-votorantim": 5}'),
  (11, 'autopecas-sorocaba', 'Projeto de dispositivo de fixação',
   'Projeto de dispositivo pneumático de fixação para usinagem de carcaça. Entregar 3D e detalhamento.',
   'engenharia', 'sorocaba', 12, '{engevale-engenharia}', 'engevale-engenharia',
   '{"engevale-engenharia": 5}'),
  (12, 'autopecas-sorocaba', 'Têmpera por indução em pinos',
   'Têmpera por indução em 2.000 pinos de aço 1045, camada de 1,5 mm. Busca de fornecedor recorrente.',
   'tratamento-termico', 'sorocaba', 8, '{termo-boituva}', null, '{}'),
  (13, 'embalagens-itu', 'Usinagem de buchas em bronze',
   'Usinagem de 200 buchas em bronze TM23, Ø externo 40 mm. Acabamento retificado no furo.',
   'usinagem', 'itu', 5, '{metalurgica-salto-cnc,usinagem-precisao-sorocaba}', null, '{}'),
  (14, 'usinagem-precisao-sorocaba', 'Tratamento térmico de matrizes',
   'Têmpera a vácuo de 6 matrizes em aço H13. Dureza de 46 a 48 HRC.',
   'tratamento-termico', 'sorocaba', 10, '{termo-boituva}', 'termo-boituva',
   '{"termo-boituva": 4}'),
  (15, 'agromaq-boituva', 'Solda de reparo em chassi de implemento',
   'Reparo com solda em chassi de plantadeira. Trinca de aproximadamente 40 cm. Atendimento em Boituva.',
   'solda', 'boituva', 2, '{}', null, '{}');

do $$
declare
  q record;
  v_quote_id uuid;
  v_prestador text;
  v_idx int;
  v_created timestamptz;
begin
  perform setseed(0.42);

  for q in select * from seed_quotes order by n loop
    v_created := now() - make_interval(days => q.dias_atras, hours => q.n);

    perform pg_temp.act_as(q.solicitante);
    v_quote_id := public.create_quote_request(
      pg_temp.company_id(q.solicitante), q.titulo, q.descricao,
      (select id from public.categories where slug = q.categoria),
      (select id from public.cities where slug = q.cidade),
      (v_created + interval '30 days')::date
    );

    update public.quote_requests set created_at = v_created where id = v_quote_id;
    update public.quote_recipients set enviado_em = v_created where quote_id = v_quote_id;

    v_idx := 0;
    foreach v_prestador in array q.respondem loop
      v_idx := v_idx + 1;
      perform pg_temp.act_as(v_prestador);
      perform public.mark_quote_viewed(v_quote_id, pg_temp.company_id(v_prestador));
      perform public.reply_to_quote(
        v_quote_id,
        pg_temp.company_id(v_prestador),
        'Olá! Temos capacidade para atender este pedido. Valor considera material e frete na região.',
        round((2000 + random() * 38000)::numeric, -1),
        (7 + floor(random() * 30))::int
      );
      update public.quote_replies
      set created_at = v_created + make_interval(hours => 6 * v_idx)
      where quote_id = v_quote_id and prestador_id = pg_temp.company_id(v_prestador);
      update public.quote_recipients
      set visualizado_em = v_created + make_interval(hours => 3 * v_idx),
          respondido_em = v_created + make_interval(hours => 6 * v_idx)
      where quote_id = v_quote_id and prestador_id = pg_temp.company_id(v_prestador);
    end loop;

    if q.escolhido is not null then
      perform pg_temp.act_as(q.solicitante);
      perform public.close_quote(v_quote_id, pg_temp.company_id(q.escolhido));
      update public.quote_requests set fechado_em = v_created + interval '3 days' where id = v_quote_id;
    end if;

    insert into public.reviews (
      quote_id, prestador_id, autor_company_id, autor_user_id, nota, comentario, projeto_descricao, created_at
    )
    select
      v_quote_id, pg_temp.company_id(r.key), pg_temp.company_id(q.solicitante), pg_temp.user_id(q.solicitante),
      r.value::int,
      case r.value::int
        when 5 then 'Entrega no prazo e qualidade excelente. Recomendamos.'
        when 4 then 'Bom atendimento e qualidade dentro do esperado.'
        else 'Serviço atendeu, mas houve atraso na entrega.'
      end,
      q.titulo,
      v_created + interval '20 days'
    from jsonb_each_text(q.notas) as r(key, value);
  end loop;

  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- Métricas dos últimos 30 dias ----------------------------------------------------

delete from public.profile_metrics;

insert into public.profile_metrics (company_id, dia, views, whatsapp_clicks, quote_clicks, orcamentos_recebidos)
select
  c.id,
  d.dia,
  (case when c.premium then 20 else 6 end + floor(random() * 25))::int,
  floor(random() * 4)::int,
  floor(random() * 3)::int,
  (
    select count(*)
    from public.quote_recipients r
    where r.prestador_id = c.id
      and (r.enviado_em at time zone 'America/Sao_Paulo')::date = d.dia
  )::int
from public.companies c
cross join generate_series(public.today_local() - 29, public.today_local(), interval '1 day') as g(ts)
cross join lateral (select g.ts::date as dia) d
where c.tipo <> 'contratante';
