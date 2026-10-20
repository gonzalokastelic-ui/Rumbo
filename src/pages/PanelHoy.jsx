import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lightning } from '@phosphor-icons/react';
import { diasEntre, formatoCorto, hoyISO } from '../lib/fechas.js';

const MAX_VIAJES = 8;
const MAX_FILAS = 6;

function cuando(dias) {
  if (dias < -1) return `Venció hace ${-dias} días`;
  if (dias === -1) return 'Venció ayer';
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  return `Vence en ${dias} días`;
}

// Lo que conviene resolver ya: tramites vencidos o que vencen en los proximos 7 dias,
// de todos los viajes que todavia no terminaron.
export default function PanelHoy({ viajes, store }) {
  const hoy = hoyISO();
  const activos = useMemo(
    () => viajes.filter((t) => !t.fechaVuelta || t.fechaVuelta >= hoy).slice(0, MAX_VIAJES),
    [viajes, hoy],
  );
  const claves = activos.map((t) => t.id).join(',');
  const [porViaje, setPorViaje] = useState({});

  useEffect(() => {
    const offs = activos.map((t) =>
      store.subscribeItems(
        t.id,
        (items) => setPorViaje((p) => ({ ...p, [t.id]: items })),
        () => setPorViaje((p) => ({ ...p, [t.id]: [] })),
      ),
    );
    return () => offs.forEach((off) => off && off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, claves]);

  const filas = useMemo(() => {
    const lista = [];
    activos.forEach((t) => {
      (porViaje[t.id] || []).forEach((i) => {
        if (i.estado === 'listo' || !i.fechaLimite) return;
        const dias = diasEntre(hoy, i.fechaLimite);
        if (dias <= 7) lista.push({ trip: t, item: i, dias });
      });
    });
    return lista.sort((a, b) => a.dias - b.dias);
  }, [activos, porViaje, hoy]);

  if (!filas.length) return null;
  const visibles = filas.slice(0, MAX_FILAS);

  return (
    <section className="hoy glass" aria-labelledby="hoy-t">
      <header className="hoy__head">
        <span className="hoy__ico" aria-hidden="true">
          <Lightning size={18} weight="fill" />
        </span>
        <div>
          <h2 id="hoy-t">Para resolver esta semana</h2>
          <p className="muted">
            {filas.length === 1 ? 'Un trámite tiene' : `${filas.length} trámites tienen`} fecha límite cerca.
          </p>
        </div>
      </header>
      <ul className="hoy__list">
        {visibles.map(({ trip, item, dias }) => (
          <li key={`${trip.id}/${item.id}`}>
            <Link to={`/viaje/${trip.id}?item=${item.id}`} className={`hoy__row${dias < 0 ? ' is-late' : ''}`}>
              <span className="hoy__main">
                <strong>{item.titulo}</strong>
                <small className="muted">{trip.nombre}</small>
              </span>
              <span className="hoy__when">
                {cuando(dias)}
                <small className="mono">{formatoCorto(item.fechaLimite)}</small>
              </span>
              <ArrowRight size={16} className="hoy__go" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      {filas.length > MAX_FILAS && <p className="muted hoy__more">Y {filas.length - MAX_FILAS} más dentro de cada viaje.</p>}
    </section>
  );
}
