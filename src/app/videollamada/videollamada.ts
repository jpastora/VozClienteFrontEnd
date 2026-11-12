import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { GUIA_SUGERIDA, SEGUNDOS_REINTENTO } from '../core/config';
import { EntrevistaApi } from '../core/entrevista-api';
import { GrabacionApi } from '../core/grabacion-api';
import { GuiaApi } from '../core/guia-api';
import { GrabacionDTO, ResultadoGrabacion, Rol, SalaDTO, SenalMensaje } from '../core/models';
import { RecorderService } from '../core/recorder.service';
import { SalaApi } from '../core/sala-api';
import { SignalingService } from '../core/signaling.service';
import { WebrtcService } from '../core/webrtc.service';
import { LogoComponent } from '../shared/logo/logo.component';
import { MediaStreamDirective } from './media-stream.directive';
import { ProductoApi } from '../core/producto-api';

type Fase = 'cargando' | 'error' | 'lobby' | 'conectando' | 'llamada' | 'subiendo' | 'finalizada';

const CLAVE_NOMBRE = 'voz-cliente:nombre';

@Component({
  selector: 'app-videollamada',
  imports: [FormsModule, LogoComponent, MediaStreamDirective],
  providers: [SignalingService, WebrtcService, RecorderService],
  templateUrl: './videollamada.html',
  styleUrl: './videollamada.css',
})
export class Videollamada implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private salaApi = inject(SalaApi);
  private grabacionApi = inject(GrabacionApi);
  private guiaApi = inject(GuiaApi);
  private entrevistaApi = inject(EntrevistaApi);
  private destroyRef = inject(DestroyRef);
  private signaling = inject(SignalingService);
  private titulo = inject(Title);
  private productoNombre = signal('');
  protected rtc = inject(WebrtcService);
  protected rec = inject(RecorderService);

  protected readonly rol: Rol = this.route.snapshot.data['rol'];
  protected readonly esRep = this.rol === 'representante';
  private readonly token = this.route.snapshot.paramMap.get('token') ?? '';

  /** Preguntas que ve el representante: la guía elegida al generar el enlace o, si no hay, la sugerida. */
  protected guia = signal<string[]>(GUIA_SUGERIDA);
  protected fase = signal<Fase>('cargando');
  protected sala = signal<SalaDTO | null>(null);
  protected error = signal('');

  // Formulario del lobby
  protected nombre = signal('');
  protected entrevistaId = signal<number | null>(null);
  protected acepta = signal(false);
  protected errorLobby = signal('');

  // Llamada
  protected nombreRemoto = signal('');
  protected hora = signal(this.formatoHora());
  protected segundos = signal(SEGUNDOS_REINTENTO);
  protected reintentando = computed(
    () => this.rtc.estado() === 'inestable' || this.rtc.estado() === 'fallido',
  );

  // Subida
  protected progreso = signal(0);
  protected errorSubida = signal('');
  protected grabacion = signal<GrabacionDTO | null>(null);
  protected resumenFinal = signal('');

  

  /** Nombre del producto de la sala; si el back-end no lo envía se muestra su número. */
  protected tituloSala = computed(() => {
    const s = this.sala();
    if (!s) return '';
    return this.productoNombre() || s.productoNombre?.trim() || `Producto #${s.productoId}`;
  });

  protected etiquetaRemota = computed(() => this.nombreRemoto() || (this.esRep ? 'Consumidor' : 'Representante'));
  protected inicialesRemoto = computed(() => this.iniciales(this.etiquetaRemota()));

  private resultado: ResultadoGrabacion | null = null;
  private parcial = false;
  private grabacionIniciada = false;
  private terminando = false;
  private relojId?: ReturnType<typeof setInterval>;
  private cuentaId?: ReturnType<typeof setInterval>;
  private productoApi = inject(ProductoApi);

  constructor() {
    // Representante: empieza a grabar el canal del cliente cuando la conexión queda establecida.
    effect(() => {
      const estado = this.rtc.estado();
      const remoto = this.rtc.remoteStream();
      untracked(() => {
        if (this.esRep && estado === 'conectado' && remoto && !this.grabacionIniciada) {
          this.grabacionIniciada = true;
          this.rec.iniciar(remoto);
        }
      });
    });

    // Cuenta regresiva de reintento cuando la conexión se degrada.
    effect(() => {
      const retrying = this.reintentando();
      untracked(() => (retrying ? this.iniciarCuenta() : this.detenerCuenta()));
    });
  }

  async ngOnInit(): Promise<void> {
    this.relojId = setInterval(() => this.hora.set(this.formatoHora()), 1000);

    try {
      const sala = await firstValueFrom(this.salaApi.obtener(this.token));
      this.sala.set(sala);

      // --- INICIO ACTUALIZACIÓN (Opción 1) ---
      // Si la sala tiene un ID de producto pero no trajo el nombre, lo consultamos
      if (sala.productoId && !sala.productoNombre) {
        try {
          const producto = await firstValueFrom(this.productoApi.obtener(sala.productoId));
          this.productoNombre.set(producto.nombre); // Ajusta "producto.nombre" si tu DTO usa otra propiedad
        } catch (error) {
          console.warn('No se pudo cargar el nombre del producto desde el API', error);
        }
      }
      // --- FIN ACTUALIZACIÓN ---

      // Asignamos el título DESPUÉS de haber actualizado la señal del productoNombre
      this.titulo.setTitle(`Sala del producto ${this.tituloSala()} · Voz Cliente`);

      const vencida = sala.venceEn ? new Date(sala.venceEn).getTime() < Date.now() : false;
      if (sala.estado === 'EXPIRADO' || vencida) {
        this.fallo('Este enlace ha expirado. Solicita uno nuevo.');
        return;
      }

      if (this.esRep) {
        const q = Number(this.route.snapshot.queryParamMap.get('entrevistaId') ?? sala.entrevistaId);
        this.entrevistaId.set(Number.isFinite(q) && q > 0 ? q : null);
        this.nombreRemoto.set(sala.nombreConsumidor ?? '');
        this.cargarGuia();
      }
      this.nombre.set(
        (!this.esRep ? sala.nombreConsumidor : null) ?? localStorage.getItem(CLAVE_NOMBRE) ?? '',
      );
      this.fase.set('lobby');
    } catch {
      this.fallo('No se encontró la sala o el enlace no es válido.');
    }
  }
  /** Carga la guía indicada en ?guiaId=; si falla (o no viene) se queda la guía sugerida. */
  private cargarGuia(): void {
    const id = Number(this.route.snapshot.queryParamMap.get('guiaId'));
    if (!Number.isFinite(id) || id <= 0) return;
    this.guiaApi.obtener(id).subscribe({
      next: (g) => {
        const preguntas = (g.preguntas ?? []).filter((p) => p?.trim());
        if (preguntas.length) this.guia.set(preguntas);
      },
      error: () => { /* sin permiso o guía eliminada: se mantiene la guía sugerida */ },
    });
  }

  // ---------- Entrada a la sala ----------

  protected async entrar(): Promise<void> {
    this.errorLobby.set('');
    const nombre = this.nombre().trim();
    if (!nombre) return this.errorLobby.set('Escribe tu nombre.');
    if (this.esRep && !this.entrevistaId()) return this.errorLobby.set('Indica el ID de la entrevista.');
    if (!this.esRep && !this.acepta()) return this.errorLobby.set('Debes aceptar la grabación para continuar.');
    if (this.esRep && !RecorderService.soportado()) {
      return this.errorLobby.set('Este navegador no soporta MediaRecorder. Usa Chrome, Edge o Firefox.');
    }

    localStorage.setItem(CLAVE_NOMBRE, nombre);
    this.fase.set('conectando');

    try {
      // El consumidor registra su aceptación de la grabación (PATCH /responder).
      if (!this.esRep) await firstValueFrom(this.salaApi.responder(this.token, nombre));

      try {
        await this.rtc.obtenerMedios();
      } catch {
        throw new Error('No se pudo acceder al micrófono. Revisa los permisos del navegador y recarga la página.');
      }

      this.rtc.configurar((m) => this.signaling.enviar({ ...m, de: this.rol, nombre: this.nombre().trim() }));
      this.signaling.mensajes$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((m) => void this.alRecibir(m));

      this.signaling.rechazo$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((motivo) => {
        this.limpiarRecursos();
        this.fallo(motivo);
      });

      await this.signaling.conectar(this.token);
      this.signaling.enviar({ tipo: 'join', de: this.rol, nombre });
      this.fase.set('llamada');
    } catch (e) {
      this.limpiarRecursos();
      if (e instanceof HttpErrorResponse) {
        this.fallo('No se pudo registrar tu entrada a la sala. Verifica que el enlace siga vigente.');
      } else {
        this.fallo(e instanceof Error ? e.message : 'No se pudo iniciar la llamada.');
      }
    }
  }

  // ---------- Señalización entrante ----------

  private async alRecibir(m: SenalMensaje): Promise<void> {
    if (m.de === this.rol) return;
    try {
      switch (m.tipo) {
        case 'join':
          if (m.nombre) this.nombreRemoto.set(m.nombre);
          if (this.esRep) {
            if (!this.rtc.ofertaReciente()) await this.rtc.iniciarOferta();
          } else {
            // El representante acaba de entrar: le confirmamos que estamos presentes.
            this.signaling.enviar({ tipo: 'join', de: this.rol, nombre: this.nombre().trim() });
          }
          break;
        case 'offer':
          if (!this.esRep && m.sdp && m.sesion) {
            if (m.nombre) this.nombreRemoto.set(m.nombre);
            await this.rtc.recibirOferta(m.sdp, m.sesion);
          }
          break;
        case 'answer':
          if (this.esRep && m.sdp && m.sesion) await this.rtc.recibirRespuesta(m.sdp, m.sesion);
          break;
        case 'ice':
          if (m.candidato && m.sesion) await this.rtc.recibirIce(m.candidato, m.sesion);
          break;
        case 'leave':
          await this.terminar({ parcial: false, notificar: false });
          break;
      }
    } catch (e) {
      console.error('Error procesando señal', m.tipo, e);
    }
  }

  // ---------- Controles ----------

  protected finalizar(): void {
    void this.terminar({ parcial: false, notificar: true });
  }

  protected alternarMic(): void {
    this.rtc.alternarMicrofono();
  }

  protected alternarCamara(): void {
    this.rtc.alternarCamara();
  }

  private async terminar(opts: { parcial: boolean; notificar: boolean }): Promise<void> {
    if (this.terminando) return;
    this.terminando = true;
    this.detenerCuenta();

    if (opts.notificar) this.signaling.enviar({ tipo: 'leave', de: this.rol });

    // Primero se cierra el grabador (mientras las pistas siguen vivas) y luego la conexión.
    const resultado = this.esRep ? await this.rec.detener() : null;
    this.limpiarRecursos();

    // El representante cierra la entrevista en el backend: FINALIZADA, o FALLIDA si fue parcial.
    if (this.esRep) this.cerrarEntrevista(opts.parcial || !!resultado?.inesperado);

    if (resultado && resultado.blob.size > 0) {
      this.resultado = resultado;
      this.parcial = opts.parcial || resultado.inesperado;
      void this.subir();
    } else {
      this.resumenFinal.set(
        opts.parcial ? 'Se perdió la conexión con la otra persona.' : 'La llamada ha finalizado.',
      );
      this.fase.set('finalizada');
    }
  }

  /** Registra el cierre de la entrevista sin bloquear la subida; si falla solo se deja constancia en consola. */
  private cerrarEntrevista(fallida: boolean): void {
    const id = this.entrevistaId();
    if (!id) return;
    const peticion = fallida ? this.entrevistaApi.reportarFallo(id) : this.entrevistaApi.finalizar(id);
    peticion.subscribe({
      error: (e) => console.error('No se pudo cerrar la entrevista', id, e),
    });
  }

  // ---------- Subida de la grabación ----------

  protected subir(): void {
    const r = this.resultado;
    const id = this.entrevistaId();
    if (!r || !id) return;

    this.errorSubida.set('');
    this.progreso.set(0);
    this.fase.set('subiendo');

    this.grabacionApi.subir(id, r, this.parcial).subscribe({
      next: (ev) => {
        if (ev.type === HttpEventType.UploadProgress) {
          this.progreso.set(Math.round((100 * ev.loaded) / (ev.total ?? ev.loaded)));
        } else if (ev.type === HttpEventType.Response) {
          this.grabacion.set(ev.body);
          this.resumenFinal.set(
            this.parcial
              ? 'La llamada terminó antes de tiempo. La grabación parcial quedó guardada.'
              : 'La llamada finalizó y la grabación quedó guardada.',
          );
          this.fase.set('finalizada');
        }
      },
      error: (e: HttpErrorResponse) => {
        this.errorSubida.set(
          e.status === 413
            ? 'El archivo supera el tamaño máximo permitido por el servidor.'
            : 'No se pudo subir la grabación. Puedes reintentar o descargar una copia.',
        );
      },
    });
  }

  protected descargarCopia(): void {
    if (!this.resultado) return;
    const url = URL.createObjectURL(this.resultado.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entrevista_${this.entrevistaId()}.webm`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  // ---------- Reintento de conexión ----------

  private iniciarCuenta(): void {
    if (this.cuentaId) return;
    this.segundos.set(SEGUNDOS_REINTENTO);
    this.reintentarIce();

    this.cuentaId = setInterval(() => {
      const s = this.segundos() - 1;
      this.segundos.set(s);
      if (s <= 0) {
        this.detenerCuenta();
        void this.terminar({ parcial: true, notificar: true });
      } else if (s % 8 === 0) {
        this.reintentarIce();
      }
    }, 1000);
  }

  private detenerCuenta(): void {
    if (this.cuentaId) clearInterval(this.cuentaId);
    this.cuentaId = undefined;
  }

  private reintentarIce(): void {
    // Solo el representante inicia la renegociación.
    if (this.esRep) void this.rtc.reiniciarIce().catch(() => undefined);
  }

  // ---------- Utilidades ----------

  @HostListener('window:beforeunload', ['$event'])
  protected avisarAntesDeSalir(e: BeforeUnloadEvent): void {
    const f = this.fase();
    if (f === 'llamada' || f === 'subiendo') e.preventDefault();
  }

  ngOnDestroy(): void {
    clearInterval(this.relojId);
    this.detenerCuenta();
    this.rec.cancelar();
    this.limpiarRecursos();
  }

  private limpiarRecursos(): void {
    this.rtc.cerrar();
    this.signaling.desconectar();
  }

  private fallo(msg: string): void {
    this.error.set(msg);
    this.fase.set('error');
  }

  protected iniciales(nombre: string): string {
    const partes = nombre.trim().split(/\s+/).filter(Boolean);
    return ((partes[0]?.[0] ?? '?') + (partes[1]?.[0] ?? '')).toUpperCase();
  }

  private formatoHora(): string {
    return new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
}