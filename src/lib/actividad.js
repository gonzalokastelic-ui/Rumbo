// Registro de lo que hace cada persona en el viaje ("Lucía marcó Visa como lista").
// Es informativo: si falla (por ejemplo, sin conexion) no interrumpe la accion principal.
export function crearRegistro(store, trip, user) {
  return (tipo, texto) => {
    if (!store?.registrarActividad || !trip || !user) return;
    store
      .registrarActividad(trip.id, {
        uid: user.uid,
        nombre: (user.displayName || 'Alguien').slice(0, 80),
        tipo,
        texto: texto.slice(0, 200),
      })
      .catch(() => {});
  };
}

const aMs = (t) => (typeof t === 'number' ? t : t?.toMillis ? t.toMillis() : Date.now());

// "recién", "hace 5 min", "hace 3 h", "ayer", "hace 4 días"
export function hace(t) {
  const seg = Math.max(0, Math.round((Date.now() - aMs(t)) / 1000));
  if (seg < 60) return 'recién';
  const min = Math.round(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return 'ayer';
  return `hace ${d} días`;
}

export const cita = (t) => `«${t.length > 60 ? `${t.slice(0, 57)}...` : t}»`;
