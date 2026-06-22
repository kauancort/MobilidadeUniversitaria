import { Component, OnInit, inject, signal, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../services/dashboard.service';
import { DashboardSearchService } from '../services/dashboard-search.service';
import { Vehicle } from '../models/dashboard.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicles.component.html',
  styleUrl: './vehicles.component.css'
})
export class VehiclesComponent implements OnInit {
  private svc = inject(DashboardService);
  private cdr = inject(ChangeDetectorRef);
  private searchService = inject(DashboardSearchService);
  private router = inject(Router);

  // Modal signals
  showCreateModal = signal(false);
  showEditModal = signal(false);
  showDeleteModal = signal(false);
  showViewModal = signal(false);
  selectedVehicle = signal<Vehicle | null>(null);

  // Form data
  formData: { plate: string; model: string; year: number | string; status: string; capacity: number; kmRodados: number | string } = {
    plate: '',
    model: '',
    year: '',
    status: 'ATIVO',
    capacity: 0,
    kmRodados: 0
  };

  vehicles: Vehicle[] = [];
  filtered: Vehicle[] = [];
  search: string = '';
  filterStatus: string = 'Todos';

  totalVehicles = 0;
  activeVehicles = 0;
  maintenanceVehicles = 0;
  totalCapacity = 0;

  private readonly searchSync = effect(() => {
    this.applyFilters(this.searchService.query());
  });

  ngOnInit() {
    this.loadVehicles();

    // Listen to route changes to reload data when tab is opened
    this.router.events.subscribe((event) => {
      if (event.constructor.name === 'NavigationEnd') {
        if (this.router.url === '/dashboard/veiculos') {
          this.loadVehicles();
        }
      }
    });
  }

  loadVehicles() {
    this.svc.getVehicles().subscribe({
      next: (data) => {
        this.vehicles = data;
        this.applyFilters(this.searchService.query());
        this.totalVehicles = data.length;
        this.activeVehicles = data.filter(v => v.status === 'ATIVO' || v.status === 'ativo').length;
        this.maintenanceVehicles = data.filter(v => v.status === 'MANUTENCAO' || v.status === 'manutencao').length;
        this.totalCapacity = data.reduce((acc, v) => acc + v.capacity, 0);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading vehicles:', err);
      }
    });
  }

  onSearch(event: Event) {
    this.search = (event.target as HTMLInputElement).value;
    this.applyFilters();
  }

  onStatusChange(event: Event) {
    this.filterStatus = (event.target as HTMLSelectElement).value;
    this.applyFilters();
  }

  applyFilters(globalSearch = '') {
    const statusMap: Record<string, string[]> = {
      'Todos': [],
      'ativo': ['ATIVO', 'ativo'],
      'manutencao': ['MANUTENCAO', 'manutencao'],
      'inativo': ['INATIVO', 'inativo']
    };
    const allowedStatuses = statusMap[this.filterStatus] || [];
    const searchTerm = `${this.search} ${globalSearch}`.trim().toLowerCase();

    this.filtered = this.vehicles.filter(v => {
      const matchSearch =
        !searchTerm ||
        v.plate.toLowerCase().includes(searchTerm) ||
        v.model.toLowerCase().includes(searchTerm);
      const matchStatus = this.filterStatus === 'Todos' || allowedStatuses.includes(v.status);
      return matchSearch && matchStatus;
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'ATIVO': 'Ativo',
      'ativo': 'Ativo',
      'MANUTENCAO': 'Manutenção',
      'manutencao': 'Manutenção',
      'INATIVO': 'Inativo',
      'inativo': 'Inativo'
    };
    return labels[status] ?? status;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'ATIVO': 'ativo',
      'ativo': 'ativo',
      'MANUTENCAO': 'manutencao',
      'manutencao': 'manutencao',
      'INATIVO': 'inativo',
      'inativo': 'inativo'
    };
    return classes[status] ?? 'ativo';
  }

  // View Modal
  openViewModal(vehicle: Vehicle) {
    this.selectedVehicle.set(vehicle);
    this.showViewModal.set(true);
  }

  closeViewModal() {
    this.showViewModal.set(false);
    this.selectedVehicle.set(null);
  }

  // Create Modal
  openCreateModal() {
    this.formData = { plate: '', model: '', year: '', status: 'ATIVO', capacity: 0, kmRodados: 0 };
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  createVehicle() {
    const data: Partial<Vehicle> = {
      plate: this.formData.plate,
      model: this.formData.model,
      year: this.formData.year ? Number(this.formData.year) : null,
      status: this.formData.status,
      capacity: this.formData.capacity,
      kmRodados: this.formData.kmRodados ? Number(this.formData.kmRodados) : 0
    };
    this.svc.createVehicle(data).subscribe({
      next: () => {
        this.closeCreateModal();
        this.loadVehicles();
      },
      error: (err) => alert('Erro ao criar veículo: ' + (err.error?.message || err.message || 'Verifique os campos e tente novamente'))
    });
  }

  // Edit Modal
  openEditModal(vehicle: Vehicle) {
    this.selectedVehicle.set(vehicle);
    this.formData = {
      plate: vehicle.plate,
      model: vehicle.model,
      year: vehicle.year ?? '',
      status: vehicle.status,
      capacity: vehicle.capacity,
      kmRodados: vehicle.kmRodados ?? 0
    };
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.selectedVehicle.set(null);
  }

  updateVehicle() {
    const vehicle = this.selectedVehicle();
    if (vehicle) {
      const data: Partial<Vehicle> = {
        plate: this.formData.plate,
        model: this.formData.model,
        year: this.formData.year ? Number(this.formData.year) : null,
        status: this.formData.status,
        capacity: this.formData.capacity,
        kmRodados: this.formData.kmRodados ? Number(this.formData.kmRodados) : 0
      };
      this.svc.updateVehicle(vehicle.id, data).subscribe({
        next: () => {
          this.closeEditModal();
          this.loadVehicles();
        },
        error: (err) => alert('Erro ao atualizar veículo: ' + (err.error?.message || err.message || 'Verifique os campos e tente novamente'))
      });
    }
  }

  // Delete Modal
  openDeleteModal(vehicle: Vehicle) {
    this.selectedVehicle.set(vehicle);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
    this.selectedVehicle.set(null);
  }

  confirmDelete() {
    const vehicle = this.selectedVehicle();
    if (vehicle) {
      this.svc.deleteVehicle(vehicle.id).subscribe({
        next: () => {
          this.closeDeleteModal();
          this.loadVehicles();
        },
        error: (err) => alert('Erro ao excluir veículo: ' + (err.error?.message || err.message || 'Tente novamente'))
      });
    }
  }
}
