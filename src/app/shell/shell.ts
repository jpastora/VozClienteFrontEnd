import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { EmpresaApi } from '../core/empresa-api';
import { EmpresaDTO } from '../core/models';
import { RUTAS } from '../core/rutas';
import { RolInfo } from '../interfaces/usuario';
import { SessionService } from '../services/session';
import { LogoComponent } from '../shared/logo/logo.component';

interface OpcionMenu {
  ruta: string;
  texto: string;
  roles: RolInfo[];
}

/**
 * Opciones del menú lateral y los perfiles que las ven
 * (Tabla 5 del informe de diseño).
 */
const OPCIONES_MENU: OpcionMenu[] = [
  { ruta: RUTAS.panelGlobal, texto: 'Panel global', roles: ['ADMINISTRADOR'] },
  { ruta: RUTAS.inicio, texto: 'Inicio', roles: ['CLIENTE_ADMINISTRADOR'] },
  { ruta: RUTAS.productos, texto: 'Productos', roles: ['CLIENTE_ADMINISTRADOR', 'ADMINISTRADOR'] },
  { ruta: RUTAS.representantes, texto: 'Representantes', roles: ['CLIENTE_ADMINISTRADOR', 'ADMINISTRADOR'] },
  { ruta: RUTAS.entrevistas, texto: 'Entrevistas', roles: ['CLIENTE_ADMINISTRADOR', 'ADMINISTRADOR'] },
  { ruta: RUTAS.salas, texto: 'Salas', roles: [ 'REPRESENTANTE'] },
  { ruta: RUTAS.reportes, texto: 'Estadísticas', roles: ['CLIENTE_ADMINISTRADOR', 'ADMINISTRADOR'] },
  { ruta: RUTAS.paquetes, texto: 'Paquetes y saldo', roles: ['CLIENTE_ADMINISTRADOR', 'ADMINISTRADOR'] },
  { ruta: RUTAS.empresas, texto: 'Empresas', roles: ['ADMINISTRADOR'] },
  { ruta: RUTAS.admin, texto: 'Usuarios', roles: ['ADMINISTRADOR'] },
];

/** Pantallas del administrador de la plataforma que no dependen de una empresa elegida. */
const RUTAS_SIN_EMPRESA: string[] = [RUTAS.panelGlobal, RUTAS.empresas, RUTAS.admin, RUTAS.paquetes, RUTAS.recargar];

const NOMBRES_ROL: Record<RolInfo, string> = {
  ADMINISTRADOR: 'Administrador de la plataforma',
  CLIENTE_ADMINISTRADOR: 'Cliente-administrador',
  REPRESENTANTE: 'Representante',
};

/**
 * Estructura de la aplicación con sesión:
 * menú lateral por perfil y cierre de sesión (HU-01).
 */
@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LogoComponent],
  selector: 'vc-shell',
  styleUrl: './shell.css',
  templateUrl: './shell.html',
})
export class Shell {

  private readonly sesion = inject(SessionService);

  private readonly router = inject(Router);
  private readonly empresaApi = inject(EmpresaApi);

  protected readonly usuario = this.sesion.usuario;

  /** Solo el administrador de la plataforma elige empresa (modo soporte). */
  protected readonly esAdministrador = computed(() => this.usuario()?.rol === 'ADMINISTRADOR');

  protected readonly empresas = signal<EmpresaDTO[]>([]);
  protected readonly errorEmpresas = signal(false);
  protected readonly empresaId = this.sesion.empresaId;

  private readonly urlActual = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** El administrador abrió un módulo de empresa sin haber elegido cuál atender. */
  protected readonly requiereElegirEmpresa = computed(() => {
    if (!this.esAdministrador() || this.empresaId() !== null) return false;
    const ruta = this.urlActual().split(/[?#]/)[0];
    return !RUTAS_SIN_EMPRESA.some((libre) => ruta === libre || ruta.startsWith(`${libre}/`));
  });

  /** Rutas absolutas para los enlaces de la plantilla. */
  protected readonly rutas = RUTAS;

  /**
   * Muestra únicamente las opciones permitidas
   * para el perfil autenticado.
   */
  protected readonly opciones = computed(() => {
    const rol = this.usuario()?.rol;

    return rol
      ? OPCIONES_MENU.filter((opcion) =>
          opcion.roles.includes(rol)
        )
      : [];
  });

  /**
   * Obtiene el nombre descriptivo del rol.
   */
  protected readonly nombreRol = computed(() => {
    const rol = this.usuario()?.rol;

    return rol ? NOMBRES_ROL[rol] : '';
  });

  constructor() {
    // Carga la lista al entrar y de nuevo cuando se crea o renombra una empresa.
    effect(() => {
      this.empresaApi.cambios();
      if (this.sesion.usuario()?.rol === 'ADMINISTRADOR') {
        this.cargarEmpresas();
      }
    });
  }

  protected cargarEmpresas(): void {
    this.errorEmpresas.set(false);
    this.empresaApi.listar().subscribe({
      next: (lista) => {
        this.empresas.set([...lista].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        // Si la empresa guardada ya no existe, se quita la selección.
        const elegida = this.sesion.empresaId();
        if (elegida !== null && !lista.some((e) => e.id === elegida)) {
          this.sesion.seleccionarEmpresa(null);
        }
      },
      error: () => this.errorEmpresas.set(true),
    });
  }

  protected elegirEmpresa(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.sesion.seleccionarEmpresa(valor ? Number(valor) : null);
    this.recargarPantalla();
  }

  /** Vuelve a crear la pantalla actual para que traiga los datos de la empresa recién elegida. */
  private recargarPantalla(): void {
    const url = this.router.url;
    this.router
      .navigateByUrl(RUTAS.recargar, { skipLocationChange: true })
      .then(() => this.router.navigateByUrl(url));
  }

  /**
   * Cierra la sesión y vuelve a la pantalla de ingreso.
   */
  protected salir(): void {
    void this.sesion.salir();
  }
}