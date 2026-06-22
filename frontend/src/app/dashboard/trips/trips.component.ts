import { Component, OnInit, inject, signal, ChangeDetectorRef, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../services/dashboard.service';
import { DashboardSearchService } from '../services/dashboard-search.service';
import { Trip } from '../models/dashboard.model';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-trips',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trips.component.html',
  styleUrl: './trips.component.css'
})
export class TripsComponent implements OnInit, OnDestroy {
  private svc = inject(DashboardService);
  private cdr = inject(ChangeDetectorRef);
  private searchService = inject(DashboardSearchService);
  private router = inject(Router);
  private routerSub?: Subscription;

  trips: Trip[] = [];
  filteredTrips: Trip[] = [];
  search = '';
  scheduledToday = 0;
  totalPassengers = 0;
  completed = 0;

  drivers: any[] = [];
  vehicles: any[] = [];
  routes: any[] = [];

  showCreateModal = signal(false);
  showEditModal = signal(false);
  showDeleteModal = signal(false);
  showViewModal = signal(false);
  selectedTrip = signal<Trip | null>(null);

  private readonly searchSync = effect(() => {
    this.applyFilters(this.searchService.query());
  });

  formData = {
    rotaId: '' as string | number,
    motoristaId: '' as string | number,
    veiculoId: '' as string | number,
    dataHoraPartida: '',
    dataHoraChegadaPrevista: ''
  };

  ngOnInit() {
    this.loadTrips();
    this.loadDrivers();
    this.loadVehicles();
    this.loadRoutes();

    // Listen to route changes to reload data when tab is opened
    this.routerSub = this.router.events.subscribe((event) => {
      if (event.constructor.name === 'NavigationEnd') {
        // Check if the current route is the trips route
        if (this.router.url === '/dashboard/viagens') {
          this.loadTrips();
          this.loadDrivers();
          this.loadVehicles();
          this.loadRoutes();
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  loadTrips() {
    this.svc.getTrips().subscribe({
      next: (data) => {
        this.trips = data;
        this.scheduledToday = data.filter(t => t.status === 'agendada').length;
        this.totalPassengers = data.reduce((acc, t) => acc + t.studentsCount, 0);
        this.completed = data.filter(t => ['completed', 'concluida', 'finalizada'].includes(String(t.status))).length;
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading trips:', err);
      }
    });
  }

  loadDrivers() {
    this.svc.getDrivers().subscribe((data: any[]) => this.drivers = data);
  }

  loadVehicles() {
    this.svc.getVehiclesList().subscribe((data: any[]) => this.vehicles = data);
  }

  loadRoutes() {
    this.svc.getRoutes().subscribe(data => this.routes = data);
  }

  openViewModal(trip: Trip) {
    this.selectedTrip.set(trip);
    this.showViewModal.set(true);
  }

  closeViewModal() {
    this.showViewModal.set(false);
    this.selectedTrip.set(null);
  }

  openCreateModal() {
    this.formData = { rotaId: '', motoristaId: '', veiculoId: '', dataHoraPartida: '', dataHoraChegadaPrevista: '' };
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  createTrip() {
    if (!this.formData.rotaId || !this.formData.motoristaId || !this.formData.veiculoId
        || !this.formData.dataHoraPartida || !this.formData.dataHoraChegadaPrevista) {
      alert('Por favor, preencha todos os campos da viagem.');
      return;
    }
    this.svc.createTrip(this.formData).subscribe({
      next: (response) => {
        this.closeCreateModal();
        this.loadTrips();
        this.svc.triggerRefresh();
        window.dispatchEvent(new CustomEvent('trip-data-updated'));
      },
      error: (err) => {
        alert('Erro ao criar viagem: ' + (err.error?.message || err.message || 'Verifique os campos e tente novamente'));
      }
    });
  }

  openEditModal(trip: Trip) {
    this.selectedTrip.set(trip);
    this.formData = {
      rotaId: String(trip.routeId || ''),
      motoristaId: String(trip.driverId || ''),
      veiculoId: String(trip.vehicleId || ''),
      dataHoraPartida: trip.date || '',
      dataHoraChegadaPrevista: trip.time || ''
    };
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.selectedTrip.set(null);
  }

  updateTrip() {
    const trip = this.selectedTrip();
    if (!trip) return;

    if (!this.formData.rotaId || !this.formData.motoristaId || !this.formData.veiculoId
        || !this.formData.dataHoraPartida || !this.formData.dataHoraChegadaPrevista) {
      alert('Por favor, preencha todos os campos da viagem.');
      return;
    }

    this.svc.updateTrip(trip.id, this.formData).subscribe({
      next: (response: any) => {
        this.closeEditModal();
        this.loadTrips();
        this.svc.triggerRefresh();
        window.dispatchEvent(new CustomEvent('trip-data-updated'));
      },
      error: (err: any) => {
        alert('Erro ao atualizar viagem: ' + (err.error?.message || err.message || 'Verifique os campos e tente novamente'));
      }
    });
  }

  openDeleteModal(trip: Trip) {
    this.selectedTrip.set(trip);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
    this.selectedTrip.set(null);
  }

  confirmDelete() {
    const trip = this.selectedTrip();
    if (trip) {
      if (confirm(`Tem certeza que deseja excluir a viagem "${trip.route}"?`)) {
        this.svc.deleteTrip(trip.id).subscribe({
          next: (response) => {
            this.closeDeleteModal();
            this.loadTrips();
            this.svc.triggerRefresh();
            window.dispatchEvent(new CustomEvent('trip-data-updated'));
          },
          error: (err) => {
            console.error('Erro ao excluir viagem:', err);
            alert('Erro ao excluir viagem: ' + (err.error?.message || err.message || 'Tente novamente'));
          }
        });
      }
    }
  }

  applyFilters(globalSearch = '') {
    const query = `${this.search} ${globalSearch}`.trim().toLowerCase();
    if (!query) {
      this.filteredTrips = this.trips;
      return;
    }

    this.filteredTrips = this.trips.filter(trip =>
      trip.route.toLowerCase().includes(query) ||
      trip.driver.toLowerCase().includes(query) ||
      trip.vehicle.toLowerCase().includes(query) ||
      trip.status.toLowerCase().includes(query) ||
      trip.date.toLowerCase().includes(query) ||
      trip.time.toLowerCase().includes(query)
    );
  }

  getStatusLabel(status: Trip['status']): string {
    const labels: Record<string, string> = {
      'agendada': 'agendada',
      'concluida': 'concluída',
      'pending': 'pendente',
      'in-progress': 'em trânsito',
      'completed': 'finalizada'
    };
    return labels[status] ?? status;
  }
}