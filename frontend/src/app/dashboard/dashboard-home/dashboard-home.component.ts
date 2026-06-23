import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { DashboardService } from '../services/dashboard.service';
import { Trip, DailyDemand, RouteOccupancy, DashboardSummary, StudentUsageRow } from '../models/dashboard.model';
import { DataTableComponent } from '../data-table/data-table.component';
import { DashboardKpisComponent } from '../dashboard-kpis/dashboard-kpis.component';
import { StudentUsageTableComponent } from '../student-usage-table/student-usage-table.component';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [DataTableComponent, DashboardKpisComponent, StudentUsageTableComponent],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.css'
})
export class DashboardHomeComponent implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private refreshHandle?: ReturnType<typeof setInterval>;
  private serviceRefreshSub?: any;
  private handleTripUpdate = () => {
    this.loadDashboardData();
  };

  summary: DashboardSummary = {
    totalStudents: 0,
    studentsGrowth: 0,
    occupancyRate: 0,
    occupancyGrowth: 0,
    tripsToday: 0,
    completedTripsToday: 0
  };
  studentUsage: StudentUsageRow[] = [];
  trips: Trip[] = [];
  dailyDemand: DailyDemand[] = [];
  routeOccupancy: RouteOccupancy[] = [];

  svgPath = '';
  svgPoints: { x: number; y: number; day: string; value: number }[] = [];
  maxDemand = 300;

  ngOnInit() {
    this.loadDashboardData();
    window.addEventListener('trip-data-updated', this.handleTripUpdate);
    this.serviceRefreshSub = this.dashboardService.refresh$.subscribe(() => this.loadDashboardData());

    this.refreshHandle = setInterval(() => {
      this.loadDashboardData();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshHandle) {
      clearInterval(this.refreshHandle);
    }
    this.serviceRefreshSub?.unsubscribe();
    window.removeEventListener('trip-data-updated', this.handleTripUpdate);
  }

  loadDashboardData() {
    this.dashboardService.getSummary().subscribe({
      next: (summary) => {
        this.summary = summary;
      },
      error: () => {
        this.summary = {
          totalStudents: 0,
          studentsGrowth: 0,
          occupancyRate: 0,
          occupancyGrowth: 0,
          tripsToday: 0,
          completedTripsToday: 0
        };
      }
    });

    this.dashboardService.getStudentUsageRows().subscribe({
      next: (rows) => this.studentUsage = rows,
      error: () => this.studentUsage = []
    });

    this.dashboardService.getTrips().subscribe(data => this.trips = data);

    this.dashboardService.getDailyDemand().subscribe({
      next: (data: any[]) => {
        this.dailyDemand = data.map(d => ({
          day: d.dia ?? d.day ?? '',
          students: d.totalPresencas ?? d.students ?? 0
        }));
        this.calculateSvgChart();
      },
      error: () => {
        this.dailyDemand = [];
        this.svgPoints = [];
        this.svgPath = '';
      }
    });

    this.dashboardService.getRouteOccupancy().subscribe({
      next: (data: any[]) => {
        this.routeOccupancy = data.map(r => ({
          route: r.nomeRota ?? r.route ?? '',
          occupancy: Number(r.ocupacaoPercent ?? r.occupancy ?? 0)
        }));
        this.updateAverageOccupancy();
      },
      error: () => {
        this.routeOccupancy = [];
        this.updateAverageOccupancy();
      }
    });
  }

  private updateAverageOccupancy(): void {
    const validRates = this.routeOccupancy
      .map(route => Number(route.occupancy))
      .filter(rate => Number.isFinite(rate));

    const average = validRates.length
      ? validRates.reduce((sum, rate) => sum + rate, 0) / validRates.length
      : 0;

    this.summary = {
      ...this.summary,
      occupancyRate: average
    };
  }

  calculateSvgChart() {
    if (this.dailyDemand.length === 0) return;

    const width = 500;
    const height = 150;
    const paddingLeft = 30;
    const paddingRight = 30;
    const paddingTop = 20;
    const paddingBottom = 20;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;
    this.maxDemand = Math.max(...this.dailyDemand.map(item => item.students), 1);

    this.svgPoints = this.dailyDemand.map((item, index) => {
      const x = paddingLeft + (index / Math.max(this.dailyDemand.length - 1, 1)) * chartWidth;
      const y = height - paddingBottom - (item.students / this.maxDemand) * chartHeight;
      return { x, y, day: item.day, value: item.students };
    });

    this.svgPath = this.svgPoints.reduce((path, point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }
      return `${path} L ${point.x} ${point.y}`;
    }, '');
  }

  getFillPath(): string {
    if (this.svgPoints.length === 0) return '';
    const height = 150;
    const paddingBottom = 20;
    const first = this.svgPoints[0];
    const last = this.svgPoints[this.svgPoints.length - 1];

    return `${this.svgPath} L ${last.x} ${height - paddingBottom} L ${first.x} ${height - paddingBottom} Z`;
  }
}
