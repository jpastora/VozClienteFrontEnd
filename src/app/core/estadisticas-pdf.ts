import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
  EstadisticasDTO,
  IntencionEstadistica,
} from './models';

@Injectable({
  providedIn: 'root',
})
export class EstadisticasPdf {

  private readonly etiquetas: Record<IntencionEstadistica, string> = {
    RECOMPRARIA: 'Recompraría',
    NO_RECOMPRARIA: 'No recompraría',
    RECHAZA: 'Rechaza',
    NEUTRAL: 'Neutral',
  };

  private readonly colores: Record<
    IntencionEstadistica,
    [number, number, number]
  > = {
    RECOMPRARIA: [37, 132, 92],
    NO_RECOMPRARIA: [230, 154, 50],
    RECHAZA: [207, 68, 68],
    NEUTRAL: [148, 163, 184],
  };

  descargar(
    datos: EstadisticasDTO,
    producto: string,
    desde: string,
    hasta: string
  ): void {

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const fecha = new Date().toLocaleDateString('es-CR', {
      timeZone: 'America/Costa_Rica',
    });

    this.encabezado(pdf);
    this.filtros(pdf, producto, desde, hasta, fecha);
    this.metricas(pdf, datos);
    this.distribucion(pdf, datos);
    this.competidores(pdf, datos);
    this.piePagina(pdf);

    const fechaArchivo = new Date().toLocaleDateString('sv-SE', {
      timeZone: 'America/Costa_Rica',
    });

    pdf.save(`VozCliente-Estadisticas-${fechaArchivo}.pdf`);
  }

  private encabezado(pdf: jsPDF): void {

    pdf.setTextColor(15, 15, 15);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.text('VOZ CLIENTE', 15, 20);

    pdf.setFillColor(255, 182, 0);
    pdf.rect(15, 25, 180, 1.5, 'F');

    pdf.setFontSize(16);
    pdf.text('REPORTE DE ESTADÍSTICAS', 15, 36);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(
      'Intención de compra y competencia por producto',
      15,
      43
    );
  }

  private filtros(
    pdf: jsPDF,
    producto: string,
    desde: string,
    hasta: string,
    fecha: string
  ): void {

    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);

    const nombre = pdf.splitTextToSize(producto, 150);

    pdf.text('Producto:', 15, 54);
    pdf.text(nombre, 42, 54);

    const y = 54 + (nombre.length - 1) * 4;

    pdf.text(`Desde: ${this.formatearFecha(desde)}`, 15, y + 7);
    pdf.text(`Hasta: ${this.formatearFecha(hasta)}`, 105, y + 7);
    pdf.text(`Fecha de generación: ${fecha}`, 15, y + 14);
  }

  private metricas(
    pdf: jsPDF,
    datos: EstadisticasDTO
  ): void {

    const metricas = [
      {
        titulo: 'Entrevistas analizadas',
        valor: String(datos.entrevistasAnalizadas),
      },
      {
        titulo: 'Intención de compra',
        valor: `${datos.intencionCompra}%`,
      },
      {
        titulo: 'Menciones de competencia',
        valor: String(datos.mencionesCompetencia),
      },
    ];

    metricas.forEach((metrica, index) => {

      const x = 15 + index * 61;

      pdf.setDrawColor(200, 200, 200);
      pdf.roundedRect(x, 83, 58, 27, 1, 1);

      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(metrica.titulo, x + 4, 91);

      pdf.setTextColor(15, 15, 15);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.text(metrica.valor, x + 4, 102);

      pdf.setFillColor(255, 182, 0);
      pdf.rect(x + 4, 105, 10, 1, 'F');
    });
  }

  private distribucion(
    pdf: jsPDF,
    datos: EstadisticasDTO
  ): void {

    pdf.setTextColor(15, 15, 15);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('DISTRIBUCIÓN DE LA INTENCIÓN', 15, 123);

    const total = datos.entrevistasAnalizadas;

    if (total === 0) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text('Sin datos para graficar.', 15, 145);
      return;
    }

    const centroX = 42;
    const centroY = 157;
    const radio = 24;

    let angulo = -Math.PI / 2;

    datos.distribucionIntencion.forEach(item => {

      if (item.cantidad === 0) {
        return;
      }

      const amplitud = (item.cantidad / total) * 2 * Math.PI;
      const pasos = Math.max(1, Math.ceil(amplitud / 0.03));
      const color = this.colores[item.intencion];

      pdf.setFillColor(...color);

      for (let i = 0; i < pasos; i++) {

        const inicio = angulo + amplitud * i / pasos;
        const fin = angulo + amplitud * (i + 1) / pasos;

        pdf.triangle(
          centroX,
          centroY,
          centroX + radio * Math.cos(inicio),
          centroY + radio * Math.sin(inicio),
          centroX + radio * Math.cos(fin),
          centroY + radio * Math.sin(fin),
          'F'
        );
      }

      angulo += amplitud;
    });

    // Centro blanco del gráfico circular.
    pdf.setFillColor(255, 255, 255);
    pdf.circle(centroX, centroY, 16, 'F');

    pdf.setTextColor(15, 15, 15);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(19);

    pdf.text(String(total), centroX, centroY, {
      align: 'center',
    });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);

    pdf.text('Entrevistas', centroX, centroY + 5, {
      align: 'center',
    });

    // Leyenda del gráfico.
    datos.distribucionIntencion.forEach((item, index) => {

      const y = 141 + index * 10;
      const color = this.colores[item.intencion];

      pdf.setFillColor(...color);
      pdf.roundedRect(80, y - 3, 4, 4, 0.5, 0.5, 'F');

      pdf.setTextColor(15, 15, 15);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);

      pdf.text(this.etiquetas[item.intencion], 88, y);

      pdf.text(String(item.cantidad), 165, y, {
        align: 'right',
      });

      pdf.setFont('helvetica', 'bold');

      pdf.text(`${item.porcentaje}%`, 195, y, {
        align: 'right',
      });
    });
  }

  private competidores(
    pdf: jsPDF,
    datos: EstadisticasDTO
  ): void {

    pdf.setTextColor(15, 15, 15);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('COMPETIDORES MENCIONADOS', 15, 195);

    const filas = datos.competidores.length
      ? datos.competidores.map(item => [
          item.competidor,
          String(item.menciones),
        ])
      : [['Sin menciones registradas', '0']];

    autoTable(pdf, {
      startY: 201,
      head: [['Competidor', 'Menciones']],
      body: filas,
      theme: 'striped',

      margin: {
        top: 15,
        left: 15,
        right: 15,
        bottom: 20,
      },

      styles: {
        font: 'helvetica',
        fontSize: 10,
        cellPadding: 4,
        overflow: 'linebreak',
      },

      headStyles: {
        fillColor: [15, 15, 15],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },

      alternateRowStyles: {
        fillColor: [241, 241, 241],
      },

      columnStyles: {
        1: {
          halign: 'right',
          cellWidth: 35,
        },
      },
    });
  }

  private piePagina(pdf: jsPDF): void {

    const paginas = pdf.getNumberOfPages();

    for (let pagina = 1; pagina <= paginas; pagina++) {

      pdf.setPage(pagina);

      pdf.setDrawColor(200, 200, 200);
      pdf.line(15, 280, 195, 280);

      pdf.setTextColor(100, 100, 100);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);

      pdf.text('VozCliente | Reporte de estadísticas', 15, 286);

      pdf.text(`Página ${pagina} de ${paginas}`, 195, 286, {
        align: 'right',
      });
    }
  }

  private formatearFecha(fecha: string): string {

    if (!fecha) {
      return 'Sin límite';
    }

    const [anio, mes, dia] = fecha.split('-');

    return `${dia}/${mes}/${anio}`;
  }
}