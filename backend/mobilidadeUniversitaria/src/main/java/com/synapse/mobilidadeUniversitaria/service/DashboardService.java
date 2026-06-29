package com.synapse.mobilidadeUniversitaria.service;

import com.synapse.mobilidadeUniversitaria.dtos.DashboardKpiResponseDTO;
import com.synapse.mobilidadeUniversitaria.Entities.Aluno;
import com.synapse.mobilidadeUniversitaria.Entities.PresencaDigital;
import com.synapse.mobilidadeUniversitaria.Entities.Usuario;
import com.synapse.mobilidadeUniversitaria.Entities.Viagem;
import com.synapse.mobilidadeUniversitaria.Entities.enums.PresencaStatus;
import com.synapse.mobilidadeUniversitaria.Entities.enums.StatusMatricula;
import com.synapse.mobilidadeUniversitaria.Entities.enums.UserType;
import com.synapse.mobilidadeUniversitaria.Entities.enums.ViagemStatus;
import com.synapse.mobilidadeUniversitaria.dtos.response.AlunoFrequenciaResponseDTO;
import com.synapse.mobilidadeUniversitaria.dtos.response.DashboardGestorResponseDTO;
import com.synapse.mobilidadeUniversitaria.dtos.response.DemandaPorDiaResponseDTO;
import com.synapse.mobilidadeUniversitaria.dtos.response.OcupacaoPorRotaResponseDTO;
import com.synapse.mobilidadeUniversitaria.repositories.AlunoRepository;
import com.synapse.mobilidadeUniversitaria.repositories.PresencaDigitalRepository;
import com.synapse.mobilidadeUniversitaria.repositories.UsuarioRepository;
import com.synapse.mobilidadeUniversitaria.repositories.ViagemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final AlunoRepository alunoRepository;
    private final ViagemRepository viagemRepository;
    private final PresencaDigitalRepository presencaRepository;
    private final UsuarioRepository usuarioRepository;

    public DashboardService(AlunoRepository alunoRepository,
                            ViagemRepository viagemRepository,
                            PresencaDigitalRepository presencaRepository,
                            UsuarioRepository usuarioRepository) {
        this.alunoRepository = alunoRepository;
        this.viagemRepository = viagemRepository;
        this.presencaRepository = presencaRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional(readOnly = true)
    public DashboardGestorResponseDTO dashboardGestor() {
        List<Viagem> viagensHoje = viagensHoje();
        long presencasHoje = presencasDasViagens(viagensHoje);
        int capacidadeHoje = viagensHoje.stream()
                .filter(viagem -> viagem.getVeiculo() != null)
                .mapToInt(viagem -> viagem.getVeiculo().getCapacidadeTotal())
                .sum();

        double taxaOcupacao = capacidadeHoje == 0 ? 0 : (presencasHoje * 100.0) / capacidadeHoje;

        long totalAlunos = usuarioRepository.findByUserType(UserType.ALUNO).size();

        return new DashboardGestorResponseDTO(
                totalAlunos,
                taxaOcupacao,
                viagensHoje.size(),
                0
        );
    }

    @Transactional(readOnly = true)
    public DashboardKpiResponseDTO kpis() {
        LocalDate hoje = LocalDate.now();
        LocalDateTime inicioHoje = hoje.atStartOfDay();
        LocalDateTime fimHoje = hoje.plusDays(1).atStartOfDay();
        LocalDateTime inicio7DiasAntes = hoje.minusDays(7).atStartOfDay();
        LocalDateTime inicio14DiasAntes = hoje.minusDays(14).atStartOfDay();
        LocalDateTime inicio30DiasAntes = hoje.minusDays(30).atStartOfDay();
        LocalDateTime inicio60DiasAntes = hoje.minusDays(60).atStartOfDay();

        long totalAlunosAtivos = alunoRepository.countByStatusMatricula(StatusMatricula.ATIVA);
        long alunosCriadosPeriodoAtual = alunoRepository.countByStatusMatriculaAndCreatedAtBetween(StatusMatricula.ATIVA, inicio30DiasAntes, inicioHoje);
        long alunosCriadosPeriodoAnterior = alunoRepository.countByStatusMatriculaAndCreatedAtBetween(StatusMatricula.ATIVA, inicio60DiasAntes, inicio30DiasAntes);

        List<Viagem> viagensHoje = viagensHoje();
        double ocupacaoHoje = calcularOcupacaoPeriodo(inicioHoje, fimHoje);
        double ocupacao7Dias = calcularOcupacaoPeriodo(inicio7DiasAntes, fimHoje);
        double ocupacao7DiasAnteriores = calcularOcupacaoPeriodo(inicio14DiasAntes, inicio7DiasAntes);

        return DashboardKpiResponseDTO.builder()
                .totalAlunos(totalAlunosAtivos)
                .variacaoAlunos(calcularVariacaoPercentual(alunosCriadosPeriodoAtual, alunosCriadosPeriodoAnterior))
                .taxaOcupacao((int) Math.round(ocupacaoHoje))
                .variacaoOcupacao(calcularVariacaoPercentual(ocupacao7Dias, ocupacao7DiasAnteriores))
                .viagensHoje((long) viagensHoje.size())
                .viagensFinalizadas(contarViagensFinalizadasHoje())
                .economiaEstimada(0.0)
                .build();
    }

    @Transactional(readOnly = true)
    public List<OcupacaoPorRotaResponseDTO> ocupacaoPorRota() {
        return viagemRepository.findAll()
                .stream()
                .filter(viagem -> viagem.getRota() != null)
                .collect(Collectors.groupingBy(Viagem::getRota))
                .entrySet()
                .stream()
                .map(entry -> {
                    List<Viagem> viagens = entry.getValue();
                    long presencas = presencasDasViagens(viagens);
                    int capacidade = viagens.stream()
                            .filter(viagem -> viagem.getVeiculo() != null)
                            .mapToInt(viagem -> viagem.getVeiculo().getCapacidadeTotal())
                            .sum();
                    double ocupacao = capacidade == 0 ? 0 : (presencas * 100.0) / capacidade;
                    return new OcupacaoPorRotaResponseDTO(
                            entry.getKey().getId(),
                            entry.getKey().getNomeRota(),
                            presencas,
                            capacidade,
                            ocupacao
                    );
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DemandaPorDiaResponseDTO> demandaPorDia() {
        Map<DayOfWeek, Long> presencasPorDia = presencaRepository.findAll()
                .stream()
                .filter(presenca -> presenca.getDataHoraReserva() != null || presenca.getDataHoraValidacao() != null)
                .collect(Collectors.groupingBy(
                        presenca -> {
                            LocalDateTime origem = presenca.getDataHoraReserva() != null
                                    ? presenca.getDataHoraReserva()
                                    : presenca.getDataHoraValidacao();
                            return origem.getDayOfWeek();
                        },
                        Collectors.counting()
                ));

        Map<DayOfWeek, String> ordemDias = new LinkedHashMap<>();
        ordemDias.put(DayOfWeek.MONDAY, "segunda-feira");
        ordemDias.put(DayOfWeek.TUESDAY, "terça-feira");
        ordemDias.put(DayOfWeek.WEDNESDAY, "quarta-feira");
        ordemDias.put(DayOfWeek.THURSDAY, "quinta-feira");
        ordemDias.put(DayOfWeek.FRIDAY, "sexta-feira");
        ordemDias.put(DayOfWeek.SATURDAY, "sábado");
        ordemDias.put(DayOfWeek.SUNDAY, "domingo");

        return ordemDias.entrySet()
                .stream()
                .filter(entry -> presencasPorDia.containsKey(entry.getKey()))
                .map(entry -> new DemandaPorDiaResponseDTO(entry.getValue(), presencasPorDia.get(entry.getKey())))
                .toList();
    }

    private List<Viagem> viagensHoje() {
        LocalDate hoje = LocalDate.now();
        LocalDateTime inicio = hoje.atStartOfDay();
        LocalDateTime fim = hoje.plusDays(1).atStartOfDay();
        return viagemRepository.findByDataHoraPartidaBetween(inicio, fim);
    }

    private List<Viagem> viagensNoPeriodo(LocalDateTime inicio, LocalDateTime fim) {
        return viagemRepository.findByDataHoraPartidaBetween(inicio, fim);
    }

    private long presencasDasViagens(List<Viagem> viagens) {
        return viagens.stream()
                .map(Viagem::getId)
                .mapToLong(viagemId -> presencaRepository.findByViagemId(viagemId).size())
                .sum();
    }

    private double calcularOcupacaoPeriodo(LocalDateTime inicio, LocalDateTime fim) {
        List<Viagem> viagens = viagensNoPeriodo(inicio, fim);
        int capacidadeTotal = viagens.stream()
                .filter(viagem -> viagem.getVeiculo() != null)
                .mapToInt(viagem -> viagem.getVeiculo().getCapacidadeTotal())
                .sum();
        long presencasTotais = presencasDasViagens(viagens);
        return capacidadeTotal == 0 ? 0 : (presencasTotais * 100.0) / capacidadeTotal;
    }

    private double calcularVariacaoPercentual(double atual, double anterior) {
        if (anterior == 0) {
            return atual > 0 ? 100.0 : 0.0;
        }
        return ((atual - anterior) * 100.0) / anterior;
    }

    private double calcularVariacaoPercentual(long atual, long anterior) {
        return calcularVariacaoPercentual((double) atual, (double) anterior);
    }

    @Transactional(readOnly = true)
    public long contarViagensFinalizadasHoje() {
        return viagensHoje().stream()
                .filter(v -> ViagemStatus.FINALIZADA.equals(v.getStatus()))
                .count();
    }

    @Transactional(readOnly = true)
    public AlunoFrequenciaResponseDTO calcularFrequenciaAluno(Long alunoId) {
        // Try to find as Aluno entity (proper JPA subtype)
        String nome;
        LocalDateTime createdAt;

        java.util.Optional<Aluno> alunoOpt = alunoRepository.findById(alunoId);
        if (alunoOpt.isPresent()) {
            Aluno aluno = alunoOpt.get();
            nome = aluno.getNome();
            createdAt = aluno.getCreatedAt();
        } else {
            // Fallback: find by usuario table (e.g. created via UsuarioService)
            Usuario usuario = usuarioRepository.findById(alunoId)
                    .orElseThrow(() -> new com.synapse.mobilidadeUniversitaria.exceptions.ResourceNotFoundException("Aluno nao encontrado com id: " + alunoId));
            if (usuario.getUserType() != UserType.ALUNO) {
                throw new com.synapse.mobilidadeUniversitaria.exceptions.ResourceNotFoundException("Usuario " + alunoId + " nao e do tipo ALUNO");
            }
            nome = usuario.getNome();
            createdAt = usuario.getCreatedAt();
        }

        List<PresencaDigital> presencas = presencaRepository.findByAlunoId(alunoId);

        long totalReservadas = presencas.size();
        long confirmadas = presencas.stream()
                .filter(p -> PresencaStatus.CONFIRMADA.equals(p.getStatus()))
                .count();

        double frequencia = totalReservadas == 0 ? 0 : (confirmadas * 100.0) / totalReservadas;

        return new AlunoFrequenciaResponseDTO(
                alunoId,
                nome,
                totalReservadas,
                confirmadas,
                frequencia,
                createdAt
        );
    }

    @Transactional(readOnly = true)
    public List<AlunoFrequenciaResponseDTO> calcularFrequenciaTodosAlunos() {
        // Get all users with ALUNO type directly
        List<Usuario> alunos = usuarioRepository.findByUserType(UserType.ALUNO);
        return alunos.stream()
                .map(u -> {
                    List<PresencaDigital> presencas = presencaRepository.findByAlunoId(u.getId());
                    long totalReservadas = presencas.size();
                    long confirmadas = presencas.stream()
                            .filter(p -> PresencaStatus.CONFIRMADA.equals(p.getStatus()))
                            .count();
                    double frequencia = totalReservadas == 0 ? 0 : (confirmadas * 100.0) / totalReservadas;
                    return new AlunoFrequenciaResponseDTO(
                            u.getId(),
                            u.getNome(),
                            totalReservadas,
                            confirmadas,
                            frequencia,
                            u.getCreatedAt()
                    );
                })
                .collect(Collectors.toList());
    }
}
