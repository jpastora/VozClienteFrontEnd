import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, output, signal } from '@angular/core';
import { Badge } from '../../badge/badge';
import { Button } from '../../button/button';
import { PaqueteDTO, PaqueteRequest } from '../../core/models';
import { PaqueteApi } from '../../core/paquete-api';
import { Dialog } from '../../dialog/dialog';
import { Field } from '../../field/field';

const LARGO_MAXIMO_NOMBRE = 50;
const PATRON_PRECIO = /^\d+(\.\d{1,2})?$/;

/**
 * Gestión de los paquetes de salas para el administrador de la plataforma (RF-17): crear,
 * editar nombre, salas y precio, activar o desactivar, y eliminar los que nunca se vendieron.
 * Las mismas reglas se validan en el back-end.
 */
@Component({
  imports: [Badge, Button, CurrencyPipe, Dialog, Field],
  selector: 'vc-paquetes-admin',
  styleUrl: './paquetes-admin.css',
  templateUrl: './paquetes-admin.html',
})
export class PaquetesAdmin {
  private readonly api = inject(PaqueteApi);

  /** Avisa al catálogo que hubo cambios, para que se recargue. */
  readonly cambio = output<void>();

  protected readonly paquetes = signal<PaqueteDTO[]>([]);

  /** Los inactivos se ocultan por defecto para que la tabla muestre lo que se ofrece hoy. */
  protected readonly mostrarInactivos = signal(false);
  protected readonly cantidadInactivos = computed(() => this.paquetes().filter((p) => !p.esActivo).length);
  protected readonly visibles = computed(() =>
    this.mostrarInactivos() ? this.paquetes() : this.paquetes().filter((p) => p.esActivo),
  );
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);

  // Formulario de crear o editar
  /** null: cerrado; 'nuevo': crear; un paquete: editar ese paquete. */
  protected readonly editando = signal<PaqueteDTO | 'nuevo' | null>(null);
  protected readonly nombre = signal('');
  protected readonly salas = signal('');
  protected readonly precio = signal('');
  protected readonly guardando = signal(false);
  protected readonly errorFormulario = signal<string | null>(null);
  private readonly intento = signal(false);

  // Acciones por fila
  protected readonly ocupado = signal<number | null>(null);
  protected readonly porEliminar = signal<PaqueteDTO | null>(null);

  protected readonly tituloFormulario = computed(() =>
    this.editando() === 'nuevo' ? 'Nuevo paquete' : 'Editar paquete',
  );

  protected readonly errorNombre = computed(() => {
    if (!this.intento()) return null;
    const valor = this.nombre().trim();
    if (!valor) return 'El nombre es obligatorio.';
    if (valor.length > LARGO_MAXIMO_NOMBRE) return `Máximo ${LARGO_MAXIMO_NOMBRE} caracteres.`;
    return null;
  });

  protected readonly errorSalas = computed(() => {
    if (!this.intento()) return null;
    const valor = this.salas().trim();
    return /^\d+$/.test(valor) && Number(valor) >= 1 ? null : 'Escribe un número entero de 1 o más.';
  });

  protected readonly errorPrecio = computed(() => {
    if (!this.intento()) return null;
    return PATRON_PRECIO.test(this.precio().trim())
      ? null
      : 'Escribe un precio de 0 o más, con dos decimales como máximo (por ejemplo 150 o 150.50).';
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api.listarTodos().subscribe({
      next: (lista) => {
        this.paquetes.set([...lista].sort((a, b) => a.precio - b.precio));
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los paquetes.');
        this.cargando.set(false);
      },
    });
  }

  protected nuevo(): void {
    this.abrir('nuevo', '', '', '');
  }

  protected editar(paquete: PaqueteDTO): void {
    this.abrir(paquete, paquete.nombre, String(paquete.cantidadSalas), String(paquete.precio));
  }

  private abrir(destino: PaqueteDTO | 'nuevo', nombre: string, salas: string, precio: string): void {
    this.nombre.set(nombre);
    this.salas.set(salas);
    this.precio.set(precio);
    this.intento.set(false);
    this.errorFormulario.set(null);
    this.aviso.set(null);
    this.editando.set(destino);
  }

  protected cerrar(): void {
    if (!this.guardando()) this.editando.set(null);
  }

  protected guardar(): void {
    const destino = this.editando();
    if (destino === null) return;
    this.intento.set(true);
    if (this.errorNombre() || this.errorSalas() || this.errorPrecio()) return;

    const datos: PaqueteRequest = {
      nombre: this.nombre().trim().replace(/\s+/g, ' '),
      cantidadSalas: Number(this.salas().trim()),
      precio: Number(this.precio().trim()),
    };
    const peticion = destino === 'nuevo' ? this.api.crear(datos) : this.api.actualizar(destino.id, datos);

    this.guardando.set(true);
    this.errorFormulario.set(null);
    peticion.subscribe({
      next: (guardado) => {
        this.guardando.set(false);
        this.editando.set(null);
        this.aviso.set(
          destino === 'nuevo'
            ? `Se creó el paquete «${guardado.nombre}».`
            : `Se guardaron los cambios de «${guardado.nombre}». Las compras anteriores no cambian.`,
        );
        this.cargar();
        this.cambio.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.errorFormulario.set(err?.error?.mensaje ?? 'No se pudo guardar el paquete. Intenta de nuevo.');
      },
    });
  }

  /** Activa o desactiva: desactivar deja de ofrecerlo, pero quien lo compró conserva su saldo. */
  protected cambiarEstado(paquete: PaqueteDTO): void {
    const peticion = paquete.esActivo ? this.api.desactivar(paquete.id) : this.api.activar(paquete.id);
    this.ocupado.set(paquete.id);
    this.error.set(null);
    this.aviso.set(null);
    peticion.subscribe({
      next: () => {
        this.ocupado.set(null);
        this.aviso.set(
          paquete.esActivo
            ? `«${paquete.nombre}» ya no se ofrece. Las empresas que lo compraron conservan su saldo.`
            : `«${paquete.nombre}» vuelve a estar disponible en el catálogo.`,
        );
        this.cargar();
        this.cambio.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.ocupado.set(null);
        this.error.set(err?.error?.mensaje ?? 'No se pudo cambiar el estado del paquete.');
      },
    });
  }

  protected alternarInactivos(evento: Event): void {
    this.mostrarInactivos.set((evento.target as HTMLInputElement).checked);
  }

  /** Marca el paquete como el recomendado del catálogo, o le quita la marca. Solo hay uno. */
  protected alternarRecomendado(paquete: PaqueteDTO): void {
    const peticion = paquete.esRecomendado
      ? this.api.quitarRecomendado(paquete.id)
      : this.api.recomendar(paquete.id);
    this.ocupado.set(paquete.id);
    this.error.set(null);
    this.aviso.set(null);
    peticion.subscribe({
      next: () => {
        this.ocupado.set(null);
        this.aviso.set(
          paquete.esRecomendado
            ? `«${paquete.nombre}» ya no se muestra como recomendado.`
            : `«${paquete.nombre}» es ahora el paquete recomendado.`,
        );
        this.cargar();
        this.cambio.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.ocupado.set(null);
        this.error.set(err?.error?.mensaje ?? 'No se pudo cambiar el paquete recomendado.');
      },
    });
  }

  protected pedirEliminar(paquete: PaqueteDTO): void {
    this.aviso.set(null);
    this.error.set(null);
    this.porEliminar.set(paquete);
  }

  protected cancelarEliminar(): void {
    if (this.ocupado() === null) this.porEliminar.set(null);
  }

  protected eliminar(): void {
    const paquete = this.porEliminar();
    if (!paquete) return;
    this.ocupado.set(paquete.id);
    this.api.eliminar(paquete.id).subscribe({
      next: () => {
        this.ocupado.set(null);
        this.porEliminar.set(null);
        this.aviso.set(`Se eliminó el paquete «${paquete.nombre}».`);
        this.cargar();
        this.cambio.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.ocupado.set(null);
        this.porEliminar.set(null);
        this.error.set(err?.error?.mensaje ?? 'No se pudo eliminar el paquete.');
      },
    });
  }
}
