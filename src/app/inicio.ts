import { Component } from '@angular/core';

@Component({
  selector: 'app-inicio',
  template: `
    <div style="min-height:100dvh;display:grid;place-items:center;text-align:center;padding:24px">
      <div>
        <h1 style="font-size:28px;margin:0 0 8px">VOZ CLIENTE</h1>
        <p style="color:var(--muted);margin:0">Abre el enlace de tu sala para unirte a la videollamada.</p>
      </div>
    </div>
  `,
})
export class Inicio {}
