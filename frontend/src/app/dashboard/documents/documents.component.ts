import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../services/dashboard.service';
import { DashboardSearchService } from '../services/dashboard-search.service';
import { Document } from '../models/dashboard.model';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.css'
})
export class DocumentsComponent implements OnInit {
  private svc = inject(DashboardService);
  private searchService = inject(DashboardSearchService);

  documents: Document[] = [];
  filtered: Document[] = [];
  total = 0;
  contracts = 0;
  licenses = 0;
  reports = 0;

  // Upload state
  showUploadModal = signal(false);
  selectedFile = signal<File | null>(null);
  uploadType = signal<string>('Contrato');
  uploadName = signal('');
  isUploading = signal(false);
  uploadError = signal('');
  searchQuery = signal('');

  private readonly searchSync = effect(() => {
    this.applyFilters(this.searchService.query());
  });

  ngOnInit() {
    this.loadDocuments();
  }

  loadDocuments() {
    this.svc.getDocuments().subscribe(data => {
      this.documents = data;
      this.applyFilters(this.searchService.query());
      this.total = data.length;
      this.contracts = data.filter(d => d.type === 'Contrato').length;
      this.licenses = data.filter(d => d.type === 'Licença').length;
      this.reports = data.filter(d => d.type === 'Relatório').length;
    });
  }

  onSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.searchQuery.set(query);
    this.applyFilters();
  }

  private applyFilters(globalSearch = '') {
    const query = `${this.searchQuery()} ${globalSearch}`.trim().toLowerCase();
    this.filtered = this.documents.filter(d =>
      !query ||
      d.name.toLowerCase().includes(query) ||
      d.type.toLowerCase().includes(query)
    );
  }

  openUploadModal() {
    this.selectedFile.set(null);
    this.uploadName.set('');
    this.uploadType.set('Contrato');
    this.uploadError.set('');
    this.showUploadModal.set(true);
  }

  closeUploadModal() {
    this.showUploadModal.set(false);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFile.set(file);
      // Auto-fill name if empty
      if (!this.uploadName()) {
        this.uploadName.set(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.selectedFile.set(file);
      if (!this.uploadName()) {
        this.uploadName.set(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  uploadDocument() {
    const file = this.selectedFile();
    if (!file) {
      this.uploadError.set('Selecione um arquivo.');
      return;
    }
    if (!this.uploadName()) {
      this.uploadError.set('Digite um nome para o documento.');
      return;
    }

    this.isUploading.set(true);
    this.uploadError.set('');

    this.svc.uploadDocument(file, this.uploadName(), this.uploadType()).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.closeUploadModal();
        this.loadDocuments();
      },
      error: (err: unknown) => {
        this.isUploading.set(false);
        this.uploadError.set('Erro ao fazer upload. Tente novamente.');
        console.error(err);
      }
    });
  }

  downloadDocument(doc: Document) {
    this.svc.downloadDocument(doc.id).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: unknown) => console.error('Erro ao baixar:', err)
    });
  }

  deleteDocument(id: number) {
    if (confirm('Deseja realmente excluir este documento?')) {
      this.svc.deleteDocument(id).subscribe({
        next: () => this.loadDocuments(),
        error: (err) => console.error('Erro ao excluir:', err)
      });
    }
  }

  getDocumentIcon(type: Document['type']): string {
    return type;
  }
}
