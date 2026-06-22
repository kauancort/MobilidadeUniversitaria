import { Component, OnInit, inject, signal, ChangeDetectorRef, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../services/dashboard.service';
import { DashboardSearchService } from '../services/dashboard-search.service';
import { User } from '../models/dashboard.model';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Subscription } from 'rxjs';

interface StudentRequest {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  nomeFaculdade: string;
  cep: string;
  rua: string;
  bairro: string;
  numero: string;
  complemento: string;
  tipoLocal: string;
  status: string;
  createdAt: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent implements OnInit, OnDestroy {
  private svc = inject(DashboardService);
  private cdr = inject(ChangeDetectorRef);
  private searchService = inject(DashboardSearchService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;
  private routerSub?: Subscription;

  users: User[] = [];
  filtered: User[] = [];
  search = '';
  filterType = 'todos';
  filterStatus = 'todos';

  totalUsers = 0;
  totalAlunos = 0;
  totalMotoristas = 0;
  totalPendentes = 0;

  studentRequests = signal<StudentRequest[]>([]);
  isLoadingRequests = signal(false);

  showCreateModal = signal(false);
  showEditModal = signal(false);
  showDeleteModal = signal(false);
  showViewModal = signal(false);
  showRequestViewModal = signal(false);
  selectedUser = signal<User | null>(null);
  selectedUserDetails: any = null;
  selectedRequest = signal<StudentRequest | null>(null);

  formData: { name: string; email: string; cpf: string; phone: string; type: string; password: string } = {
    name: '',
    email: '',
    cpf: '',
    phone: '',
    type: 'aluno',
    password: ''
  };

  isLoading = signal(false);
  errorMessage = signal('');

  private readonly searchSync = effect(() => {
    this.applyFilters(this.searchService.query());
  });

  ngOnInit() {
    this.loadUsers();
    this.loadStudentRequests();

    this.routerSub = this.router.events.subscribe((event) => {
      if (event.constructor.name === 'NavigationEnd') {
        if (this.router.url === '/dashboard/usuarios') {
          this.loadUsers();
          this.loadStudentRequests();
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  loadStudentRequests() {
    this.isLoadingRequests.set(true);
    this.errorMessage.set('');

    this.http.get<StudentRequest[]>(`${this.baseUrl}/auth/student-requests`).subscribe({
      next: (data) => {
        this.studentRequests.set(data);
        this.isLoadingRequests.set(false);
      },
      error: (err) => {
        this.studentRequests.set([]);
        this.errorMessage.set(err.error?.message || err.message || 'Erro ao carregar solicitações pendentes');
        this.isLoadingRequests.set(false);
      }
    });
  }

  approveStudentRequest(requestId: number) {
    this.http.post(`${this.baseUrl}/auth/student-requests/${requestId}/approve`, {}).subscribe({
      next: () => {
        this.loadStudentRequests();
        this.loadUsers();
        const req = this.studentRequests().find(r => r.id === requestId);
        alert(`Aluno ${req?.nome || ''} aprovado com sucesso!`);
      },
      error: (err) => {
        alert('Erro ao aprovar: ' + (err.error?.message || err.message));
      }
    });
  }

  rejectStudentRequest(requestId: number) {
    if (!confirm('Confirma a rejeição desta solicitação?')) return;
    this.http.post(`${this.baseUrl}/auth/student-requests/${requestId}/reject`, {}).subscribe({
      next: () => {
        this.loadStudentRequests();
      },
      error: (err) => {
        alert('Erro ao rejeitar: ' + (err.error?.message || err.message));
      }
    });
  }

  openRequestViewModal(request: StudentRequest) {
    this.selectedRequest.set(request);
    this.showRequestViewModal.set(true);
  }

  closeRequestViewModal() {
    this.showRequestViewModal.set(false);
    this.selectedRequest.set(null);
  }

  loadUsers() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.svc.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.applyFilters(this.searchService.query());
        this.totalUsers = data.length;
        this.totalAlunos = data.filter(u => u.type === 'aluno').length;
        this.totalMotoristas = data.filter(u => u.type === 'motorista').length;
        this.totalPendentes = data.filter(u => u.status === 'Pendente').length;
        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage.set('Erro ao carregar usuários: ' + (err.message || 'Erro desconhecido'));
        this.isLoading.set(false);
        this.cdr.detectChanges();
      }
    });
  }

  getInitials(name: string): string {
    const parts = name.split(' ');
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
  }

  openViewModal(user: User) {
    this.selectedUser.set(user);
    const endpoint = this.getUserEndpoint(user.type);
    this.http.get<any>(`${this.baseUrl}/${endpoint}/${user.id}`).subscribe({
      next: (details) => {
        this.selectedUserDetails = details;
        this.showViewModal.set(true);
      },
      error: () => {
        // Se falhar, mostra modal sem detalhes
        this.selectedUserDetails = null;
        this.showViewModal.set(true);
      }
    });
  }

  closeViewModal() {
    this.showViewModal.set(false);
    this.selectedUser.set(null);
  }

  onSearch(event: Event) {
    this.search = (event.target as HTMLInputElement).value;
    this.applyFilters();
  }

  onTypeChange(event: Event) {
    this.filterType = (event.target as HTMLSelectElement).value;
    this.applyFilters();
  }

  onStatusChange(event: Event) {
    this.filterStatus = (event.target as HTMLSelectElement).value;
    this.applyFilters();
  }

  applyFilters(globalSearch = '') {
    const searchTerm = `${this.search} ${globalSearch}`.trim().toLowerCase();
    this.filtered = this.users.filter(u => {
      const matchSearch =
        !searchTerm ||
        u.name.toLowerCase().includes(searchTerm) ||
        u.email.toLowerCase().includes(searchTerm) ||
        u.cpf.includes(searchTerm);
      const matchType = this.filterType === 'todos' || u.type === this.filterType;
      const matchStatus = this.filterStatus === 'todos' || u.status === this.filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }

  openCreateModal() {
    this.formData = { name: '', email: '', cpf: '', phone: '', type: 'aluno', password: '' };
    this.errorMessage.set('');
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  createUser() {
    if (!this.formData.name || !this.formData.email || !this.formData.cpf || !this.formData.phone) {
      this.errorMessage.set('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const payload = {
      name: this.formData.name,
      email: this.formData.email,
      cpf: this.formData.cpf,
      phone: this.formData.phone,
      type: this.formData.type as any,
      password: this.formData.password || 'password123'
    };

    this.svc.createUser(payload).subscribe({
      next: () => {
        this.closeCreateModal();
        this.loadUsers();
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || err.message || 'Erro ao criar usuário');
        this.isLoading.set(false);
      }
    });
  }

  openEditModal(user: User) {
    this.selectedUser.set(user);
    this.errorMessage.set('');

    const endpoint = this.getUserEndpoint(user.type);
    this.http.get<any>(`${this.baseUrl}/${endpoint}/${user.id}`).subscribe({
      next: (details) => {
        this.selectedUserDetails = details;
        this.formData = {
          name: details.nome ?? user.name,
          email: details.email ?? user.email,
          cpf: details.cpf ?? user.cpf,
          phone: details.telefone ?? user.phone,
          type: user.type,
          password: ''
        };
        this.showEditModal.set(true);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || err.message || 'Erro ao carregar detalhes do usuário');
      }
    });
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.selectedUser.set(null);
    this.selectedUserDetails = null;
  }

  updateUser() {
    const user = this.selectedUser();
    if (!user) {
      return;
    }

    if (!this.selectedUserDetails && user.type !== 'admin') {
      this.errorMessage.set('Não foi possível carregar os dados completos para atualização');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const endpoint = this.getUserEndpoint(user.type);
    const body: any = {
      nome: this.formData.name,
      email: this.formData.email,
      cpf: this.formData.cpf,
      telefone: this.formData.phone,
      enderecoId: this.selectedUserDetails?.endereco?.id ?? this.selectedUserDetails?.enderecoId
    };

    if (user.type === 'aluno') {
      body.faculdadeId = this.selectedUserDetails?.faculdade?.id;
      body.statusMatricula = this.selectedUserDetails?.statusMatricula;
    }

    if (user.type === 'motorista') {
      body.cnhNumero = this.selectedUserDetails?.cnhNumero;
      body.vencimentoCnh = this.formatDateForBackend(this.selectedUserDetails?.vencimentoCnh);
    }

    this.http.put(`${this.baseUrl}/${endpoint}/${user.id}`, body).subscribe({
      next: () => {
        this.closeEditModal();
        this.loadUsers();
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || err.message || 'Erro ao atualizar usuário');
        this.isLoading.set(false);
      }
    });
  }

  openDeleteModal(user: User) {
    this.selectedUser.set(user);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
    this.selectedUser.set(null);
  }

  confirmDelete() {
    const user = this.selectedUser();
    if (!user) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.svc.deleteUser(user.id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.loadUsers();
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Erro ao excluir usuário');
        this.isLoading.set(false);
      }
    });
  }

  private getUserEndpoint(type: string): string {
    switch (type) {
      case 'admin':
        return 'gestores';
      case 'motorista':
        return 'motoristas';
      default:
        return 'alunos';
    }
  }

  private formatDateForBackend(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    if (value.includes('/')) {
      return value;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}
