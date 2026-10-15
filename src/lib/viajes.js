import { pasajerosPara, requisitosPara } from '../data/requisitos.js';
import { hoyISO } from './fechas.js';

const marcas = (lista, previo = {}) => Object.fromEntries(lista.map((p) => [p.id, Boolean(previo[p.id])]));

// Convierte los requisitos de un destino en los items iniciales del viaje.
// Los items nacen sin fecha: la persona decide si quiere ponerle una.
// Los tramites por persona llevan adentro la lista de pasajeros para tildar.
export function itemsIniciales(destinoId, plantilla, pasajeros = []) {
  return requisitosPara(destinoId, plantilla, pasajeros).map((r, i) => ({
    titulo: r.titulo,
    categoria: r.categoria,
    estado: 'pendiente',
    fechaLimite: null,
    costo: null,
    notas: '',
    link: r.link || '',
    asignadoA: null,
    predeterminado: true,
    clave: r.key,
    desc: r.desc || '',
    orden: i * 10,
    porPersona: Boolean(r.porPersona && pasajeros.length),
    personas: r.porPersona && pasajeros.length ? marcas(pasajerosPara(r.key, pasajeros)) : null,
  }));
}

// Estado del item segun cuantas personas lo resolvieron
export function estadoDesdePersonas(personas) {
  const valores = Object.values(personas || {});
  if (!valores.length) return 'pendiente';
  const hechos = valores.filter(Boolean).length;
  if (hechos === valores.length) return 'listo';
  return hechos > 0 ? 'tramite' : 'pendiente';
}

// Al cambiar los pasajeros de un viaje: ajusta las listas por persona y suma
// los requisitos nuevos que correspondan (por ejemplo, si se agrega un menor).
// No borra items que la persona ya tenia.
export function sincronizarPasajeros(trip, items, pasajeros) {
  const cambios = [];
  items
    .filter((it) => it.porPersona)
    .forEach((it) => {
      const personas = marcas(pasajerosPara(it.clave, pasajeros), it.personas);
      const igual = JSON.stringify(personas) === JSON.stringify(it.personas || {});
      if (!igual) cambios.push({ id: it.id, patch: { personas, estado: estadoDesdePersonas(personas) } });
    });

  const claves = new Set(items.map((it) => it.clave).filter(Boolean));
  const ultimo = items.reduce((m, it) => Math.max(m, it.orden ?? 0), 0);
  const nuevos = itemsIniciales(trip.destinoId, trip.plantilla, pasajeros)
    .filter((it) => !claves.has(it.clave))
    .map((it, i) => ({ ...it, orden: ultimo + (i + 1) * 10 }));

  return { cambios, nuevos };
}

export function resumenItems(items) {
  const total = items.length;
  const listos = items.filter((i) => i.estado === 'listo').length;
  const tramite = items.filter((i) => i.estado === 'tramite').length;
  return { total, listos, tramite, avance: total ? listos / total : 0 };
}

export function ordenarItems(a, b) {
  return (a.orden ?? 0) - (b.orden ?? 0);
}

export function estaVencido(item) {
  return item.estado !== 'listo' && Boolean(item.fechaLimite) && item.fechaLimite < hoyISO();
}

export const ROLES = {
  owner: 'Organizador',
  editor: 'Editor',
  viewer: 'Solo lectura',
};

export function puedeEditar(trip, uid) {
  const rol = trip?.miembros?.[uid];
  return rol === 'owner' || rol === 'editor';
}

export function mensajeError(e) {
  if (e?.code === 'permission-denied') return 'No tenés permiso para hacer este cambio.';
  if (e?.code === 'unavailable') return 'Sin conexión con Firebase. Probá de nuevo en unos segundos.';
  return 'No pudimos guardar el cambio. Intentá de nuevo.';
}
