import { Directive, ElementRef, effect, inject, input } from '@angular/core';

/** <video [mediaStream]="stream"> → asigna srcObject y reproduce. */
@Directive({ selector: 'video[mediaStream]' })
export class MediaStreamDirective {
  readonly mediaStream = input<MediaStream | null>(null);
  private el = inject<ElementRef<HTMLVideoElement>>(ElementRef);

  constructor() {
    effect(() => {
      const stream = this.mediaStream();
      const video = this.el.nativeElement;
      if (video.srcObject !== stream) video.srcObject = stream;
      if (stream) video.play().catch(() => undefined);
    });
  }
}
