import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface Presenca {
  id: number;
  alunoId: number;
  alunoNome: string;
  status: string;
  confirmada: boolean;
}

@Component({
  selector: 'app-motorista-viagens',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-motorista-viagens/app-motorista-viagens.component.html',
  styleUrl: './app-motorista-viagens/app-motorista-viagens.component.css'
})
export class AppMotoristaViagensComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;
  private refreshHandle?: ReturnType<typeof setInterval>;
  private presencaRefreshHandle?: ReturnType<typeof setInterval>;
  private onDriverPresenceUpdated = () => {
    if (this.showStudentsList() && this.selectedViagem()) {
      this.carregarPresencas(this.selectedViagem()!.id);
    }
  };

  viagens = signal<any[]>([]);
  isLoading = signal(true);
  erro = signal('');

  selectedViagem = signal<any | null>(null);
  presencas = signal<Presenca[]>([]);
  showStudentsList = signal(false);
  isLoadingPresencas = signal(false);
  filtroPresencas: 'todas' | 'reservadas' | 'confirmadas' = 'todas';

  ngOnInit() {
    this.carregarViagens();
    window.addEventListener("driver-presence-updated", this.onDriverPresenceUpdated);
    // Poll trips every 15s
    this.refreshHandle = setInterval(() => this.carregarViagens(), 15000);
  }

  ngOnDestroy() {
    if (this.refreshHandle) clearInterval(this.refreshHandle);
    if (this.presencaRefreshHandle) clearInterval(this.presencaRefreshHandle);
    window.removeEventListener("driver-presence-updated", this.onDriverPresenceUpdated);
  }

  carregarViagens() {
    this.http.get<any[]>(`${this.baseUrl}/driver/trips/today`).subscribe({
      next: (data) => { this.viagens.set(data); this.isLoading.set(false); },
      error: (err: any) => {
        this.erro.set(err.error?.message || 'Erro ao carregar viagens.');
        this.isLoading.set(false);
      }
    });
  }

  atualizarParada(viagemId: number, novoIndex: number) {
    this.http.put<any>(`${this.baseUrl}/driver/trips/${viagemId}/parada`, { novaParadaIndex: novoIndex }).subscribe({
      next: (updated) => {
        this.viagens.update(vs => vs.map(v => v.id === viagemId ? updated : v));
      },
      error: (err: any) => this.erro.set(err.error?.message || 'Erro ao atualizar parada.')
    });
  }

  marcarProximaParada(viagem: any) {
    const atual = Number(viagem.paradaAtualIndex ?? 0);
    const total = this.getTotalParadas(viagem);
    const proxima = Math.min(atual + 1, Math.max(total - 1, 0));
    this.atualizarParada(viagem.id, proxima);
  }

  getTotalParadas(viagem: any): number {
    return this.getParadas(viagem).length;
  }

  getParadas(viagem: any): string[] {
    const raw = viagem?.rota?.paradas;
    if (!raw) return [];
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  formatHora(dt: string): string {
    if (!dt) return '--:--';
    return new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  iniciar(id: number) {
    this.http.post<any>(`${this.baseUrl}/driver/trips/${id}/start`, {}).subscribe({
      next: (updated) => this.viagens.update(vs => vs.map(v => v.id === id ? updated : v)),
      error: (err: any) => this.erro.set(err.error?.message || 'Erro ao iniciar viagem.')
    });
  }

  finalizar(id: number) {
    this.http.post<any>(`${this.baseUrl}/driver/trips/${id}/finish`, {}).subscribe({
      next: (updated) => this.viagens.update(vs => vs.map(v => v.id === id ? updated : v)),
      error: (err: any) => this.erro.set(err.error?.message || 'Erro ao finalizar viagem.')
    });
  }

  verAlunos(viagem: any) {
    this.erro.set('');
    this.selectedViagem.set(viagem);
    this.showStudentsList.set(true);
    this.filtroPresencas = 'todas';
    this.carregarPresencas(viagem.id);

    // Poll student list every 10s while open
    if (this.presencaRefreshHandle) clearInterval(this.presencaRefreshHandle);
    this.presencaRefreshHandle = setInterval(() => {
      if (this.showStudentsList() && this.selectedViagem()) {
        this.carregarPresencas(this.selectedViagem().id);
      }
    }, 10000);
  }

  carregarPresencas(viagemId: number) {
    this.isLoadingPresencas.set(true);
    this.http.get<any[]>(`${this.baseUrl}/driver/trips/${viagemId}/students`).subscribe({
      next: (data) => {
        // PresencaDigitalResponseDTO: { id, alunoId, alunoNome, viagemId, dataHoraReserva, dataHoraValidacao, status }
        // Derive 'confirmada' from status field
        this.presencas.set(data.map(p => ({
          id: p.id,
          alunoId: p.alunoId,
          alunoNome: p.alunoNome || 'Aluno #' + p.alunoId,
          status: p.status || 'RESERVADA',
          confirmada: p.status === 'CONFIRMADA'
        })));
        this.isLoadingPresencas.set(false);
      },
      error: (err: any) => {
        this.erro.set(err.error?.message || 'Erro ao carregar lista de alunos.');
        this.isLoadingPresencas.set(false);
      }
    });
  }

  getPresencasFiltradas(): Presenca[] {
    const lista = this.presencas();
    switch (this.filtroPresencas) {
      case 'reservadas':
        return lista.filter(p => p.status !== 'CONFIRMADA');
      case 'confirmadas':
        return lista.filter(p => p.status === 'CONFIRMADA');
      default:
        return lista;
    }
  }

  getResumoPresencas() {
    const lista = this.presencas();
    return {
      total: lista.length,
      reservadas: lista.filter(p => p.status !== 'CONFIRMADA').length,
      confirmadas: lista.filter(p => p.status === 'CONFIRMADA').length
    };
  }

  fecharListaAlunos() {
    this.showStudentsList.set(false);
    this.selectedViagem.set(null);
    this.presencas.set([]);
    this.filtroPresencas = 'todas';
    if (this.presencaRefreshHandle) {
      clearInterval(this.presencaRefreshHandle);
      this.presencaRefreshHandle = undefined;
    }
  }

  confirmarPresenca(presencaId: number) {
    this.erro.set('');
    this.http.post<any>(`${this.baseUrl}/presencas/${presencaId}/confirmar`, {}).subscribe({
      next: () => {
        this.presencas.update(ps => ps.map(p =>
          p.id === presencaId
            ? { ...p, confirmada: true, status: 'CONFIRMADA' }
            : p
        ));
        if (this.selectedViagem()) {
          this.carregarPresencas(this.selectedViagem()!.id);
        }
      },
      error: (err: any) => {
        this.erro.set(err.error?.message || 'Erro ao confirmar presença.');
      }
    });
  }

  getProgressWidth(status?: string): string {
    switch (status) {
      case 'AGENDADA': return '0%';
      case 'EM_ANDAMENTO': return '50%';
      case 'FINALIZADA': return '100%';
      default: return '0%';
    }
  }

  getProgressLabel(status?: string): string {
    switch (status) {
      case 'AGENDADA': return 'Aguardando';
      case 'EM_ANDAMENTO': return 'Em andamento';
      case 'FINALIZADA': return 'Concluída';
      default: return '';
    }
  }
}
