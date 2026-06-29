package com.synapse.mobilidadeUniversitaria.dtos;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DashboardKpiResponseDTO {
    private Long totalAlunos;
    private Double variacaoAlunos;
    private Integer taxaOcupacao;
    private Double variacaoOcupacao;
    private Long viagensHoje;
    private Long viagensFinalizadas;
    private Double economiaEstimada;
}
