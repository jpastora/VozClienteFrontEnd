import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';

import {
  ActivatedRoute,
  RouterLink
} from '@angular/router';

import { Subscription } from 'rxjs';

import {
  EntrevistaDetalleDTO,
  FragmentoTranscripcionDTO
} from '../core/models';

import { EntrevistaApi } from '../core/entrevista-api';
import { RUTAS } from '../core/rutas';

type PestanaDetalle = 'transcripcion' | 'fragmentos';

interface FragmentoVisual {
  id: number;
  segundoInicio: number;
  segundoFin: number;
  texto: string;
  destacado: boolean;
}

interface CompetidorVisual {
  nombre: string;
  frecuencia: number;
}

interface DetalleVisual {
  entrevista: EntrevistaDetalleDTO;
  intencion: string | null;
  sentimiento: string | null;
  fragmentoApoyo: string | null;
  fragmentos: FragmentoVisual[];
  competidores: CompetidorVisual[];
}

@Component({
  selector: 'vc-interview-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './interview-detail.html',
  styleUrl: './interview-detail.css'
})
export class InterviewDetail implements OnInit, OnDestroy {

  private readonly route = inject(ActivatedRoute);
  private readonly entrevistaApi = inject(EntrevistaApi);

  /** Rutas absolutas para los enlaces de la plantilla. */
  protected readonly rutas = RUTAS;

  private suscripcion?: Subscription;

  // ==========================================
  // ESTADO DE LA PANTALLA
  // ==========================================

  protected readonly pestana =
    signal<PestanaDetalle>('transcripcion');

  protected readonly cargando = signal(true);

  protected readonly error = signal<string | null>(null);

  protected readonly entrevista =
    signal<EntrevistaDetalleDTO | null>(null);

  protected readonly entrevistaId = signal(0);

  // ==========================================
  // DATOS PARA LA INTERFAZ
  // ==========================================

  protected readonly detalle = computed<DetalleVisual | null>(() => {

    const entrevista = this.entrevista();

    if (!entrevista) {
      return null;
    }

    const analisis = entrevista.analisis;

    const fragmentos = (entrevista.fragmentos ?? []).map(
      (fragmento: FragmentoTranscripcionDTO): FragmentoVisual => ({
        id: fragmento.id,
        segundoInicio: fragmento.segundoInicio,
        segundoFin: fragmento.segundoFin,
        texto: fragmento.texto,
        destacado: this.esFragmentoDestacado(
          fragmento.texto,
          analisis?.fragmentoApoyo ?? null
        )
      })
    );

    const competidores: CompetidorVisual[] = (
      analisis?.competidores ?? []
    ).map((mencion) => ({
      nombre: mencion.competidor,
      frecuencia: mencion.frecuencia
    }));

    return {
      entrevista,
      intencion: this.formatearIntencion(
        analisis?.intencion ?? null
      ),
      sentimiento: analisis?.sentimiento ?? null,
      fragmentoApoyo: analisis?.fragmentoApoyo ?? null,
      fragmentos,
      competidores
    };
  });

  // ==========================================
  // CICLO DE VIDA
  // ==========================================

  ngOnInit(): void {

    this.suscripcion = this.route.paramMap.subscribe(
      (parametros) => {

        const id = Number(parametros.get('id'));

        if (!Number.isInteger(id) || id <= 0) {
          this.entrevistaId.set(0);
          this.entrevista.set(null);
          this.cargando.set(false);
          this.error.set('Identificador de entrevista inválido.');
          return;
        }

        this.entrevistaId.set(id);

        this.cargarEntrevista(id);
      }
    );
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
  }

  // ==========================================
  // CONSULTAR BACKEND
  // ==========================================

  protected cargarEntrevista(id: number): void {

    this.cargando.set(true);
    this.error.set(null);
    this.entrevista.set(null);
    this.pestana.set('transcripcion');

    this.entrevistaApi.obtenerDetalle(id).subscribe({

      next: (respuesta) => {

        if (this.entrevistaId() !== id) {
          return;
        }

        this.entrevista.set(respuesta);
        this.cargando.set(false);
      },

      error: (error) => {

        if (this.entrevistaId() !== id) {
          return;
        }

        console.error(
          'Error al consultar detalle de entrevista:',
          error
        );

        this.entrevista.set(null);
        this.cargando.set(false);

        if (error.status === 404) {
          this.error.set(
            'La entrevista solicitada no existe o no está disponible.'
          );
        } else if (error.status === 401) {
          this.error.set(
            'Tu sesión ha expirado. Inicia sesión nuevamente.'
          );
        } else if (error.status === 403) {
          this.error.set(
            'No tienes permisos para consultar esta entrevista.'
          );
        } else {
          this.error.set(
            'No fue posible cargar el detalle de la entrevista.'
          );
        }
      }
    });
  }

  // ==========================================
  // PESTAÑAS
  // ==========================================

  protected cambiarPestana(
    pestana: PestanaDetalle
  ): void {
    this.pestana.set(pestana);
  }

  // ==========================================
  // FRAGMENTOS DESTACADOS
  // ==========================================

  private esFragmentoDestacado(
    texto: string,
    fragmentoApoyo: string | null
  ): boolean {

    if (!fragmentoApoyo || !texto) {
      return false;
    }

    const normalizar = (valor: string): string =>
      valor
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const textoNormalizado = normalizar(texto);
    const apoyoNormalizado = normalizar(fragmentoApoyo);

    if (!textoNormalizado || !apoyoNormalizado) {
      return false;
    }

    return (
      textoNormalizado.includes(apoyoNormalizado) ||
      apoyoNormalizado.includes(textoNormalizado)
    );
  }

  // ==========================================
  // FORMATO DE INFORMACIÓN
  // ==========================================

  protected formatearTiempo(
    segundos: number
  ): string {

    if (!Number.isFinite(segundos) || segundos < 0) {
      return '—';
    }

    const totalSegundos = Math.floor(segundos);

    const minutos = Math.floor(totalSegundos / 60);
    const restantes = totalSegundos % 60;

    return `${minutos.toString().padStart(2, '0')}:${restantes
      .toString()
      .padStart(2, '0')}`;
  }

  protected formatearFecha(
    fecha: string | null
  ): string {

    if (!fecha) {
      return '—';
    }

    const partes = fecha.substring(0, 10).split('-');

    return partes.length === 3
      ? `${partes[2]}/${partes[1]}/${partes[0]}`
      : '—';
  }

  protected formatearDuracion(
    segundos: number | null
  ): string {

    if (segundos === null) {
      return '—';
    }

    return this.formatearTiempo(segundos);
  }

  protected formatearIntencion(
    intencion: string | null
  ): string | null {

    if (!intencion) {
      return null;
    }

    const nombres: Record<string, string> = {
      RECOMPRARIA: 'Recompraría',
      COMPRARIA: 'Compraría',
      NO_COMPRARIA: 'No compraría',
      INDECISO: 'Indeciso'
    };

    return nombres[intencion] ??
      intencion.replaceAll('_', ' ');
  }

  protected textoEstado(
    estado: string | null
  ): string {

    if (!estado) {
      return 'NO DISPONIBLE';
    }

    const nombres: Record<string, string> = {
      COMPLETADA: 'COMPLETADA',
      EN_PROCESO: 'EN PROCESO',
      CON_ERROR: 'CON ERROR',
      SIN_CONTENIDO: 'SIN CONTENIDO',
      PENDIENTE: 'PENDIENTE'
    };

    return nombres[estado] ?? estado;
  }

}