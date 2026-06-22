package com.synapse.mobilidadeUniversitaria.service;

import com.synapse.mobilidadeUniversitaria.Entities.enums.PresencaStatus;
import com.synapse.mobilidadeUniversitaria.Entities.enums.ViagemStatus;
import com.synapse.mobilidadeUniversitaria.dtos.request.QRCodeConfirmacaoRequestDTO;
import com.synapse.mobilidadeUniversitaria.Entities.Aluno;
import com.synapse.mobilidadeUniversitaria.Entities.PresencaDigital;
import com.synapse.mobilidadeUniversitaria.Entities.Viagem;
import com.synapse.mobilidadeUniversitaria.dtos.request.PresencaRequestDTO;
import com.synapse.mobilidadeUniversitaria.dtos.response.QRCodeConfirmacaoResponseDTO;
import com.synapse.mobilidadeUniversitaria.dtos.response.QRCodePreviewResponseDTO;
import com.synapse.mobilidadeUniversitaria.dtos.response.OcupacaoViagemResponseDTO;
import com.synapse.mobilidadeUniversitaria.dtos.response.PresencaDigitalResponseDTO;
import com.synapse.mobilidadeUniversitaria.exceptions.BadRequestException;
import com.synapse.mobilidadeUniversitaria.exceptions.ResourceAlreadyExistsException;
import com.synapse.mobilidadeUniversitaria.exceptions.ResourceNotFoundException;
import com.synapse.mobilidadeUniversitaria.repositories.AlunoRepository;
import com.synapse.mobilidadeUniversitaria.repositories.PresencaDigitalRepository;
import com.synapse.mobilidadeUniversitaria.repositories.ViagemRepository;
import com.synapse.mobilidadeUniversitaria.security.AuthorizationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PresencaService {

    private final PresencaDigitalRepository presencaRepository;
    private final AlunoRepository alunoRepository;
    private final ViagemRepository viagemRepository;
    private final QRCodeService qrCodeService;
    private final AuthorizationService authorizationService;

    public PresencaService(PresencaDigitalRepository presencaRepository,
                           AlunoRepository alunoRepository,
                           ViagemRepository viagemRepository,
                           QRCodeService qrCodeService,
                           AuthorizationService authorizationService) {
        this.presencaRepository = presencaRepository;
        this.alunoRepository = alunoRepository;
        this.viagemRepository = viagemRepository;
        this.qrCodeService = qrCodeService;
        this.authorizationService = authorizationService;
    }

    @Transactional
    public PresencaDigitalResponseDTO registrar(PresencaRequestDTO dto) {
        return registrar(dto.alunoId(), dto.viagemId());
    }

    @Transactional
    public PresencaDigitalResponseDTO reservarParaAlunoLogado(Long viagemId) {
        return registrar(authorizationService.currentUser().getId(), viagemId);
    }

    private PresencaDigitalResponseDTO registrar(Long alunoId, Long viagemId) {
        if (presencaRepository.findByAlunoIdAndViagemId(alunoId, viagemId).isPresent()) {
            throw new ResourceAlreadyExistsException("Aluno ja possui reserva de presenca nesta viagem");
        }

        Aluno aluno = alunoRepository.findById(alunoId)
                .orElseThrow(() -> new ResourceNotFoundException("Aluno nao encontrado com id: " + alunoId));
        Viagem viagem = viagemRepository.findById(viagemId)
                .orElseThrow(() -> new ResourceNotFoundException("Viagem nao encontrada com id: " + viagemId));

        validarViagemPodeReceberReserva(viagem);

        PresencaDigital presenca = new PresencaDigital();
        presenca.setAluno(aluno);
        presenca.setViagem(viagem);

        return toResponse(presencaRepository.save(presenca));
    }

    @Transactional
    public QRCodeConfirmacaoResponseDTO confirmarPorQRCode(QRCodeConfirmacaoRequestDTO dto) {
        return confirmarPorQRCode(dto.alunoId(), dto.qrData());
    }

    @Transactional
    public QRCodeConfirmacaoResponseDTO confirmarPorQRCodeDoAlunoLogado(String qrData) {
        Long alunoId = authorizationService.currentUser().getId();
        return confirmarPorQRCode(alunoId, qrData);
    }

    @Transactional(readOnly = true)
    public QRCodePreviewResponseDTO previsualizarScanDoMotorista(String qrData) {
        Long alunoId = extrairAlunoIdDoQrData(qrData);
        Viagem viagem = buscarViagemAtivaDoMotorista();
        ReservaContexto contexto = buscarContextoReserva(alunoId, viagem);

        String mensagem = contexto.presenca.getStatus().name().equals("CONFIRMADA")
                ? "Presença já confirmada para este aluno"
                : "Aluno encontrado. Confira o nome e confirme a presença.";

        return new QRCodePreviewResponseDTO(
                true,
                contexto.aluno.getId(),
                contexto.aluno.getNome(),
                viagem.getId(),
                mensagem,
                toResponse(contexto.presenca)
        );
    }

    @Transactional
    public QRCodeConfirmacaoResponseDTO confirmarScanDoMotorista(String qrData) {
        Long alunoId = extrairAlunoIdDoQrData(qrData);
        Viagem viagem = buscarViagemAtivaDoMotorista();
        ReservaContexto contexto = buscarContextoReserva(alunoId, viagem);

        if (PresencaStatus.CANCELADA.equals(contexto.presenca.getStatus())) {
            throw new BadRequestException("Reserva de presenca cancelada");
        }

        if (PresencaStatus.CONFIRMADA.equals(contexto.presenca.getStatus())) {
            throw new ResourceAlreadyExistsException("Presenca ja confirmada nesta viagem");
        }

        contexto.presenca.setStatus(PresencaStatus.CONFIRMADA);
        contexto.presenca.setDataHoraValidacao(LocalDateTime.now());
        PresencaDigital confirmada = presencaRepository.save(contexto.presenca);

        return new QRCodeConfirmacaoResponseDTO(
                true,
                contexto.aluno.getId(),
                contexto.aluno.getNome(),
                viagem.getId(),
                "Presenca confirmada com sucesso",
                toResponse(confirmada)
        );
    }

    private QRCodeConfirmacaoResponseDTO confirmarPorQRCode(Long alunoId, String qrData) {
        Long viagemId = qrCodeService.validarEExtrairViagemId(qrData);

        Aluno aluno = alunoRepository.findById(alunoId)
                .orElseThrow(() -> new ResourceNotFoundException("Aluno nao encontrado com id: " + alunoId));

        PresencaDigital presenca = presencaRepository.findByAlunoIdAndViagemId(alunoId, viagemId)
                .orElseThrow(() -> new BadRequestException("Aluno nao possui reserva de presenca para esta viagem"));

        validarViagemPodeConfirmarPresenca(presenca.getViagem());

        if (PresencaStatus.CANCELADA.equals(presenca.getStatus())) {
            throw new BadRequestException("Reserva de presenca cancelada");
        }

        if (PresencaStatus.CONFIRMADA.equals(presenca.getStatus())) {
            throw new ResourceAlreadyExistsException("Presenca ja confirmada nesta viagem");
        }

        presenca.setStatus(PresencaStatus.CONFIRMADA);
        presenca.setDataHoraValidacao(LocalDateTime.now());
        PresencaDigital confirmada = presencaRepository.save(presenca);

        return new QRCodeConfirmacaoResponseDTO(
                true,
                aluno.getId(),
                aluno.getNome(),
                viagemId,
                "Presenca confirmada com sucesso",
                toResponse(confirmada)
        );
    }

    private Long extrairAlunoIdDoQrData(String qrData) {
        Long alunoId = null;
        if (qrData != null && qrData.matches("\\d+")) {
            alunoId = Long.parseLong(qrData);
        } else if (qrData != null && qrData.startsWith("GOCAMPUS-")) {
            String[] parts = qrData.split("-");
            if (parts.length >= 2) {
                try {
                    alunoId = Long.parseLong(parts[1]);
                } catch (NumberFormatException e) {
                    throw new BadRequestException("ID do aluno invalido no QR Code");
                }
            }
        }

        if (alunoId == null) {
            throw new BadRequestException("Formatacao de QR Code invalida");
        }

        return alunoId;
    }

    private Viagem buscarViagemAtivaDoMotorista() {
        Long motoristaId = authorizationService.currentUser().getId();
        return viagemRepository.findByMotoristaId(motoristaId)
                .stream()
                .filter(v -> ViagemStatus.EM_ANDAMENTO.equals(v.getStatus()) || ViagemStatus.AGENDADA.equals(v.getStatus()))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Nenhuma viagem ativa ou agendada encontrada para o motorista"));
    }

    private ReservaContexto buscarContextoReserva(Long alunoId, Viagem viagem) {
        Aluno aluno = alunoRepository.findById(alunoId)
                .orElseThrow(() -> new ResourceNotFoundException("Aluno nao encontrado com id: " + alunoId));

        PresencaDigital presenca = presencaRepository.findByAlunoIdAndViagemId(alunoId, viagem.getId())
                .orElseThrow(() -> new BadRequestException("Aluno nao possui reserva de presenca para a viagem " + viagem.getId()));

        return new ReservaContexto(aluno, presenca);
    }

    private record ReservaContexto(Aluno aluno, PresencaDigital presenca) {}

    @Transactional(readOnly = true)
    public List<PresencaDigitalResponseDTO> listarPorViagem(Long viagemId) {
        return presencaRepository.findByViagemId(viagemId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PresencaDigitalResponseDTO> listarPorAluno(Long alunoId) {
        return presencaRepository.findByAlunoId(alunoId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PresencaDigitalResponseDTO> listarDoAlunoLogado() {
        return listarPorAluno(authorizationService.currentUser().getId());
    }

    @Transactional(readOnly = true)
    public OcupacaoViagemResponseDTO ocupacaoDaViagem(Long viagemId) {
        Viagem viagem = viagemRepository.findById(viagemId)
                .orElseThrow(() -> new ResourceNotFoundException("Viagem nao encontrada com id: " + viagemId));

        List<PresencaDigital> presencas = presencaRepository.findByViagemId(viagemId);
        long reservas = presencas.stream()
                .filter(presenca -> !PresencaStatus.CANCELADA.equals(presenca.getStatus()))
                .count();
        long confirmados = presencas.stream()
                .filter(presenca -> PresencaStatus.CONFIRMADA.equals(presenca.getStatus()))
                .count();
        int capacidade = viagem.getVeiculo() == null ? 0 : viagem.getVeiculo().getCapacidadeTotal();
        double percentual = capacidade == 0 ? 0 : (confirmados * 100.0) / capacidade;

        return new OcupacaoViagemResponseDTO(viagemId, capacidade, reservas, confirmados, percentual);
    }

    @Transactional
    public void deletar(Long id) {
        PresencaDigital presenca = presencaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Presenca nao encontrada com id: " + id));
        presencaRepository.delete(presenca);
    }

    @Transactional
    public PresencaDigitalResponseDTO confirmarPresencaById(Long id) {
        PresencaDigital presenca = presencaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Presenca nao encontrada com id: " + id));

        if (PresencaStatus.CANCELADA.equals(presenca.getStatus())) {
            throw new BadRequestException("Reserva de presenca cancelada");
        }
        if (PresencaStatus.CONFIRMADA.equals(presenca.getStatus())) {
            throw new ResourceAlreadyExistsException("Presenca ja confirmada");
        }

        validarViagemPodeConfirmarPresenca(presenca.getViagem());

        presenca.setStatus(PresencaStatus.CONFIRMADA);
        presenca.setDataHoraValidacao(LocalDateTime.now());
        return toResponse(presencaRepository.save(presenca));
    }

    private PresencaDigitalResponseDTO toResponse(PresencaDigital presenca) {
        return new PresencaDigitalResponseDTO(
                presenca.getId(),
                presenca.getAluno().getId(),
                presenca.getAluno().getNome(),
                presenca.getViagem().getId(),
                presenca.getDataHoraReserva(),
                presenca.getDataHoraValidacao(),
                presenca.getStatus()
        );
    }

    private void validarViagemPodeReceberReserva(Viagem viagem) {
        if (!ViagemStatus.AGENDADA.equals(viagem.getStatus())) {
            throw new BadRequestException("Apenas viagens agendadas aceitam reserva de presenca");
        }
        // Validação de tempo removida para facilitar demonstração

        int capacidade = viagem.getVeiculo() == null ? 0 : viagem.getVeiculo().getCapacidadeTotal();
        long reservasAtivas = presencaRepository.countByViagemIdAndStatusNot(viagem.getId(), PresencaStatus.CANCELADA);
        if (capacidade > 0 && reservasAtivas >= capacidade) {
            throw new BadRequestException("Viagem sem vagas disponiveis");
        }
    }

    private void validarViagemPodeConfirmarPresenca(Viagem viagem) {
        if (ViagemStatus.CANCELADA.equals(viagem.getStatus()) || ViagemStatus.FINALIZADA.equals(viagem.getStatus())) {
            throw new BadRequestException("Nao e possivel confirmar presenca em viagem cancelada ou finalizada");
        }
    }
}
