import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DashboardSearchService {
  private readonly querySignal = signal('');

  readonly query = this.querySignal.asReadonly();

  setQuery(value: string): void {
    this.querySignal.set(value.trim().toLowerCase());
  }

  clear(): void {
    this.querySignal.set('');
  }
}
