import { Component, Output, EventEmitter, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService, LoginResponse } from '../../services/auth.service';
import { DashboardSearchService } from '../services/dashboard-search.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  @Output() toggleSidebar = new EventEmitter<void>();

  private router = inject(Router);
  searchService = inject(DashboardSearchService);
  authService = inject(AuthService);

  showProfileModal = signal(false);
  searchTerm = '';

  ngOnInit() {
    // (placeholder for future view toggle logic)
  }

  get user(): LoginResponse | null {
    return this.authService.user();
  }

  get userInitials(): string {
    const nome = this.user?.nome || '';
    const parts = nome.split(' ');
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
  }

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  onNotifications() {
    this.router.navigate(['/dashboard/notificacoes']);
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm = value;
    this.searchService.setQuery(value);
  }

  clearSearch() {
    this.searchTerm = '';
    this.searchService.clear();
  }

  onProfile() {
    this.showProfileModal.set(true);
  }

  closeProfileModal() {
    this.showProfileModal.set(false);
  }

  logout() {
    this.authService.logout();
  }
}
