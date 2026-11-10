import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../badge/badge';
import { Button } from '../button/button';
import { ProductoDTO } from '../core/models';
import { ProductoApi } from '../core/producto-api';
import { ProductForm } from '../product-form/product-form';
import { Field } from '../field/field';

type FiltroEstado = 'todos' | 'activo' | 'inactivo';

const POR_PAGINA = 10;

@Component({
  imports: [Badge, Button, Field, DatePipe, RouterLink, ProductForm],
  selector: 'vc-products',
  styleUrl: './products.css',
  templateUrl: './products.html',
})
export class Products {
  private readonly api = inject(ProductoApi);

  protected readonly porPagina = POR_PAGINA;

  // Listado
  protected readonly productos = signal<ProductoDTO[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);

  // Filtros y paginación (el backend aún no los soporta, se resuelven aquí)
  protected readonly busqueda = signal('');
  protected readonly filtroEstado = signal<FiltroEstado>('todos');
  protected readonly pagina = signal(1);

  protected readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const estado = this.filtroEstado();
    return this.productos().filter(
      (p) =>
        (!texto || p.nombre.toLowerCase().includes(texto)) &&
        (estado === 'todos' || (estado === 'activo') === !!p.esActivo),
    );
  });
  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.filtrados().length / POR_PAGINA)));
  protected readonly paginas = computed(() => Array.from({ length: this.totalPaginas() }, (_, i) => i + 1));
  protected readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  protected readonly visibles = computed(() => {
    const inicio = (this.paginaActual() - 1) * POR_PAGINA;
    return this.filtrados().slice(inicio, inicio + POR_PAGINA);
  });

  // Formulario (alta / edición)
  protected readonly formAbierto = signal(false);
  protected readonly enEdicion = signal<ProductoDTO | null>(null);

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.api.listar().subscribe({
      next: (lista) => {
        this.productos.set([...lista].sort((a, b) => (b.creadoEn ?? '').localeCompare(a.creadoEn ?? '')));
        this.cargando.set(false);
      },
      error: () => {
        this.errorCarga.set('No se pudo cargar el catálogo de productos.');
        this.cargando.set(false);
      },
    });
  }

  protected buscar(texto: string): void {
    this.busqueda.set(texto);
    this.pagina.set(1);
  }
  protected cambiarEstado(evento: Event): void {
    this.filtroEstado.set((evento.target as HTMLSelectElement).value as FiltroEstado);
    this.pagina.set(1);
  }
  protected irAPagina(n: number): void {
    this.pagina.set(Math.min(Math.max(1, n), this.totalPaginas()));
  }

  protected abrirNuevo(): void {
    this.enEdicion.set(null);
    this.formAbierto.set(true);
  }
  protected abrirEditar(producto: ProductoDTO): void {
    this.enEdicion.set(producto);
    this.formAbierto.set(true);
  }
  protected alGuardar(guardado: ProductoDTO): void {
    const edicion = this.enEdicion();
    this.productos.update((lista) =>
      edicion ? lista.map((p) => (p.id === guardado.id ? { ...p, ...guardado } : p)) : [guardado, ...lista],
    );
    this.formAbierto.set(false);
  }
}
