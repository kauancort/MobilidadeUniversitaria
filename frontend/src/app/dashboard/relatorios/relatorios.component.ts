import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from './report.service';
import { DashboardService } from '../services/dashboard.service';
import { Route } from '../models/dashboard.model';
import {
  ReportMetrics,
  TripsOccupancy,
  AttendanceByUniversity,
  ScheduleDistribution,
  RoutePerformance,
  ReportInsight
} from './report.model';

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './relatorios.component.html',
  styleUrl: './relatorios.component.css'
})
export class RelatoriosComponent implements OnInit {
  private reportService = inject(ReportService);
  private dashboardService = inject(DashboardService);

  // Filters State
  startDate = signal<string>('');
  endDate = signal<string>('');
  selectedRouteId = signal<string>('todos');
  selectedPeriod = signal<string>('todos');

  // Data Signals
  metrics = signal<ReportMetrics | null>(null);
  tripsOccupancyRaw = signal<TripsOccupancy[]>([]);
  attendanceRaw = signal<AttendanceByUniversity[]>([]);
  scheduleDistributionRaw = signal<ScheduleDistribution[]>([]);
  routePerformanceRaw = signal<RoutePerformance[]>([]);
  insights = signal<ReportInsight[]>([]);
  routes = signal<Route[]>([]);
  isLoading = signal<boolean>(false);

  // SVG Chart Calculation Helpers
  lineChartPoints = signal<{ x: number; y: number; label: string; trips: number; occupancy: number }[]>([]);
  lineChartPathTrips = signal<string>('');
  lineChartPathOccupancy = signal<string>('');
  lineChartFillTrips = signal<string>('');
  lineChartFillOccupancy = signal<string>('');

  ngOnInit(): void {
    this.loadRoutes();
    this.loadReportData();
  }

  loadRoutes(): void {
    this.dashboardService.getRoutes().subscribe({
      next: (data) => this.routes.set(data),
      error: (err) => console.error('Erro ao carregar rotas:', err)
    });
  }

  loadReportData(): void {
    this.isLoading.set(true);
    const startStr = this.startDate() ? this.toLocalDateTimeStart(this.startDate()) : undefined;
    const endStr = this.endDate() ? this.toLocalDateTimeEnd(this.endDate()) : undefined;

    // Load Metrics
    this.reportService.getMetrics(startStr, endStr).subscribe({
      next: (data) => this.metrics.set(data),
      error: (err) => console.error('Erro ao carregar métricas:', err)
    });

    // Load Trips & Occupancy
    this.reportService.getTripsAndOccupancy().subscribe({
      next: (data) => {
        const sorted = [...data].sort((a, b) => this.parseMonthLabel(a.mes) - this.parseMonthLabel(b.mes));
        this.tripsOccupancyRaw.set(sorted);
        this.calculateLineChart();
      },
      error: (err) => console.error('Erro ao carregar viagens e ocupação:', err)
    });

    // Load Attendance per College
    this.reportService.getAttendanceByUniversity().subscribe({
      next: (data) => this.attendanceRaw.set(data),
      error: (err) => console.error('Erro ao carregar presença por faculdade:', err)
    });

    // Load Schedule Distribution
    this.reportService.getScheduleDistribution(this.selectedPeriod()).subscribe({
      next: (data) => this.scheduleDistributionRaw.set(data),
      error: (err) => console.error('Erro ao carregar distribuição de horários:', err)
    });

    // Load Route Performance
    this.reportService.getRoutePerformance().subscribe({
      next: (data) => this.routePerformanceRaw.set(data),
      error: (err) => console.error('Erro ao carregar performance de rotas:', err)
    });

    // Load Insights
    this.reportService.getInsights().subscribe({
      next: (data) => this.insights.set(data),
      error: (err) => {
        console.error('Erro ao carregar insights:', err);
        this.isLoading.set(false);
      },
      complete: () => this.isLoading.set(false)
    });
  }

  // Filter application
  applyFilters(): void {
    this.loadReportData();
  }

  clearFilters(): void {
    this.startDate.set('');
    this.endDate.set('');
    this.selectedRouteId.set('todos');
    this.loadReportData();
  }

  onPeriodChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedPeriod.set(select.value);
    this.reportService.getScheduleDistribution(this.selectedPeriod()).subscribe({
      next: (data) => this.scheduleDistributionRaw.set(data),
      error: (err) => console.error('Erro ao carregar distribuição de horários:', err)
    });
  }

  // Get filtered routes table data
  getFilteredRoutePerformance(): RoutePerformance[] {
    const routeId = this.selectedRouteId();
    const data = this.routePerformanceRaw();
    if (routeId === 'todos') {
      return data;
    }
    return data.filter(r => r.rotaId.toString() === routeId);
  }

  private toLocalDateTimeStart(date: string): string {
    return `${date}T00:00:00`;
  }

  private toLocalDateTimeEnd(date: string): string {
    return `${date}T23:59:59.999`;
  }

  private parseMonthLabel(label: string): number {
    const normalized = label.toLowerCase().replaceAll('.', '').trim();
    const monthMap: Record<string, number> = {
      jan: 1,
      janeiro: 1,
      fev: 2,
      fevereiro: 2,
      mar: 3,
      março: 3,
      marco: 3,
      abr: 4,
      abril: 4,
      mai: 5,
      maio: 5,
      jun: 6,
      junho: 6,
      jul: 7,
      julho: 7,
      ago: 8,
      agosto: 8,
      set: 9,
      setembro: 9,
      out: 10,
      outubro: 10,
      nov: 11,
      novembro: 11,
      dez: 12,
      dezembro: 12,
    };

    const [monthPart, yearPart] = normalized.split('/');
    const monthNumber = monthMap[monthPart] ?? 0;
    const yearNumber = Number(yearPart ?? 0);
    return yearNumber * 100 + monthNumber;
  }

  // SVG Line Chart Calculation
  calculateLineChart(): void {
    const data = this.tripsOccupancyRaw();
    if (data.length === 0) {
      this.lineChartPoints.set([]);
      this.lineChartPathTrips.set('');
      this.lineChartPathOccupancy.set('');
      this.lineChartFillTrips.set('');
      this.lineChartFillOccupancy.set('');
      return;
    }

    const width = 600;
    const height = 200;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 30;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const maxTrips = Math.max(...data.map(d => d.totalViagens), 10);
    const maxOccupancy = 100;

    const points = data.map((item, index) => {
      const x = paddingLeft + (index / Math.max(data.length - 1, 1)) * chartWidth;
      const yTrips = height - paddingBottom - (item.totalViagens / maxTrips) * chartHeight;
      const yOccupancy = height - paddingBottom - (item.ocupacaoPercent / maxOccupancy) * chartHeight;
      return { x, yTrips, yOccupancy, label: item.mes, trips: item.totalViagens, occupancy: item.ocupacaoPercent };
    });

    // Generate Path for Trips
    const pathTrips = points.reduce((path, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.yTrips}` : `${path} L ${pt.x} ${pt.yTrips}`;
    }, '');

    // Generate Path for Occupancy
    const pathOccupancy = points.reduce((path, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.yOccupancy}` : `${path} L ${pt.x} ${pt.yOccupancy}`;
    }, '');

    this.lineChartPoints.set(points.map(p => ({
      x: p.x,
      y: p.yTrips, // default mapping to trips
      label: p.label,
      trips: p.trips,
      occupancy: p.occupancy
    })));

    this.lineChartPathTrips.set(pathTrips);
    this.lineChartPathOccupancy.set(pathOccupancy);

    if (points.length > 0) {
      const first = points[0];
      const last = points[points.length - 1];
      this.lineChartFillTrips.set(`${pathTrips} L ${last.x} ${height - paddingBottom} L ${first.x} ${height - paddingBottom} Z`);
      this.lineChartFillOccupancy.set(`${pathOccupancy} L ${last.x} ${height - paddingBottom} L ${first.x} ${height - paddingBottom} Z`);
    }
  }

  // Get Stroke Dasharray for Donut Sectors
  getDonutStrokeProps(index: number): { dashArray: string; dashOffset: number; color: string } {
    const data = this.scheduleDistributionRaw();
    const total = data.reduce((sum, item) => sum + item.quantidade, 0);
    if (total === 0) {
      return { dashArray: '0 283', dashOffset: 0, color: '#3f3f46' };
    }

    const radius = 45;
    const circumference = 2 * Math.PI * radius; // ~282.74

    let accumulatedPct = 0;
    for (let i = 0; i < index; i++) {
      accumulatedPct += data[i].percentual;
    }

    const valuePct = data[index].percentual;
    const strokeLength = (valuePct / 100) * circumference;
    const spaceLength = circumference - strokeLength;
    const offset = circumference - ((accumulatedPct / 100) * circumference);

    const colors = [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#06b6d4'  // cyan
    ];
    const color = colors[index % colors.length];

    return {
      dashArray: `${strokeLength} ${spaceLength}`,
      dashOffset: offset,
      color
    };
  }

  getDonutColor(index: number): string {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
    return colors[index % colors.length];
  }
}
