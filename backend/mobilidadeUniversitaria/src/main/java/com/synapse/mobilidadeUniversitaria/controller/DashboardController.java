package com.synapse.mobilidadeUniversitaria.controller;

import com.synapse.mobilidadeUniversitaria.dtos.DashboardKpiResponseDTO;
import com.synapse.mobilidadeUniversitaria.dtos.response.AlunoFrequenciaResponseDTO;
import com.synapse.mobilidadeUniversitaria.dtos.response.DashboardGestorResponseDTO;
import com.synapse.mobilidadeUniversitaria.dtos.response.DemandaPorDiaResponseDTO;
import com.synapse.mobilidadeUniversitaria.dtos.response.OcupacaoPorRotaResponseDTO;
import com.synapse.mobilidadeUniversitaria.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasRole('GESTOR')")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/gestor")
    public ResponseEntity<DashboardGestorResponseDTO> dashboardGestor() {
        return ResponseEntity.ok(dashboardService.dashboardGestor());
    }

    @GetMapping("/ocupacao-por-rota")
    public ResponseEntity<List<OcupacaoPorRotaResponseDTO>> ocupacaoPorRota() {
        return ResponseEntity.ok(dashboardService.ocupacaoPorRota());
    }

    @GetMapping("/demanda-por-dia")
    public ResponseEntity<List<DemandaPorDiaResponseDTO>> demandaPorDia() {
        return ResponseEntity.ok(dashboardService.demandaPorDia());
    }

    @GetMapping("/aluno/{alunoId}/frequencia")
    public ResponseEntity<AlunoFrequenciaResponseDTO> frequenciaAluno(@PathVariable Long alunoId) {
        return ResponseEntity.ok(dashboardService.calcularFrequenciaAluno(alunoId));
    }

    @GetMapping("/alunos/frequencia")
    public ResponseEntity<List<AlunoFrequenciaResponseDTO>> frequenciaTodosAlunos() {
        return ResponseEntity.ok(dashboardService.calcularFrequenciaTodosAlunos());
    }

    @GetMapping("/kpis")
    public ResponseEntity<DashboardKpiResponseDTO> kpis() {
        return ResponseEntity.ok(dashboardService.kpis());
    }
}
