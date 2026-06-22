import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { QrCodeService } from '../services/qrcode.service';

interface QrPreviewResponse {
  valido: boolean;
  alunoId: number;
  alunoNome: string;
  viagemId: number;
  mensagem: string;
  presenca?: {
    status: string;
    dataHoraReserva?: string;
    dataHoraValidacao?: string | null;
  };
}

@Component({
  selector: 'app-motorista-qr',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app-motorista-qr.component.html',
  styleUrl: './app-motorista-qr.component.css'
})
export class AppMotoristaQrComponent {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;
  private qrCodeService = inject(QrCodeService);

  qrInput = '';
  qrCodeImage = signal<string>('');
  expiresAt = signal<string>('');
  preview = signal<QrPreviewResponse | null>(null);
  isLoading = signal(false);
  isConfirming = signal(false);
  erro = signal('');
  sucesso = signal('');

  historico = signal<any[]>([]);

  validarQR() {
    const codigo = this.qrInput.trim();
    if (!codigo) {
      this.erro.set('Insira o código do aluno.');
      return;
    }

    this.isLoading.set(true);
    this.erro.set('');
    this.sucesso.set('');
    this.preview.set(null);

    this.http.post<QrPreviewResponse>(this.baseUrl + '/driver/qrcode/preview', { qrData: codigo }).subscribe({
      next: (res) => {
        this.preview.set(res);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.erro.set(err.error?.message || 'Código inválido, expirado ou sem reserva para a viagem atual.');
      }
    });
  }

  confirmarPresenca() {
    const codigo = this.qrInput.trim();
    if (!codigo || !this.preview()) {
      this.erro.set('Valide o código do aluno antes de confirmar.');
      return;
    }

    this.isConfirming.set(true);
    this.erro.set('');
    this.sucesso.set('');

    this.http.post<any>(this.baseUrl + '/driver/qrcode/scan', { qrData: codigo }).subscribe({
      next: (res) => {
        this.isConfirming.set(false);
        const nome = res.alunoNome || this.preview()?.alunoNome || 'Aluno';
        this.sucesso.set(`Presença confirmada - ${nome}`);
        this.historico.update(h => [{
          nome,
          hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          status: 'OK'
        }, ...h.slice(0, 9)]);
        window.dispatchEvent(new CustomEvent('driver-presence-updated'));
        this.preview.set(null);
        this.qrInput = '';
        setTimeout(() => this.sucesso.set(''), 4000);
      },
      error: (err: any) => {
        this.isConfirming.set(false);
        this.erro.set(err.error?.message || 'Não foi possível confirmar a presença.');
      }
    });
  }

  limpar() {
    this.qrInput = '';
    this.preview.set(null);
    this.erro.set('');
    this.sucesso.set('');
  }

  async gerarQRCode(tripId: number) {
    this.isLoading.set(true);
    this.erro.set('');

    this.http.get<{qrData: string, expiresAt: string}>(this.baseUrl + '/driver/trips/' + tripId + '/qrcode').subscribe({
      next: async (res) => {
        try {
          const imageData = await this.qrCodeService.generateQrCode(res.qrData);
          this.qrCodeImage.set(imageData);
          this.expiresAt.set(res.expiresAt);
        } catch {
          this.erro.set('Erro ao gerar imagem do QR Code');
        } finally {
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        this.erro.set(err.error?.message || 'Erro ao obter dados do QR Code');
        this.isLoading.set(false);
      }
    });
  }

  simularScan() {
    const codigoSimulado = 'GOCAMPUS-' + Math.floor(Math.random() * 1000);
    this.qrInput = codigoSimulado;
    this.validarQR();
  }
}
