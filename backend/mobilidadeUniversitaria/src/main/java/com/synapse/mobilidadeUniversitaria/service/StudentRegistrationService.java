package com.synapse.mobilidadeUniversitaria.service;

import com.synapse.mobilidadeUniversitaria.Entities.Endereco;
import com.synapse.mobilidadeUniversitaria.Entities.SolicitacaoCadastroAluno;
import com.synapse.mobilidadeUniversitaria.Entities.enums.LocalType;
import com.synapse.mobilidadeUniversitaria.dtos.request.AlunoRequestDTO;
import com.synapse.mobilidadeUniversitaria.dtos.request.StudentRegistrationRequestDTO;
import com.synapse.mobilidadeUniversitaria.dtos.response.AlunoResponseDTO;
import com.synapse.mobilidadeUniversitaria.dtos.response.UsuarioResponseDTO;
import com.synapse.mobilidadeUniversitaria.exceptions.ResourceAlreadyExistsException;
import com.synapse.mobilidadeUniversitaria.exceptions.ResourceNotFoundException;
import com.synapse.mobilidadeUniversitaria.repositories.EnderecoRepository;
import com.synapse.mobilidadeUniversitaria.repositories.FaculdadeRepository;
import com.synapse.mobilidadeUniversitaria.repositories.SolicitacaoCadastroAlunoRepository;
import com.synapse.mobilidadeUniversitaria.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class StudentRegistrationService {

    private final UsuarioRepository usuarioRepository;
    private final EnderecoRepository enderecoRepository;
    private final FaculdadeRepository faculdadeRepository;
    private final AlunoService alunoService;
    private final SolicitacaoCadastroAlunoRepository solicitacaoRepository;

    public void createStudentRequest(StudentRegistrationRequestDTO dto) {
        String emailNormalizado = normalizarEmail(dto.email());
        String cpfNormalizado = normalizarCpf(dto.cpf());

        // Verificar duplicidade de email e CPF no banco de usuários ativos
        if (usuarioRepository.existsByEmail(emailNormalizado)) {
            throw new ResourceAlreadyExistsException("Email ja cadastrado: " + emailNormalizado);
        }
        if (usuarioRepository.existsByCpf(cpfNormalizado)) {
            throw new ResourceAlreadyExistsException("CPF ja cadastrado: " + cpfNormalizado);
        }
        // Verificar solicitação já pendente no banco
        if (solicitacaoRepository.findByEmail(emailNormalizado).isPresent()) {
            throw new ResourceAlreadyExistsException("Ja existe uma solicitacao pendente para este email");
        }
        if (solicitacaoRepository.findByCpf(cpfNormalizado).isPresent()) {
            throw new ResourceAlreadyExistsException("Ja existe uma solicitacao pendente para este CPF");
        }

        SolicitacaoCadastroAluno solicitacao = new SolicitacaoCadastroAluno();
        solicitacao.setNome(dto.nome().trim());
        solicitacao.setEmail(emailNormalizado);
        solicitacao.setCpf(cpfNormalizado);
        solicitacao.setSenha(dto.senha());
        solicitacao.setTelefone(dto.telefone() != null ? dto.telefone().trim() : null);
        solicitacao.setNomeFaculdade(dto.nomeFaculdade().trim());
        solicitacao.setCep(dto.cep() != null ? dto.cep().replaceAll("\\D", "") : null);
        solicitacao.setRua(dto.rua() != null ? dto.rua().trim() : null);
        solicitacao.setBairro(dto.bairro() != null ? dto.bairro().trim() : null);
        solicitacao.setNumero(dto.numero() != null ? dto.numero().trim() : null);
        solicitacao.setComplemento(dto.complemento() != null ? dto.complemento().trim() : null);
        solicitacao.setTipoLocal(dto.tipoLocal() != null ? dto.tipoLocal().trim() : null);
        solicitacao.setStatus("PENDENTE");

        solicitacaoRepository.save(solicitacao);
    }

    public List<Map<String, Object>> listPendingRequests() {
        List<SolicitacaoCadastroAluno> solicitacoes = solicitacaoRepository.findByStatus("PENDENTE");
        List<Map<String, Object>> result = new ArrayList<>();
        solicitacoes.forEach(solicitacao -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", solicitacao.getId());
            map.put("nome", solicitacao.getNome());
            map.put("email", solicitacao.getEmail());
            map.put("cpf", solicitacao.getCpf());
            map.put("telefone", solicitacao.getTelefone());
            map.put("nomeFaculdade", solicitacao.getNomeFaculdade());
            map.put("cep", solicitacao.getCep());
            map.put("rua", solicitacao.getRua());
            map.put("bairro", solicitacao.getBairro());
            map.put("numero", solicitacao.getNumero());
            map.put("complemento", solicitacao.getComplemento());
            map.put("tipoLocal", solicitacao.getTipoLocal());
            map.put("status", solicitacao.getStatus());
            map.put("createdAt", solicitacao.getCreatedAt() != null ? solicitacao.getCreatedAt().toString() : LocalDate.now().toString());
            result.add(map);
        });
        return result;
    }

    @org.springframework.transaction.annotation.Transactional
    public UsuarioResponseDTO approveStudentRequest(Long id) {
        SolicitacaoCadastroAluno solicitacao = solicitacaoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Solicitacao nao encontrada: " + id));

        // Criar ou buscar endereço
        Endereco endereco = enderecoRepository.findById(1L).orElseGet(() -> {
            Endereco novo = new Endereco();
            novo.setCep(solicitacao.getCep() != null && !solicitacao.getCep().isBlank() ? solicitacao.getCep().replaceAll("\\D", "") : "00000000");
            novo.setRua(solicitacao.getRua() != null && !solicitacao.getRua().isBlank() ? solicitacao.getRua() : "Nao informada");
            novo.setBairro(solicitacao.getBairro() != null && !solicitacao.getBairro().isBlank() ? solicitacao.getBairro() : "Nao informado");
            novo.setNumero(solicitacao.getNumero() != null && !solicitacao.getNumero().isBlank() ? solicitacao.getNumero() : "0");
            novo.setTipoLocal(LocalType.RESIDENCIAL);
            return enderecoRepository.save(novo);
        });

        // Buscar ou criar faculdade com base no nome fornecido pelo aluno
        Long faculdadeId;
        if (solicitacao.getNomeFaculdade() != null && !solicitacao.getNomeFaculdade().isBlank()) {
            // Buscar faculdade pelo nome
            faculdadeId = faculdadeRepository.findByNome(solicitacao.getNomeFaculdade())
                    .map(f -> f.getId())
                    .orElseGet(() -> {
                        // Criar nova faculdade com o nome fornecido
                        com.synapse.mobilidadeUniversitaria.Entities.Faculdade faculdade = new com.synapse.mobilidadeUniversitaria.Entities.Faculdade();
                        faculdade.setNome(solicitacao.getNomeFaculdade());
                        faculdade.setEndereco(endereco);
                        com.synapse.mobilidadeUniversitaria.Entities.Faculdade salva = faculdadeRepository.save(faculdade);
                        return salva.getId();
                    });
        } else {
            // Fallback: buscar primeira faculdade disponível ou criar padrão
            faculdadeId = faculdadeRepository.findAll().stream()
                    .findFirst()
                    .map(f -> f.getId())
                    .orElseGet(() -> {
                        com.synapse.mobilidadeUniversitaria.Entities.Faculdade faculdade = new com.synapse.mobilidadeUniversitaria.Entities.Faculdade();
                        faculdade.setNome("Faculdade Padrão");
                        faculdade.setEndereco(endereco);
                        com.synapse.mobilidadeUniversitaria.Entities.Faculdade salva = faculdadeRepository.save(faculdade);
                        return salva.getId();
                    });
        }

        // Criar aluno via AlunoService (usa JPA corretamente, com bcrypt na senha)
        AlunoRequestDTO alunoRequest = new AlunoRequestDTO();
        alunoRequest.setNome(solicitacao.getNome());
        alunoRequest.setEmail(solicitacao.getEmail());
        alunoRequest.setCpf(solicitacao.getCpf());
        alunoRequest.setSenha(solicitacao.getSenha());
        alunoRequest.setTelefone(solicitacao.getTelefone());
        alunoRequest.setEnderecoId(endereco.getId());
        alunoRequest.setFaculdadeId(faculdadeId);
        alunoRequest.setStatusMatricula(
                com.synapse.mobilidadeUniversitaria.Entities.enums.StatusMatricula.ATIVA);
        alunoRequest.setCreatedAt(solicitacao.getCreatedAt());

        AlunoResponseDTO aluno = alunoService.criar(alunoRequest);

        // Remover solicitação do banco
        solicitacaoRepository.delete(solicitacao);

        // Converter AlunoResponseDTO em UsuarioResponseDTO para retornar
        UsuarioResponseDTO response = new UsuarioResponseDTO();
        response.setId(aluno.getId());
        response.setNome(aluno.getNome());
        response.setEmail(aluno.getEmail());
        response.setCpf(aluno.getCpf());
        response.setTelefone(aluno.getTelefone());
        response.setTipoUsuario(com.synapse.mobilidadeUniversitaria.Entities.enums.UserType.ALUNO);
        return response;
    }

    public void rejectStudentRequest(Long id) {
        SolicitacaoCadastroAluno solicitacao = solicitacaoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Solicitacao nao encontrada: " + id));
        solicitacaoRepository.delete(solicitacao);
    }

    private String normalizarEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizarCpf(String cpf) {
        return cpf == null ? null : cpf.replaceAll("\\D", "");
    }
}
