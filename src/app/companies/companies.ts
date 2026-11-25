import { ConfirmarEliminar } from '../shared/confirmar-eliminar/confirmar-eliminar';
import { mensajeServidor } from '../core/errores';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Button } from '../button/button';
import { EmpresaApi } from '../core/empresa-api';
import { EmpresaDTO } from '../core/models';
import { Dialog } from '../dialog/dialog';
import { Field } from '../field/field';

const MIN_NOMBRE = 2;
const MAX_NOMBRE = 150;

/** Empresas clientes de la plataforma: el administrador las crea y puede corregir su nombre. */
@Component({
  imports: [Button, DatePipe, Dialog, Field, ConfirmarEliminar],
  selector: 'vc-companies',
  styleUrl: './companies.css',
  templateUrl: './companies.html',
})
export class Companies {
  private readonly api = inject(EmpresaApi);

  protected readonly empresas = signal<EmpresaDTO[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);

  protected readonly busqueda = signal('');
  protected readonly filtradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    return this.empresas().filter((e) => !texto || e.nombre.toLowerCase().includes(texto));
  });

  // Alta y edición comparten el diálogo: `editando` es la empresa que se renombra, o null si es nueva.
  protected readonly formAbierto = signal(false);
  protected readonly editando = signal<EmpresaDTO | null>(null);
  protected readonly nombre = signal('');
  protected readonly intento = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorGuardar = signal<string | null>(null);

  protected readonly errorNombre = computed<string | null>(() => {
    if (!this.intento()) return null;
    const valor = this.nombre().trim();
    if (!valor) return 'El nombre de la empresa es obligatorio.';
    if (valor.length < MIN_NOMBRE) return `Mínimo ${MIN_NOMBRE} caracteres.`;
    if (valor.length > MAX_NOMBRE) return `Máximo ${MAX_NOMBRE} caracteres.`;
    const propio = this.editando()?.id;
    if (this.empresas().some((e) => e.id !== propio && e.nombre.trim().toLowerCase() === valor.toLowerCase())) {
      return 'Ya existe una empresa con este nombre.';
    }
    return null;
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.api.listar().subscribe({
      next: (lista) => {
        this.empresas.set(this.ordenar(lista));
        this.cargando.set(false);
      },
      error: () => {
        this.errorCarga.set('No se pudo cargar la lista de empresas.');
        this.cargando.set(false);
      },
    });
  }

  private ordenar(lista: EmpresaDTO[]): EmpresaDTO[] {
    return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  protected abrirNueva(): void {
    this.editando.set(null);
    this.nombre.set('');
    this.intento.set(false);
    this.errorGuardar.set(null);
    this.formAbierto.set(true);
  }

  protected abrirEdicion(empresa: EmpresaDTO): void {
    this.editando.set(empresa);
    this.nombre.set(empresa.nombre);
    this.intento.set(false);
    this.errorGuardar.set(null);
    this.formAbierto.set(true);
  }

  protected cerrarForm(): void {
    if (!this.guardando()) this.formAbierto.set(false);
  }

  protected guardar(): void {
    this.intento.set(true);
    if (this.errorNombre()) return;

    const nombre = this.nombre().trim();
    const empresa = this.editando();
    this.guardando.set(true);
    this.errorGuardar.set(null);

    const llamada = empresa ? this.api.renombrar(empresa.id, nombre) : this.api.crear(nombre);
    llamada.subscribe({
      next: (guardada) => {
        this.empresas.update((lista) =>
          this.ordenar(empresa ? lista.map((e) => (e.id === guardada.id ? guardada : e)) : [...lista, guardada]),
        );
        this.guardando.set(false);
        this.formAbierto.set(false);
        this.aviso.set(empresa ? `Empresa «${guardada.nombre}» actualizada.` : `Empresa «${guardada.nombre}» creada.`);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.errorGuardar.set(
          err.status === 403
            ? 'No tienes permiso para gestionar empresas.'
            : 'No se pudo guardar la empresa. Intenta de nuevo.',
        );
      },
    });
  }

  // --- Eliminar (solo si no tiene datos relacionados) ---

  protected readonly porEliminar = signal<EmpresaDTO | null>(null);
  protected readonly eliminando = signal(false);
  protected readonly errorEliminar = signal<string | null>(null);

  protected pedirEliminar(registro: EmpresaDTO): void {
    this.errorEliminar.set(null);
    this.porEliminar.set(registro);
  }

  protected cancelarEliminar(): void {
    if (!this.eliminando()) this.porEliminar.set(null);
  }

  protected confirmarEliminar(): void {
    const registro = this.porEliminar();
    if (!registro || this.eliminando()) return;
    this.eliminando.set(true);
    this.errorEliminar.set(null);
    this.api.eliminar(registro.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.porEliminar.set(null);
        this.empresas.update((lista) => lista.filter((e) => e.id !== registro.id));
        this.aviso.set(`Empresa «${registro.nombre}» eliminada.`);
      },
      error: (err: HttpErrorResponse) => {
        this.eliminando.set(false);
        this.errorEliminar.set(
          mensajeServidor(err) ??
            (err.status === 404
              ? 'El registro ya no existe. Actualiza la lista.'
              : 'No se pudo eliminar. Intenta de nuevo.'),
        );
      },
    });
  }
}
