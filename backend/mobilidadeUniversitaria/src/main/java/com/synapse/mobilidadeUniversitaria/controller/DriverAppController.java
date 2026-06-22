package com.synapse.mobilidadeUniversitaria.controller;

import com.synapse.mobilidadeUniversitaria.dtos.response.OcupacaoViagemResponseDTO;
import com.synapse.mobilidadeUniversitaria.dtos.response.PresencaDigitalResponseDTO;
import com.synapse.mobilidadeUniversitaria.dtos.response.QRCodePreviewResponseDTO;
import com.synapse.mobilidadeUniversitaria.dtos.response.QRCodeResponseDTO;
import com.synapse.mobilidadeUniversitaria.dtos.response.ViagemResponseDTO;
import com.synapse.mobilidadeUniversitaria.security.AuthorizationService;
import com.synapse.mobilidadeUniversitaria.service.PresencaService;
import com.synapse.mobilidadeUniversitaria.service.ViagemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/driver")
@RequiredArgsConstructor
public class DriverAppController {

    private final ViagemService viagemService;
    private final PresencaService presencaService;
    private final AuthorizationService authorizationService;

    @GetMapping("/trips/today")
    @PreAuthorize("hasRole('MOTORISTA')")
    public ResponseEntity<List<ViagemResponseDTO>> listarViagensDeHoje() {
        return ResponseEntity.ok(viagemService.listarHojePorMotorista(authorizationService.currentUser().getId()));
    }

    @GetMapping("/trips/{tripId}/students")
    @PreAuthorize("@authorizationService.isMotoristaDaViagem(#tripId)")
    public ResponseEntity<List<PresencaDigitalResponseDTO>> listarAlunosDaViagem(@PathVariable Long tripId) {
        return ResponseEntity.ok(presencaService.listarPorViagem(tripId));
    }

    @GetMapping("/trips/{tripId}/occupancy")
    @PreAuthorize("@authorizationService.isMotoristaDaViagem(#tripId)")
    public ResponseEntity<OcupacaoViagemResponseDTO> ocupacaoDaViagem(@PathVariable Long tripId) {
        return ResponseEntity.ok(presencaService.ocupacaoDaViagem(tripId));
    }

    @org.springframework.web.bind.annotation.RequestMapping(value = "/trips/{tripId}/qrcode", method = {org.springframework.web.bind.annotation.RequestMethod.GET, org.springframework.web.bind.annotation.RequestMethod.POST})
    @PreAuthorize("@authorizationService.isMotoristaDaViagem(#tripId)")
    public ResponseEntity<QRCodeResponseDTO> gerarQRCodeDaViagem(@PathVariable Long tripId) {
        return ResponseEntity.ok(viagemService.gerarQRCode(tripId));
    }

    @PostMapping("/qrcode/preview")
    @PreAuthorize("hasRole('MOTORISTA')")
    public ResponseEntity<QRCodePreviewResponseDTO> previsualizarPresencaPorQRCode(
            @jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody com.synapse.mobilidadeUniversitaria.dtos.request.QRCodeScanRequestDTO dto) {
        return ResponseEntity.ok(presencaService.previsualizarScanDoMotorista(dto.qrData()));
    }

    @PostMapping("/qrcode/scan")
    @PreAuthorize("hasRole('MOTORISTA')")
    public ResponseEntity<com.synapse.mobilidadeUniversitaria.dtos.response.QRCodeConfirmacaoResponseDTO> confirmarPresencaPorQRCode(
            @jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody com.synapse.mobilidadeUniversitaria.dtos.request.QRCodeScanRequestDTO dto) {
        return ResponseEntity.ok(presencaService.confirmarScanDoMotorista(dto.qrData()));
    }

    @PostMapping("/trips/{tripId}/start")
    @PreAuthorize("@authorizationService.isMotoristaDaViagem(#tripId)")
    public ResponseEntity<ViagemResponseDTO> iniciarViagem(@PathVariable Long tripId) {
        return ResponseEntity.ok(viagemService.iniciar(tripId));
    }

    @PostMapping("/trips/{tripId}/finish")
    @PreAuthorize("@authorizationService.isMotoristaDaViagem(#tripId)")
    public ResponseEntity<ViagemResponseDTO> finalizarViagem(@PathVariable Long tripId) {
        return ResponseEntity.ok(viagemService.finalizar(tripId));
    }
}
