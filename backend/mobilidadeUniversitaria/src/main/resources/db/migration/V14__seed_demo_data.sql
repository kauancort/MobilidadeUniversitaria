-- Seed Faculdade
INSERT INTO faculdade (id, nome, endereco_id)
VALUES (1, 'Universidade Go Campus', 1)
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    endereco_id = EXCLUDED.endereco_id;

-- Atualizar aluno do seed para ter faculdade
UPDATE aluno SET faculdade_id = 1 WHERE id = 3;

-- Seed Rota
INSERT INTO rota (id, nome_rota, descricao, ponto_parada, ativa)
VALUES (1, 'Centro-Campus', 'Rota principal do centro ate o campus', 'Terminal Central', TRUE)
ON CONFLICT (id) DO UPDATE SET
    nome_rota = EXCLUDED.nome_rota,
    descricao = EXCLUDED.descricao,
    ponto_parada = EXCLUDED.ponto_parada,
    ativa = EXCLUDED.ativa;

-- Seed Veiculo
INSERT INTO veiculo (id, placa, modelo, capacidade_total, status)
VALUES (1, 'GCM-0001', 'Mercedes Sprinter 2022', 45, 'ATIVO')
ON CONFLICT (id) DO UPDATE SET
    placa = EXCLUDED.placa,
    modelo = EXCLUDED.modelo,
    capacidade_total = EXCLUDED.capacidade_total,
    status = EXCLUDED.status;

-- Seed Viagem
INSERT INTO viagem (id, data_hora_partida, data_hora_chegada_prevista, status, motorista_id, veiculo_id, rota_id)
VALUES (
    1,
    TIMESTAMP '2099-01-01 07:30:00',
    TIMESTAMP '2099-01-01 08:30:00',
    'AGENDADA',
    2,
    1,
    1
)
ON CONFLICT (id) DO UPDATE SET
    data_hora_partida = EXCLUDED.data_hora_partida,
    data_hora_chegada_prevista = EXCLUDED.data_hora_chegada_prevista,
    status = EXCLUDED.status,
    motorista_id = EXCLUDED.motorista_id,
    veiculo_id = EXCLUDED.veiculo_id,
    rota_id = EXCLUDED.rota_id;

SELECT setval(pg_get_serial_sequence('faculdade', 'id'), COALESCE((SELECT MAX(id) FROM faculdade), 1), true);
SELECT setval(pg_get_serial_sequence('rota', 'id'), COALESCE((SELECT MAX(id) FROM rota), 1), true);
SELECT setval(pg_get_serial_sequence('veiculo', 'id'), COALESCE((SELECT MAX(id) FROM veiculo), 1), true);
SELECT setval(pg_get_serial_sequence('viagem', 'id'), COALESCE((SELECT MAX(id) FROM viagem), 1), true);
