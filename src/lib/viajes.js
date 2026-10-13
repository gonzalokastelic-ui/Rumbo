import { CATEGORIAS, requisitosPara } from '../data/requisitos.js';
import { hoyISO } from './fechas.js';

// Convierte los requisitos de un destino en los items iniciales del viaje.
// Los items nacen sin fecha: la persona decide si quiere ponerle una.
export function itemsIniciales(destinoId, plantilla) {
  return requisitosPara(destinoId, plantilla).map((r, i) => ({
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
  }));
}

export function resumenItems(items) {
  const total = items.length;
  const listos = items.filter((i) => i.estado === 'listo').length;
  const tramite = items.filter((i) => i.estado === 'tramite').length;
  return { total, listos, tramite, avance: total ? listos / total : 0 };
}

const ORDEN_CATEGORIA = Object.fromEntries(CATEGORIAS.map((c, i) => [c.id, i]));

export function ordenarItems(a, b) {
  return (a.orden ?? 0) - (b.orden ?? 0);
}

// El siguiente paso sugerido: primero lo que tiene fecha (la mas cercana),
// despues lo que sigue en el orden de la lista.
export function proximoPaso(items) {
  const pendientes = items.filter((i) => i.estado !== 'listo');
  if (!pendientes.length) return null;
  return [...pendientes].sort((a, b) => {
    const fa = a.fechaLimite || '9999-12-31';
    const fb = b.fechaLimite || '9999-12-31';
    if (fa !== fb) return fa < fb ? -1 : 1;
    const ca = ORDEN_CATEGORIA[a.categoria] ?? 99;
    const cb = ORDEN_CATEGORIA[b.categoria] ?? 99;
    if (ca !== cb) return ca - cb;
    return ordenarItems(a, b);
  })[0];
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
