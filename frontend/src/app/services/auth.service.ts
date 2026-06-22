import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  token: string;
  tipo: string;
  id: number;
  nome: string;
  email: string;
  tipoUsuario: 'GESTOR' | 'ALUNO' | 'MOTORISTA';
}

export interface RegisterRequest {
  nome: string;
  email: string;
  cpf: string;
  senha: string;
  telefone: string;
  endereco: {
    cep: string;
    rua: string;
    bairro: string;
    numero: string;
    complemento?: string;
    tipoLocal: 'RESIDENCIAL' | 'FACULDADE';
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  // Signals for reactive state
  private userSignal = signal<LoginResponse | null>(null);
  private isLoadingSignal = signal<boolean>(false);

  // Computed signals
  readonly user = computed(() => this.userSignal());
  readonly isAuthenticated = computed(() => !!this.userSignal());
  readonly isLoading = computed(() => this.isLoadingSignal());
  readonly userType = computed(() => this.userSignal()?.tipoUsuario);

  constructor(private http: HttpClient, private router: Router) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user || this.isTokenExpired(token)) {
      this.clearSession();
      return;
    }

    try {
      this.userSignal.set(JSON.parse(user));
    } catch {
      this.clearSession();
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    this.isLoadingSignal.set(true);
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(response => {
        this.handleLoginSuccess(response);
        this.isLoadingSignal.set(false);
      }),
      catchError(error => {
        this.isLoadingSignal.set(false);
        return this.handleError(error);
      })
    );
  }

  register(data: RegisterRequest): Observable<any> {
    this.isLoadingSignal.set(true);
    return this.http.post(`${this.apiUrl}/auth/register`, data).pipe(
      tap(() => {
        this.isLoadingSignal.set(false);
      }),
      catchError(error => {
        this.isLoadingSignal.set(false);
        return this.handleError(error);
      })
    );
  }

  private handleLoginSuccess(response: LoginResponse): void {
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response));
    this.userSignal.set(response);
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  hasValidSession(): boolean {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!token && !!user && !this.isTokenExpired(token);
  }

  private clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.userSignal.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = token.split('.')[1];
      if (!payload) return true;

      const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
      const decoded = JSON.parse(atob(paddedPayload));
      if (typeof decoded.exp !== 'number') return false;

      return Date.now() >= decoded.exp * 1000;
    } catch {
      return true;
    }
  }

  getRedirectPath(tipoUsuario: string): string {
    switch (tipoUsuario) {
      case 'GESTOR':
        return '/dashboard';
      case 'ALUNO':
        return '/app/aluno';
      case 'MOTORISTA':
        return '/app/motorista';
      default:
        return '/login';
    }
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Erro inesperado';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.status === 401) {
      errorMessage = 'Email ou senha incorretos';
    } else if (error.status === 400) {
      errorMessage = error.error?.validationErrors?.email || error.error?.message || 'Dados inválidos';
    } else if (error.status === 0) {
      errorMessage = 'Não foi possível conectar ao servidor';
    }

    return throwError(() => new Error(errorMessage));
  }

  searchFaculdades(nome: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/faculdades/buscar?nome=${nome}`);
  }
}