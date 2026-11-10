import { Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { inject } from '@angular/core';
import { Button } from '../button/button';
import { ProductoDTO, ProductoRequest } from '../core/models';
import { ProductoApi } from '../core/producto-api';
import { Dialog } from '../dialog/dialog';
import { Field } from '../field/field';

const MAX_DESCRIPCION = 500;

/** Diálogo de alta y edición de productos. Sin `producto` crea; con `producto` edita. */
@Component({
  imports: [Button, Dialog, Field],
  selector: 'vc-producto-form',
  styleUrl: './product-form.css',
  templateUrl: './product-form.html',
})
export class ProductForm {
  private readonly api = inject(ProductoApi);

  readonly open = input(false);
  readonly producto = input<ProductoDTO | null>(null);
  /** Productos de la empresa: sirve para detectar nombres repetidos y sugerir categorías. */
  readonly existentes = input<ProductoDTO[]>([]);
  readonly closed = output<void>();
  readonly guardado = output<ProductoDTO>();

  protected readonly maxDescripcion = MAX_DESCRIPCION;
  protected readonly nombre = signal('');
  protected readonly categoria = signal('');
  protected readonly descripcion = signal('');
  protected readonly esActivo = signal(true);
  protected readonly intento = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorGuardar = signal<string | null>(null);

  protected readonly titulo = computed(() => (this.producto() ? 'Editar producto' : 'Nuevo producto'));
  protected readonly categorias = computed(() => [
    ...new Set(this.existentes().map((p) => p.categoria?.trim()).filter((c): c is string => !!c)),
  ]);

  protected readonly errorNombre = computed<string | null>(() => {
    if (!this.intento()) return null;
    const valor = this.nombre().trim();
    if (!valor) return 'El nombre es obligatorio.';
    if (valor.length > 100) return 'Máximo 100 caracteres.';
    const repetido = this.existentes().some(
      (p) => p.id !== this.producto()?.id && p.nombre.trim().toLowerCase() === valor.toLowerCase(),
    );
    return repetido ? 'Ya existe un producto con este nombre en su empresa.' : null;
  });
  protected readonly errorCategoria = computed<string | null>(() =>
    this.intento() && this.categoria().trim().length > 60 ? 'Máximo 60 caracteres.' : null,
  );
  protected readonly errorDescripcion = computed<string | null>(() =>
    this.intento() && this.descripcion().length > MAX_DESCRIPCION ? `Máximo ${MAX_DESCRIPCION} caracteres.` : null,
  );

  constructor() {
    // Cada vez que se abre, el formulario parte de los datos del producto (o vacío).
    effect(() => {
      if (!this.open()) return;
      untracked(() => {
        const p = this.producto();
        this.nombre.set(p?.nombre ?? '');
        this.categoria.set(p?.categoria ?? '');
        this.descripcion.set(p?.descripcion ?? '');
        this.esActivo.set(p?.esActivo ?? true);
        this.intento.set(false);
        this.errorGuardar.set(null);
      });
    });
  }

  protected cerrar(): void {
    if (!this.guardando()) this.closed.emit();
  }
  protected cambiarCategoria(e: Event): void {
    this.categoria.set((e.target as HTMLInputElement).value);
  }
  protected cambiarDescripcion(e: Event): void {
    this.descripcion.set((e.target as HTMLTextAreaElement).value);
  }
  protected cambiarActivo(e: Event): void {
    this.esActivo.set((e.target as HTMLSelectElement).value === 'activo');
  }

  protected guardar(): void {
    this.intento.set(true);
    if (this.errorNombre() || this.errorCategoria() || this.errorDescripcion()) return;

    const original = this.producto();
    const dto: ProductoRequest = {
      nombre: this.nombre().trim(),
      categoria: this.categoria().trim() || null,
      descripcion: this.descripcion().trim() || null,
      esActivo: this.esActivo(),
    };

    this.guardando.set(true);
    this.errorGuardar.set(null);
    const peticion = original?.id != null ? this.api.actualizar(original.id, dto) : this.api.crear(dto);
    peticion.subscribe({
      next: (guardado) => {
        this.guardando.set(false);
        this.guardado.emit(guardado);
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorGuardar.set(err?.error?.mensaje ?? 'No se pudo guardar el producto. Intenta de nuevo.');
      },
    });
  }
}
