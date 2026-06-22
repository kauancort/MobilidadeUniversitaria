package com.synapse.mobilidadeUniversitaria.dtos.response;

public record QRCodePreviewResponseDTO(
        boolean valido,
        Long alunoId,
        String alunoNome,
        Long viagemId,
        String mensagem,
        PresencaDigitalResponseDTO presenca
) {
}
