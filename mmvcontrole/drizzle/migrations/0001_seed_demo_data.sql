-- Equipamentos de demonstração
INSERT INTO public.equipment (id, patrimonio, nome, category_id, marca, modelo, numero_serie, unit_id, department_id, location_id, valor_estimado, data_compra, estado_conservacao, status, frequencia_revisao_dias, proxima_revisao, descricao)
VALUES
 ('a0000000-0000-0000-0000-000000000001','PAT-1001','Câmera Sony FX3', (SELECT id FROM public.equipment_categories WHERE nome='Câmeras'),'Sony','FX3','SN-FX3-001','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222221','33333333-3333-3333-3333-333333333331',38000,'2024-03-10','ótimo','disponivel',180,current_date + 40,'Câmera principal de transmissão'),
 ('a0000000-0000-0000-0000-000000000002','PAT-1002','Câmera Canon R6', (SELECT id FROM public.equipment_categories WHERE nome='Câmeras'),'Canon','EOS R6','SN-R6-002','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222221','33333333-3333-3333-3333-333333333331',24000,'2023-11-05','bom','retirado',180,current_date + 90,'Câmera de apoio e fotografia'),
 ('a0000000-0000-0000-0000-000000000003','PAT-1003','Câmera Blackmagic 6K', (SELECT id FROM public.equipment_categories WHERE nome='Câmeras'),'Blackmagic','Pocket 6K','SN-BM-003','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222223','33333333-3333-3333-3333-333333333332',31000,'2024-06-20','bom','precisa_limpeza',180,current_date + 15,'Câmera de estúdio'),
 ('a0000000-0000-0000-0000-000000000004','PAT-1010','Lente Sony 24-70mm', (SELECT id FROM public.equipment_categories WHERE nome='Lentes'),'Sony','GM 24-70','SN-LEN-010','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222221','33333333-3333-3333-3333-333333333331',12000,'2024-03-10','ótimo','disponivel',365,current_date + 120,'Lente padrão'),
 ('a0000000-0000-0000-0000-000000000005','PAT-1011','Lente Canon 70-200mm', (SELECT id FROM public.equipment_categories WHERE nome='Lentes'),'Canon','RF 70-200','SN-LEN-011','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222221','33333333-3333-3333-3333-333333333331',14500,'2023-11-05','bom','disponivel',365,current_date + 200,'Lente de longo alcance'),
 ('a0000000-0000-0000-0000-000000000006','PAT-1012','Lente 50mm f/1.2', (SELECT id FROM public.equipment_categories WHERE nome='Lentes'),'Sony','GM 50mm','SN-LEN-012','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222221','33333333-3333-3333-3333-333333333331',9800,'2024-01-15','ótimo','disponivel',365,current_date + 150,'Lente para entrevistas'),
 ('a0000000-0000-0000-0000-000000000007','PAT-1020','Tripé Manfrotto 546B', (SELECT id FROM public.equipment_categories WHERE nome='Tripés'),'Manfrotto','546B','SN-TRI-020','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222221','33333333-3333-3333-3333-333333333333',5200,'2023-08-01','bom','disponivel',365,current_date + 60,'Tripé de vídeo'),
 ('a0000000-0000-0000-0000-000000000008','PAT-1021','Tripé Benro S8', (SELECT id FROM public.equipment_categories WHERE nome='Tripés'),'Benro','S8','SN-TRI-021','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222221','33333333-3333-3333-3333-333333333333',3100,'2023-08-01','regular','precisa_revisao',365,current_date - 5,'Tripé leve'),
 ('a0000000-0000-0000-0000-000000000009','PAT-1030','Microfone Rode NTG5', (SELECT id FROM public.equipment_categories WHERE nome='Microfones'),'Rode','NTG5','SN-MIC-030','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333331',4200,'2024-02-12','ótimo','disponivel',180,current_date + 70,'Microfone direcional'),
 ('a0000000-0000-0000-0000-000000000010','PAT-1031','Microfone lapela Sennheiser', (SELECT id FROM public.equipment_categories WHERE nome='Microfones'),'Sennheiser','EW 112P','SN-MIC-031','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333331',6800,'2024-02-12','bom','danificado',180,current_date + 20,'Sistema de lapela sem fio'),
 ('a0000000-0000-0000-0000-000000000011','PAT-1040','Mesa de corte ATEM Mini Pro', (SELECT id FROM public.equipment_categories WHERE nome='Mesas de corte'),'Blackmagic','ATEM Mini Pro','SN-ATEM-040','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222223','33333333-3333-3333-3333-333333333332',7900,'2023-05-18','bom','disponivel',365,current_date + 100,'Switcher de transmissão'),
 ('a0000000-0000-0000-0000-000000000012','PAT-1050','Notebook Dell G15', (SELECT id FROM public.equipment_categories WHERE nome='Notebooks'),'Dell','G15','SN-NB-050','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222223','33333333-3333-3333-3333-333333333332',9500,'2023-09-30','bom','enviado_assistencia',365,current_date + 30,'Notebook de transmissão'),
 ('a0000000-0000-0000-0000-000000000013','PAT-1060','Cabo HDMI 10m', (SELECT id FROM public.equipment_categories WHERE nome='Cabos'),'Elgato','HDMI 2.0','SN-CB-060','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222223','33333333-3333-3333-3333-333333333331',220,'2024-04-04','bom','disponivel',NULL,NULL,'Cabo de vídeo'),
 ('a0000000-0000-0000-0000-000000000014','PAT-1061','Cabo SDI 20m', (SELECT id FROM public.equipment_categories WHERE nome='Cabos'),'Kramer','SDI','SN-CB-061','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222223','33333333-3333-3333-3333-333333333331',380,'2024-04-04','bom','disponivel',NULL,NULL,'Cabo de vídeo profissional'),
 ('a0000000-0000-0000-0000-000000000015','PAT-1062','Cabo XLR 15m', (SELECT id FROM public.equipment_categories WHERE nome='Cabos'),'Santo Angelo','XLR','SN-CB-062','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333331',180,'2024-04-04','bom','disponivel',NULL,NULL,'Cabo de áudio'),
 ('a0000000-0000-0000-0000-000000000016','PAT-1063','Cabo de rede Cat6 30m', (SELECT id FROM public.equipment_categories WHERE nome='Cabos'),'Furukawa','Cat6','SN-CB-063','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222223','33333333-3333-3333-3333-333333333331',260,'2024-04-04','bom','quebrado',NULL,NULL,'Cabo de rede'),
 ('a0000000-0000-0000-0000-000000000017','PAT-1070','Bateria NP-F970 #1', (SELECT id FROM public.equipment_categories WHERE nome='Baterias'),'Sony','NP-F970','SN-BAT-070','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222221','33333333-3333-3333-3333-333333333331',450,'2024-01-20','bom','disponivel',NULL,NULL,'Bateria de câmera'),
 ('a0000000-0000-0000-0000-000000000018','PAT-1071','Bateria NP-F970 #2', (SELECT id FROM public.equipment_categories WHERE nome='Baterias'),'Sony','NP-F970','SN-BAT-071','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222221','33333333-3333-3333-3333-333333333331',450,'2024-01-20','bom','disponivel',NULL,NULL,'Bateria de câmera'),
 ('a0000000-0000-0000-0000-000000000019','PAT-1072','Bateria V-Mount #1', (SELECT id FROM public.equipment_categories WHERE nome='Baterias'),'Neewer','V-Mount 150W','SN-BAT-072','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222221','33333333-3333-3333-3333-333333333331',1200,'2024-05-11','bom','disponivel',NULL,NULL,'Bateria de iluminação'),
 ('a0000000-0000-0000-0000-000000000020','PAT-1073','Bateria V-Mount #2', (SELECT id FROM public.equipment_categories WHERE nome='Baterias'),'Neewer','V-Mount 150W','SN-BAT-073','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222221','33333333-3333-3333-3333-333333333331',1200,'2024-05-11','bom','aguardando_conferencia',NULL,NULL,'Bateria de iluminação'),
 ('a0000000-0000-0000-0000-000000000021','PAT-1080','Carregador duplo NP-F', (SELECT id FROM public.equipment_categories WHERE nome='Carregadores'),'Sony','BC-QM1','SN-CAR-080','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222221','33333333-3333-3333-3333-333333333331',600,'2024-01-20','bom','disponivel',NULL,NULL,'Carregador de baterias'),
 ('a0000000-0000-0000-0000-000000000022','PAT-1081','Carregador V-Mount', (SELECT id FROM public.equipment_categories WHERE nome='Carregadores'),'Neewer','VM-Charger','SN-CAR-081','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222221','33333333-3333-3333-3333-333333333331',750,'2024-05-11','bom','disponivel',NULL,NULL,'Carregador de baterias V-Mount');

-- Acessórios
INSERT INTO public.equipment_accessories (equipment_id, nome, quantidade, obrigatorio) VALUES
 ('a0000000-0000-0000-0000-000000000001','Bateria', 2, true),
 ('a0000000-0000-0000-0000-000000000001','Cartão de memória', 2, true),
 ('a0000000-0000-0000-0000-000000000001','Carregador', 1, true),
 ('a0000000-0000-0000-0000-000000000001','Case', 1, true),
 ('a0000000-0000-0000-0000-000000000002','Bateria', 2, true),
 ('a0000000-0000-0000-0000-000000000002','Alça', 1, false),
 ('a0000000-0000-0000-0000-000000000011','Fonte', 1, true),
 ('a0000000-0000-0000-0000-000000000011','Cabo HDMI', 2, true),
 ('a0000000-0000-0000-0000-000000000012','Fonte', 1, true),
 ('a0000000-0000-0000-0000-000000000010','Pilhas AA', 2, true);

-- Kits
INSERT INTO public.kits (id, nome, descricao, unit_id) VALUES
 ('b0000000-0000-0000-0000-000000000001','Kit Câmera','Câmera principal, lentes, baterias e tripé','11111111-1111-1111-1111-111111111111'),
 ('b0000000-0000-0000-0000-000000000002','Kit Transmissão','Mesa de corte, notebook e cabos','11111111-1111-1111-1111-111111111111');

INSERT INTO public.kit_items (kit_id, equipment_id, obrigatorio) VALUES
 ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001',true),
 ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000004',true),
 ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000007',true),
 ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000017',true),
 ('b0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000011',true),
 ('b0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000013',true),
 ('b0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000014',true);

-- Retirada em aberto (demonstração)
INSERT INTO public.checkouts (id, equipment_id, responsavel_nome, autorizado_por_nome, finalidade, evento, destino, unit_id, retirada_em, previsao_devolucao, estado_saida, acessorios, observacoes, termo_aceito, assinatura, status)
VALUES
 ('c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','Diego Martins','Cléo Rossafa','Gravação externa','Culto de celebração','Templo Taquari - Mooca','11111111-1111-1111-1111-111111111111', now() - interval '3 days', now() - interval '1 day','Bom','[{"nome":"Bateria","conferido":true},{"nome":"Alça","conferido":true}]','Retirada com devolução atrasada para demonstração', true,'Diego Martins','aberta');

UPDATE public.equipment SET responsavel_atual_nome = 'Diego Martins' WHERE id = 'a0000000-0000-0000-0000-000000000002';

-- Devolução aguardando conferência
INSERT INTO public.checkouts (id, equipment_id, responsavel_nome, autorizado_por_nome, finalidade, evento, destino, unit_id, retirada_em, previsao_devolucao, estado_saida, status)
VALUES ('c0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000020','Aline Souza','Cléo Rossafa','Iluminação de evento','Congresso de jovens','Estúdio','11111111-1111-1111-1111-111111111111', now() - interval '6 days', now() - interval '4 days','Bom','devolvida');

INSERT INTO public.returns (checkout_id, equipment_id, devolvido_por_nome, recebido_por_nome, condicao, relato, status, devolvido_em)
VALUES ('c0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000020','Aline Souza','Coordenação','perfeito','Sem problemas','aguardando_conferencia', now() - interval '1 day');

-- Manutenção e assistência técnica
INSERT INTO public.maintenance_orders (equipment_id, problema, relatado_por_nome, prioridade, diagnostico, status, valor_pecas, valor_mao_obra, custo_total, inicio, previsao_conclusao)
VALUES
 ('a0000000-0000-0000-0000-000000000010','Sem áudio no canal direito','Diego Martins','alta','Cabo interno rompido','em_manutencao',120,180,300, current_date - 4, current_date + 3),
 ('a0000000-0000-0000-0000-000000000016','Conector partido','Aline Souza','normal',NULL,'aguardando_avaliacao',0,0,0,NULL,NULL);

INSERT INTO public.technical_assistance (equipment_id, empresa, contato, telefone, enviado_em, entregue_por, protocolo, defeito, orcamento, previsao_retorno, status)
VALUES ('a0000000-0000-0000-0000-000000000012','TecService Informática','Rogério','(11) 4002-8922', current_date - 12,'Coordenação','PROT-88231','Não liga após queda de energia', 850, current_date - 2,'em_reparo');

INSERT INTO public.cleaning_orders (equipment_id, motivo, tipo, responsavel_nome, status)
VALUES ('a0000000-0000-0000-0000-000000000003','Poeira e marcas no visor','limpeza','Equipe de produção','aguardando');

-- Movimentações recentes
INSERT INTO public.movements (equipment_id, tipo, responsavel_nome, destino, status, detalhes, created_at) VALUES
 ('a0000000-0000-0000-0000-000000000002','retirada','Diego Martins','Templo Taquari - Mooca','aberta','Culto de celebração', now() - interval '3 days'),
 ('a0000000-0000-0000-0000-000000000020','retirada','Aline Souza','Estúdio','devolvida','Congresso de jovens', now() - interval '6 days'),
 ('a0000000-0000-0000-0000-000000000020','devolucao','Aline Souza','Sala técnica','aguardando_conferencia','Devolvido em perfeito estado', now() - interval '1 day'),
 ('a0000000-0000-0000-0000-000000000012','assistencia','Coordenação','TecService Informática','em_reparo','Enviado para assistência técnica', now() - interval '12 days'),
 ('a0000000-0000-0000-0000-000000000010','manutencao','Diego Martins','Sala técnica','em_manutencao','Ordem de manutenção aberta', now() - interval '4 days');
