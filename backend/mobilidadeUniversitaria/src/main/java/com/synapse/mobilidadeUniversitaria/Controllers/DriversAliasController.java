package com.synapse.mobilidadeUniversitaria.Controllers;

import com.synapse.mobilidadeUniversitaria.dtos.TopDriverResponseDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/drivers")
public class DriversAliasController {

    @GetMapping("/top-drivers")
    public ResponseEntity<List<TopDriverResponseDTO>> getTopDrivers() {
        return ResponseEntity.ok(List.of(
            TopDriverResponseDTO.builder().id(1L).nome("João Silva").viagensRealizadas(120L).avaliacao(4.9).pontualidade(98.0).build(),
            TopDriverResponseDTO.builder().id(2L).nome("Maria Souza").viagensRealizadas(115L).avaliacao(4.8).pontualidade(95.0).build()
        ));
    }
}
