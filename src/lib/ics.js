// Exporta el itinerario como archivo .ics, que abren Google Calendar, Apple Calendar y Outlook.
// Las actividades con hora duran una hora; las que no tienen hora van como evento de todo el dia.
import { sumarDias } from './fechas.js';

const escapar = (t = '') => t.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const sinGuiones = (iso) => iso.replace(/-/g, '');

// Las lineas de un .ics no deben superar los 75 caracteres
function plegar(linea) {
  if (linea.length <= 75) return linea;
  const partes = [];
  for (let i = 0; i < linea.length; i += 74) partes.push((i ? ' ' : '') + linea.slice(i, i + 74));
  return partes.join('\r\n');
}

function horaFin(hora) {
  const [h, m] = hora.split(':').map(Number);
  const fin = Math.min(h * 60 + m + 60, 23 * 60 + 59);
  return `${String(Math.floor(fin / 60)).padStart(2, '0')}${String(fin % 60).padStart(2, '0')}00`;
}

export function generarICS(trip, eventos) {
  const sello = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Rumbo//Itinerario//ES',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapar(trip.nombre)}`,
  ];
  eventos.forEach((e) => {
    lineas.push('BEGIN:VEVENT', `UID:${e.id}@rumbo`, `DTSTAMP:${sello}`);
    if (e.hora) {
      const hhmm = e.hora.replace(':', '');
      lineas.push(`DTSTART:${sinGuiones(e.fecha)}T${hhmm}00`, `DTEND:${sinGuiones(e.fecha)}T${horaFin(e.hora)}`);
    } else {
      lineas.push(`DTSTART;VALUE=DATE:${sinGuiones(e.fecha)}`, `DTEND;VALUE=DATE:${sinGuiones(sumarDias(e.fecha, 1))}`);
    }
    lineas.push(`SUMMARY:${escapar(e.titulo)}`);
    if (e.lugar) lineas.push(`LOCATION:${escapar(e.lugar)}`);
    if (e.notas) lineas.push(`DESCRIPTION:${escapar(e.notas)}`);
    lineas.push('END:VEVENT');
  });
  lineas.push('END:VCALENDAR');
  return lineas.map(plegar).join('\r\n');
}

export function descargarICS(trip, eventos) {
  const blob = new Blob([generarICS(trip, eventos)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${trip.nombre.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'itinerario'}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
