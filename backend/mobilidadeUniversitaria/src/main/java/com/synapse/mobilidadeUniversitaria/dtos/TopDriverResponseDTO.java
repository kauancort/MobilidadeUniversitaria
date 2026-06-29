package com.synapse.mobilidadeUniversitaria.dtos;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TopDriverResponseDTO {
    private Long id;
    private String nome;
    private Long viagensRealizadas;
    private Double avaliacao;
    private Double pontualidade;
}
