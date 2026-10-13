import { requisitosPara } from '../data/requisitos.js';
import { fechaLimite } from './fechas.js';

// Convierte los requisitos de un destino en los items iniciales del viaje
export function itemsIniciales(destinoId, plantilla, fechaIda) {
  return requisitosPara(destinoId, plantilla).map((r, i) => ({
    titulo: r.titulo,
    categoria: r.categoria,
    estado: 'pendiente',
    fechaLimite: fechaLimite(fechaIda, r.diasAntes),
    diasAntes: r.diasAntes,
    costo: null,
    notas: '',
    link: r.link || '',
    asignadoA: null,
    predeterminado: true,
    clave: r.key,
    desc: r.desc || '',
    orden: i,
  }));
}

export function resumenItems(items) {
  const total = items.length;
  const listos = items.filter((i) => i.estado === 'listo').length;
  const tramite = items.filter((i) => i.estado === 'tramite').length;
  return { total, listos, tramite, avance: total ? listos / total : 0 };
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
