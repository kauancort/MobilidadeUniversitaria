import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  formData = {
    nome: '',
    email: '',
    cpf: '',
    senha: '',
    telefone: '',
    nomeFaculdade: '',
    endereco: {
      cep: '',
      rua: '',
      bairro: '',
      numero: '',
      complemento: '',
      tipoLocal: 'RESIDENCIAL' as 'RESIDENCIAL' | 'FACULDADE'
    }
  };

  errorMessage = signal<string>('');
  successMessage = signal<string>('');
  isLoading = signal<boolean>(false);
  faculdadeSuggestions = signal<any[]>([]);
  showFaculdadeSuggestions = signal<boolean>(false);

  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;
  private authService = inject(AuthService);
  private router = inject(Router);

  formatCPF(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (value.length > 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (value.length > 3) {
      value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }
    event.target.value = value;
    this.formData.cpf = value.replace(/\D/g, '');
  }

  formatTelefone(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 6) {
      value = value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    } else if (value.length > 2) {
      value = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    }
    event.target.value = value;
    this.formData.telefone = value;
  }

  formatCEP(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 5) {
      value = value.replace(/(\d{5})(\d{1,3})/, '$1-$2');
    }
    event.target.value = value;
    this.formData.endereco.cep = value;
  }

  register(event: Event) {
    event.preventDefault();
    this.errorMessage.set('');
    this.successMessage.set('');

    // Validation
    if (!this.formData.nome || !this.formData.email || !this.formData.cpf ||
        !this.formData.senha || !this.formData.telefone || !this.formData.nomeFaculdade) {
      this.errorMessage.set('Preencha todos os campos obrigatórios');
      return;
    }

    if (this.formData.cpf.replace(/\D/g, '').length !== 11) {
      this.errorMessage.set('CPF deve ter 11 dígitos');
      return;
    }

    if (this.formData.senha.length < 6) {
      this.errorMessage.set('Senha deve ter pelo menos 6 caracteres');
      return;
    }

    const telefoneRegex = /^\(\d{2}\) \d{5}-\d{4}$|^\(\d{2}\) \d{4}-\d{4}$/;
    if (!telefoneRegex.test(this.formData.telefone)) {
      this.errorMessage.set('Telefone inválido. Use o formato (XX) XXXXX-XXXX');
      return;
    }

    this.isLoading.set(true);

    const email = this.formData.email.trim().toLowerCase();
    const cpf = this.formData.cpf.replace(/\D/g, '');
    const telefone = this.formData.telefone.trim();
    const nome = this.formData.nome.trim();
    const nomeFaculdade = this.formData.nomeFaculdade.trim();

    // Enviar solicitação de cadastro de aluno (não cria usuário diretamente)
    this.http.post<any>(`${this.baseUrl}/auth/register/student-request`, {
      nome,
      email,
      cpf,
      senha: this.formData.senha,
      telefone,
      tipoUsuario: 'ALUNO',
      nomeFaculdade,
      cep: this.formData.endereco.cep,
      rua: this.formData.endereco.rua,
      bairro: this.formData.endereco.bairro,
      numero: this.formData.endereco.numero,
      complemento: this.formData.endereco.complemento,
      tipoLocal: this.formData.endereco.tipoLocal
    }).subscribe({
      next: (res) => {
        this.successMessage.set(res.mensagem || 'Solicitação enviada com sucesso! Aguarde aprovação do gestor.');
        this.isLoading.set(false);
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        const status = err.status;
        const msg = String(err.error?.message || err.message || '');

        if (msg.includes('Email ja cadastrado') || msg.includes('email já cadastrado')) {
          this.errorMessage.set('Este email já está cadastrado.');
        } else if (msg.includes('CPF ja cadastrado') || msg.includes('cpf já cadastrado')) {
          this.errorMessage.set('Este CPF já está cadastrado.');
        } else if (msg.includes('solicitacao pendente') || msg.includes('solicitação pendente')) {
          this.errorMessage.set('Já existe uma solicitação pendente com esses dados.');
        } else if (status === 400) {
          const validationErrors = err.error?.validationErrors;
          if (validationErrors) {
            const firstError = Object.values(validationErrors)[0] as string;
            this.errorMessage.set(firstError);
          } else {
            this.errorMessage.set(msg || 'Dados inválidos. Verifique os campos e tente novamente.');
          }
        } else if (status === 409) {
          this.errorMessage.set(msg || 'Já existe um cadastro com esses dados.');
        } else {
          this.errorMessage.set('Erro ao enviar solicitação. Tente novamente.');
        }
      }
    });
  }

  clearError() {
    this.errorMessage.set('');
  }

  searchFaculdades(nome: string) {
    if (nome.length < 2) {
      this.faculdadeSuggestions.set([]);
      this.showFaculdadeSuggestions.set(false);
      return;
    }

    this.authService.searchFaculdades(nome).subscribe({
      next: (faculdades) => {
        this.faculdadeSuggestions.set(faculdades);
        this.showFaculdadeSuggestions.set(faculdades.length > 0);
      },
      error: () => {
        this.faculdadeSuggestions.set([]);
        this.showFaculdadeSuggestions.set(false);
      }
    });
  }

  selectFaculdade(nome: string) {
    this.formData.nomeFaculdade = nome;
    this.showFaculdadeSuggestions.set(false);
    this.faculdadeSuggestions.set([]);
  }

  onFaculdadeInput(event: any) {
    const value = event.target.value;
    this.formData.nomeFaculdade = value;
    this.searchFaculdades(value);
    this.clearError();
  }

  closeFaculdadeSuggestions() {
    this.showFaculdadeSuggestions.set(false);
  }
}