import { Component, computed, effect, inject, input, model, signal, untracked } from '@angular/core';
import { Button } from '../button/button';
import { CUENTA_ID_PRUEBA } from '../core/config';
import { GuiaApi } from '../core/guia-api';
import { GuiaDTO } from '../core/models';
import { Dialog } from '../dialog/dialog';
import { Field } from '../field/field';
import { SessionService } from '../services/session';

type Vista = 'lista' | 'editor';

const MAX_TITULO = 150;

/**
 * Selector de guía de preguntas + diálogo para crear, editar y eliminar guías de la empresa.
 * Se coloca junto al selector de representante. La guía elegida viaja en `guiaId` (null = sin guía).
 */
@Component({
  imports: [Button, Dialog, Field],
  selector: 'vc-guia-preguntas',
  styleUrl: './guia-preguntas.css',
  templateUrl: './guia-preguntas.html',
})
export class GuiaPreguntas {
  private readonly api = inject(GuiaApi);
  private readonly sesion = inject(SessionService);

  /** Empresa dueña de las guías (la del producto). */
  readonly empresaId = input<number | null | undefined>(null);
  /** Guía elegida; se emite `guiaIdChange` cuando cambia. */
  readonly guiaId = model<number | null>(null);

  protected readonly maxTitulo = MAX_TITULO;
  protected readonly guias = signal<GuiaDTO[]>([]);
  protected readonly cargando = signal(false);
  protected readonly errorLista = signal<string | null>(null);

  protected readonly abierto = signal(false);
  protected readonly vista = signal<Vista>('lista');
  protected readonly editando = signal<GuiaDTO | null>(null);
  protected readonly titulo = signal('');
  protected readonly preguntas = signal<string[]>(['']);
  protected readonly intento = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorGuardar = signal<string | null>(null);
  protected readonly confirmandoId = signal<number | null>(null);
  protected readonly eliminando = signal(false);

  protected readonly seleccionada = computed(() => this.guias().find((g) => g.id === this.guiaId()) ?? null);

  protected readonly tituloDialogo = computed(() =>
    this.vista() === 'lista' ? 'Guías de preguntas' : this.editando() ? 'Editar guía' : 'Nueva guía',
  );

  protected readonly errorTitulo = computed<string | null>(() => {
    if (!this.intento()) return null;
    const v = this.titulo().trim();
    if (!v) return 'El título es obligatorio.';
    if (v.length > MAX_TITULO) return `Máximo ${MAX_TITULO} caracteres.`;
    return null;
  });

  protected readonly errorPreguntas = computed<string | null>(() =>
    this.intento() && !this.preguntas().some((p) => p.trim()) ? 'Agrega al menos una pregunta.' : null,
  );

  constructor() {
    // Carga las guías cuando se conoce la empresa.
    effect(() => {
      const empresa = this.empresaId();
      if (empresa == null) return;
      untracked(() => this.cargar(empresa));
    });
  }

  private cargar(empresaId: number): void {
    this.cargando.set(true);
    this.errorLista.set(null);
    this.api.listarPorEmpresa(empresaId).subscribe({
      next: (lista) => {
        this.guias.set(lista);
        this.cargando.set(false);
        // Si la guía recordada ya no existe, se deja el selector en "Sin guía".
        const actual = this.guiaId();
        if (actual != null && !lista.some((g) => g.id === actual)) this.guiaId.set(null);
      },
      error: () => {
        this.cargando.set(false);
        this.errorLista.set('No se pudieron cargar las guías.');
      },
    });
  }

  // ---------- Selector ----------
  protected cambiarSeleccion(e: Event): void {
    const v = (e.target as HTMLSelectElement).value;
    this.guiaId.set(v ? Number(v) : null);
  }

  // ---------- Diálogo ----------
  protected abrir(): void {
    this.vista.set('lista');
    this.confirmandoId.set(null);
    this.abierto.set(true);
  }

  protected cerrar(): void {
    if (this.guardando() || this.eliminando()) return;
    this.abierto.set(false);
  }

  protected nueva(): void {
    this.editando.set(null);
    this.titulo.set('');
    this.preguntas.set(['']);
    this.reiniciarEditor();
  }

  protected editar(g: GuiaDTO): void {
    this.editando.set(g);
    this.titulo.set(g.titulo);
    this.preguntas.set(g.preguntas.length ? [...g.preguntas] : ['']);
    this.reiniciarEditor();
  }

  private reiniciarEditor(): void {
    this.intento.set(false);
    this.errorGuardar.set(null);
    this.vista.set('editor');
  }

  protected volverALista(): void {
    if (!this.guardando()) this.vista.set('lista');
  }

  // ---------- Preguntas ----------
  protected cambiarPregunta(i: number, e: Event): void {
    const v = (e.target as HTMLInputElement).value;
    this.preguntas.update((l) => l.map((p, idx) => (idx === i ? v : p)));
  }

  protected agregarPregunta(): void {
    this.preguntas.update((l) => [...l, '']);
  }

  protected quitarPregunta(i: number): void {
    this.preguntas.update((l) => (l.length > 1 ? l.filter((_, idx) => idx !== i) : ['']));
  }

  protected mover(i: number, delta: -1 | 1): void {
    const j = i + delta;
    this.preguntas.update((l) => {
      if (j < 0 || j >= l.length) return l;
      const copia = [...l];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  }

  protected cambiarTitulo(valor: string): void {
    this.titulo.set(valor);
  }

  // ---------- Guardar y eliminar ----------
  protected guardar(): void {
    this.intento.set(true);
    if (this.errorTitulo() || this.errorPreguntas()) return;

    const empresaId = this.empresaId();
    if (empresaId == null) {
      this.errorGuardar.set('No se pudo determinar la empresa del producto.');
      return;
    }

    const original = this.editando();
    const dto: GuiaDTO = {
      titulo: this.titulo().trim(),
      preguntas: this.preguntas().map((p) => p.trim()).filter(Boolean),
      empresaId,
      cuentaId: original?.cuentaId ?? this.sesion.usuario()?.id ?? CUENTA_ID_PRUEBA,
    };

    this.guardando.set(true);
    this.errorGuardar.set(null);
    const peticion = original?.id != null ? this.api.actualizar(original.id, dto) : this.api.crear(dto);
    peticion.subscribe({
      next: (g) => {
        this.guardando.set(false);
        this.guias.update((lista) =>
          original?.id != null ? lista.map((x) => (x.id === g.id ? g : x)) : [...lista, g],
        );
        // Una guía recién creada queda elegida para el próximo enlace.
        if (original?.id == null && g.id != null) this.guiaId.set(g.id);
        this.vista.set('lista');
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorGuardar.set(
          err.status === 403
            ? 'No tiene permisos para gestionar guías.'
            : (err.error?.mensaje ?? 'No se pudo guardar la guía. Intente nuevamente.'),
        );
      },
    });
  }

  protected pedirEliminar(g: GuiaDTO): void {
    this.errorLista.set(null);
    this.confirmandoId.set(g.id ?? null);
  }

  protected cancelarEliminar(): void {
    this.confirmandoId.set(null);
  }

  protected eliminar(g: GuiaDTO): void {
    if (g.id == null) return;
    this.eliminando.set(true);
    this.errorLista.set(null);
    this.api.eliminar(g.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.confirmandoId.set(null);
        this.guias.update((lista) => lista.filter((x) => x.id !== g.id));
        if (this.guiaId() === g.id) this.guiaId.set(null);
      },
      error: () => {
        this.eliminando.set(false);
        this.errorLista.set('No se pudo eliminar la guía.');
      },
    });
  }
}

