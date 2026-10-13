// Datos de referencia de SlickTrip (vuelos) y Brek (hoteles), consultados el
// 13/10/2026 y guardados en snapshot.json. Se muestran sin llamar a ninguna API:
// los links llevan al usuario a la busqueda en vivo de cada servicio.
import snapshot from '../data/snapshot.json';
import { DESTINOS_POR_ID, ORIGEN } from '../data/destinos.js';
import { sumarDias, parseISO, toISO } from './fechas.js';

export const REFERENCIA = {
  consultado: snapshot.generatedAt,
  desde: snapshot.calendarFrom,
  hotel: snapshot.hotelWindow,
};

export function datosDestino(id) {
  return snapshot.destinos[id] || { precios: [], aerolineas: [], hoteles: [] };
}

// Calendario de precios: [{ fecha, precio }]
export function calendario(id) {
  const { precios } = datosDestino(id);
  return precios.map((precio, i) => ({ fecha: sumarDias(snapshot.calendarFrom, i), precio }));
}

export function resumenPrecios(id) {
  const cal = calendario(id);
  if (!cal.length) return null;
  const ordenado = [...cal].sort((a, b) => a.precio - b.precio);
  const min = ordenado[0];
  const mediana = ordenado[Math.floor(ordenado.length / 2)].precio;
  return { min: min.precio, fechaMin: min.fecha, mediana, ahorro: Math.round((1 - min.precio / mediana) * 100) };
}

// Link a la busqueda en SlickTrip con origen, destino, fechas y viajeros ya cargados
export function linkVuelos({ destinoId, ida, vuelta, viajeros = 1 }) {
  const dest = DESTINOS_POR_ID[destinoId];
  if (!dest) return 'https://slicktrip.com';
  const salida = ida || sumarDias(snapshot.calendarFrom, 30);
  const regreso = vuelta || sumarDias(salida, 7);
  const key = [ORIGEN.iata, dest.iata, 'economy', viajeros, salida, regreso].join(';');
  return `https://slicktrip.com/flights?key=${encodeURIComponent(key)}&src=rumbo`;
}

export const linkBrek = 'https://www.brek.com';

export function hoyMasDias(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export { parseISO };
