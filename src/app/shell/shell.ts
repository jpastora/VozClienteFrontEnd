import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RolInfo } from '../interfaces/usuario';
import { SessionService } from '../services/session';

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
  {
    ruta: '/productos',
    texto: 'Productos',
    roles: ['CLIENTE_ADMINISTRADOR'],
  },
  {
    ruta: '/salas',
    texto: 'Salas',
    roles: ['CLIENTE_ADMINISTRADOR', 'REPRESENTANTE'],
  },
  {
    ruta: '/entrevistas',
    texto: 'Entrevistas',
    roles: ['CLIENTE_ADMINISTRADOR'],
  },
  {
    ruta: '/reportes',
    texto: 'Estadísticas',
    roles: ['CLIENTE_ADMINISTRADOR'],
  },
  {
    ruta: '/paquetes',
    texto: 'Paquetes y saldo',
    roles: ['CLIENTE_ADMINISTRADOR', 'ADMINISTRADOR'],
  },
  {
    ruta: '/admin',
    texto: 'Administración',
    roles: ['ADMINISTRADOR'],
  },
];

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
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'vc-shell',
  styleUrl: './shell.css',
  templateUrl: './shell.html',
})
export class Shell {

  private readonly sesion = inject(SessionService);

  protected readonly usuario = this.sesion.usuario;

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

  /**
   * Cierra la sesión y vuelve a la pantalla de ingreso.
   */
  protected salir(): void {
    void this.sesion.salir();
  }
}
