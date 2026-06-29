package com.synapse.mobilidadeUniversitaria.Services;

import com.synapse.mobilidadeUniversitaria.Entities.SystemSettings;
import com.synapse.mobilidadeUniversitaria.repositories.SystemSettingsRepository;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SystemSettingsService {

    private final SystemSettingsRepository repository;

    public SystemSettings getSettings() {
        return repository.findById(1).orElseThrow(() -> new RuntimeException("Configurações não encontradas"));
    }

    public SystemSettings saveSettings(SystemSettings settings) {
        settings.setId(1);
        return repository.save(settings);
    }
}
