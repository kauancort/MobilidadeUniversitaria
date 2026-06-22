import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { User, Route, Vehicle, Trip, Document, DailyDemand, RouteOccupancy, RouteStop, DashboardSummary, StudentUsageRow } from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  private refreshSubject = new Subject<void>();
  public refresh$ = this.refreshSubject.asObservable();

  public triggerRefresh(): void {
    this.refreshSubject.next();
  }

  public getStats(): Observable<DashboardSummary> {
    return this.getSummary();
  }

  public getSummary(): Observable<DashboardSummary> {
    return this.api.get('/dashboard/kpis').pipe(
      map((data: any) => ({
        totalStudents: Number(data.totalAlunos ?? 0),
        studentsGrowth: Number(data.variacaoAlunos ?? 0),
        occupancyRate: Number(data.taxaOcupacao ?? 0),
        occupancyGrowth: Number(data.variacaoOcupacao ?? 0),
        tripsToday: Number(data.viagensHoje ?? 0),
        completedTripsToday: Number(data.viagensFinalizadas ?? 0)
      }))
    );
  }

  public getStudentFrequencia(alunoId: number): Observable<StudentUsageRow> {
    return this.api.get(`/dashboard/aluno/${alunoId}/frequencia`).pipe(
      map((data: any) => ({
        alunoId: Number(data.alunoId ?? alunoId),
        nome: String(data.nome ?? ''),
        viagensReservadas: Number(data.viagensReservadas ?? 0),
        viagensConfirmadas: Number(data.viagensConfirmadas ?? 0),
        percentualFrequencia: Number(data.percentualFrequencia ?? 0),
        createdAt: data.createdAt ? new Date(data.createdAt).toLocaleDateString('pt-BR') : '—'
      }))
    );
  }

  public getStudentUsageRows(): Observable<StudentUsageRow[]> {
    // Single bulk call — avoids N parallel requests and forkJoin failures
    return this.api.get('/dashboard/alunos/frequencia').pipe(
      map((data: any) =>
        (data as any[]).map(item => ({
          alunoId: Number(item.alunoId ?? 0),
          nome: String(item.nome ?? ''),
          viagensReservadas: Number(item.viagensReservadas ?? 0),
          viagensConfirmadas: Number(item.viagensConfirmadas ?? 0),
          percentualFrequencia: Number(item.percentualFrequencia ?? 0),
          createdAt: item.createdAt
            ? new Date(item.createdAt).toLocaleDateString('pt-BR')
            : '—'
        }))
      ),
      map((rows) => rows.sort((a, b) => b.alunoId - a.alunoId)),
      catchError(() => of([]))
    );
  }

  // Users API - map backend response to frontend model
  public getUsers(): Observable<User[]> {
    return this.api.get('/usuarios').pipe(
      map((data) => (data as any[]).map(u => ({
        id: u.id,
        name: u.nome,
        cpf: u.cpf,
        email: u.email,
        phone: u.telefone,
        type: u.tipoUsuario === 'GESTOR' ? 'admin' : (u.tipoUsuario?.toLowerCase() || 'aluno'),
        status: 'Ativo' as const,
        createdAt: new Date().toLocaleDateString('pt-BR'),
        address: u.endereco ? {
          cep: u.endereco.cep,
          rua: u.endereco.rua,
          bairro: u.endereco.bairro,
          numero: u.endereco.numero,
          complemento: u.endereco.complemento,
          tipoLocal: u.endereco.tipoLocal
        } : undefined,
        faculdade: u.faculdade ? {
          id: u.faculdade.id,
          nome: u.faculdade.nome
        } : undefined
      })))
    );
  }

  public createUser(user: Partial<User> & { type?: string; password?: string }): Observable<any> {
    const tipoMap: Record<string, string> = {
      'aluno': 'ALUNO',
      'motorista': 'MOTORISTA',
      'admin': 'GESTOR'
    };
    return this.api.post('/usuarios', {
      nome: user.name,
      email: user.email,
      cpf: user.cpf,
      telefone: user.phone,
      senha: user.password || 'password123',
      tipoUsuario: tipoMap[user.type || 'aluno'] || 'ALUNO'
    });
  }

  public updateUser(id: number, user: Partial<User>): Observable<User> {
    return this.api.put(`/usuarios/${id}`, {
      nome: user.name,
      email: user.email,
      telefone: user.phone
    }) as Observable<User>;
  }

  public deleteUser(id: number): Observable<any> {
    return this.api.delete(`/usuarios/${id}`);
  }

  public updateUserStatus(id: number, status: string): Observable<any> {
    return this.api.put(`/usuarios/${id}/status`, { status });
  }

  // Routes API - map backend response
  public getRoutes(): Observable<Route[]> {
    return this.api.get('/rotas').pipe(
      map((data) => (data as any[]).map(r => {
        let stops: RouteStop[] = [];
        if (r.paradas) {
          try {
            const parsed = typeof r.paradas === 'string' ? JSON.parse(r.paradas) : r.paradas;
            if (Array.isArray(parsed)) {
              stops = parsed.map((s: string) => ({ name: s, time: '' }));
            }
          } catch {
            stops = [];
          }
        }
        return {
          id: r.id,
          name: r.nomeRota,
          description: r.descricao,
          originDest: r.pontoParada,
          status: r.ativa ? 'Ativa' as const : 'Inativa' as const,
          stops,
          paradas: typeof r.paradas === 'string' ? JSON.parse(r.paradas || '[]') : (r.paradas || [])
        };
      }))
    );
  }

  public createRoute(route: Partial<Route> & { paradas?: string[] }): Observable<Route> {
    const paradasJson = route.paradas ? JSON.stringify(route.paradas) : null;
    return this.api.post('/rotas', {
      nomeRota: route.name,
      descricao: route.description,
      pontoParada: route.originDest,
      paradas: paradasJson,
      ativa: true
    }) as Observable<Route>;
  }

  public updateRoute(id: number, route: Partial<Route> & { paradas?: string[] }): Observable<Route> {
    const paradasJson = route.paradas ? JSON.stringify(route.paradas) : null;
    return this.api.put(`/rotas/${id}`, {
      nomeRota: route.name,
      descricao: route.description,
      pontoParada: route.originDest,
      paradas: paradasJson,
      ativa: route.status === 'Ativa'
    }) as Observable<Route>;
  }

  public deleteRoute(id: number): Observable<any> {
    return this.api.delete(`/rotas/${id}`);
  }

  public updateRouteStatus(id: number, ativa: boolean): Observable<any> {
    return this.api.put(`/rotas/${id}/status`, { ativa });
  }

  // Vehicles API
  public getVehicles(): Observable<Vehicle[]> {
    return this.api.get('/veiculos').pipe(
      map((data) => (data as any[]).map(v => ({
        id: v.id,
        plate: v.placa,
        model: v.modelo,
        year: v.ano,
        status: v.status?.toLowerCase() || 'ativo',
        capacity: v.capacidadeTotal,
        kmRodados: v.kmRodados ?? 0,
        proximaRevisao: v.proximaRevisao ?? null
      })))
    );
  }

  public getVehiclesList(): Observable<Vehicle[]> {
    return this.getVehicles();
  }

  public getDrivers(): Observable<any[]> {
    return this.api.get('/motoristas').pipe(
      map((data: any) => (data as any[]).map((m) => ({
        id: m.id,
        name: m.nome,
        email: m.email,
        phone: m.telefone,
        cpf: m.cpf,
        status: m.status ?? 'Ativo'
      })))
    );
  }

  public createVehicle(vehicle: Partial<Vehicle>): Observable<Vehicle> {
    return this.api.post('/veiculos', {
      placa: vehicle.plate,
      modelo: vehicle.model,
      capacidadeTotal: vehicle.capacity,
      ano: vehicle.year || null,
      status: vehicle.status?.toUpperCase() || 'ATIVO',
      kmRodados: vehicle.kmRodados ?? 0
    }) as Observable<Vehicle>;
  }

  public updateVehicle(id: number, vehicle: Partial<Vehicle>): Observable<Vehicle> {
    return this.api.put(`/veiculos/${id}`, {
      placa: vehicle.plate,
      modelo: vehicle.model,
      capacidadeTotal: vehicle.capacity,
      ano: vehicle.year || null,
      status: vehicle.status?.toUpperCase(),
      kmRodados: vehicle.kmRodados
    }) as Observable<Vehicle>;
  }

  public deleteVehicle(id: number): Observable<any> {
    return this.api.delete(`/veiculos/${id}`);
  }

  public updateVehicleStatus(id: number, status: string): Observable<any> {
    return this.api.put(`/veiculos/${id}`, { status: status.toUpperCase() });
  }

  // Trips API
  public getTrips(): Observable<Trip[]> {
    return this.api.get('/viagens').pipe(
      map((data) => (data as any[]).map(t => ({
        id: t.id,
        route: t.rota?.nomeRota || 'Rota não definida',
        date: t.dataHoraPartida
          ? new Date(t.dataHoraPartida).toLocaleDateString('pt-BR')
          : '—',
        time: t.dataHoraPartida
          ? new Date(t.dataHoraPartida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : '—',
        driver: t.motorista?.nome || 'A definir',
        vehicle: t.veiculo?.modelo || t.veiculo?.placa || 'A definir',
        studentsCount: 0,
        status: this.mapTripStatus(t.status)
      })))
    );
  }

  public createTrip(trip: any): Observable<Trip> {
    const formatDate = (dt: string) => {
      if (!dt) return '';
      const [date, time] = dt.split('T');
      const [y, m, d] = date.split('-');
      return `${d}/${m}/${y} ${time || '00:00'}`;
    };

    return this.api.post('/viagens', {
      rotaId: Number(trip.rotaId),
      motoristaId: Number(trip.motoristaId),
      veiculoId: Number(trip.veiculoId),
      dataHoraPartida: formatDate(trip.dataHoraPartida),
      dataHoraChegadaPrevista: formatDate(trip.dataHoraChegadaPrevista)
    }) as Observable<Trip>;
  }

  public updateTrip(id: number, trip: any): Observable<Trip> {
    const formatDate = (dt: string) => {
      if (!dt) return '';
      const [date, time] = dt.split('T');
      const [y, m, d] = date.split('-');
      return `${d}/${m}/${y} ${time || '00:00'}`;
    };

    return this.api.put(`/viagens/${id}`, {
      rotaId: Number(trip.rotaId),
      motoristaId: Number(trip.motoristaId),
      veiculoId: Number(trip.veiculoId),
      dataHoraPartida: formatDate(trip.dataHoraPartida),
      dataHoraChegadaPrevista: formatDate(trip.dataHoraChegadaPrevista)
    }) as Observable<Trip>;
  }

  public deleteTrip(id: number): Observable<any> {
    return this.api.delete(`/viagens/${id}`);
  }

  public updateTripStatus(id: number, status: string): Observable<any> {
    return this.api.put(`/viagens/${id}/status`, { status: status.toUpperCase() });
  }

  // Documents API
  public getDocuments(): Observable<Document[]> {
    return this.api.get('/documents').pipe(
      map((data) => (data as any[]).map(d => ({
        id: d.id,
        name: d.nome,
        type: d.tipoDocumento,
        size: d.tamanho || '0 KB',
        date: d.dataCriacao || new Date().toLocaleDateString('pt-BR')
      })))
    );
  }

  public uploadDocument(file: File, nome: string, tipo: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('nome', nome);
    formData.append('tipo', tipo);
    return this.api.post('/documents/upload', formData, true);
  }

  public downloadDocument(id: number): Observable<Blob> {
    return this.api.getBlob(`/documents//download`);
  }

  public createDocument(document: Partial<Document>): Observable<Document> {
    return this.api.post('/documents', {
      nome: document.name,
      tipoDocumento: document.type,
      urlArquivo: '',
      tamanho: document.size,
      descricao: ''
    }) as Observable<Document>;
  }

  public deleteDocument(id: number): Observable<any> {
    return this.api.delete(`/documents/${id}`);
  }

  public sendNotification(payload: { destinatarios: string; tipo: string; titulo: string; mensagem: string }): Observable<any> {
    return this.api.post('/notificacoes', payload);
  }

  public getSystemSettings(): Observable<any> {
    return this.api.get('/system/settings');
  }

  public updateSystemSettings(payload: any): Observable<any> {
    return this.api.put('/system/settings', payload);
  }

  // Dashboard analytics
  public getDailyDemand(): Observable<DailyDemand[]> {
    const dayOrder = new Map([
      ['segunda-feira', 1],
      ['terca-feira', 2],
      ['terça-feira', 2],
      ['quarta-feira', 3],
      ['quinta-feira', 4],
      ['sexta-feira', 5],
      ['sábado', 6],
      ['sabado', 6],
      ['domingo', 7]
    ]);

    return this.api.get('/dashboard/demanda-por-dia').pipe(
      map((data) => (data as any[])
        .map(d => ({
          day: String(d.dia ?? d.day ?? '').trim(),
          students: Number(d.totalPresencas ?? d.total ?? d.students ?? 0)
        }))
        .sort((a, b) => (dayOrder.get(a.day.toLowerCase()) ?? 99) - (dayOrder.get(b.day.toLowerCase()) ?? 99))
      ),
      catchError(() => of([]))
    );
  }

  public getRouteOccupancy(): Observable<RouteOccupancy[]> {
    return this.api.get('/dashboard/ocupacao-por-rota').pipe(
      map((data) => (data as any[]).map(r => ({
        route: String(r.nomeRota ?? r.route ?? ''),
        occupancy: Number(r.ocupacaoPercent ?? r.ocupacao ?? r.occupancy ?? 0)
      }))),
      catchError(() => of([]))
    );
  }

  private mapTripStatus(status?: string): Trip['status'] {
    switch ((status || '').toUpperCase()) {
      case 'AGENDADA':
      case 'PENDING':
        return 'agendada';
      case 'EM_ANDAMENTO':
      case 'IN_PROGRESS':
        return 'in-progress';
      case 'FINALIZADA':
      case 'CONCLUIDA':
      case 'COMPLETED':
        return 'concluida';
      default:
        return 'pending';
    }
  }
}
