package com.synapse.mobilidadeUniversitaria.Entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "notificacao_aluno")
public class NotificacaoAluno {


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private Notificacao notificacao;

    @ManyToOne
    private Aluno aluno;

    private boolean lida;
    private LocalDateTime lidaEm;
}
