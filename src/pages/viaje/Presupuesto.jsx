import { useMemo } from 'react';
import { Wallet } from '@phosphor-icons/react';
import { CATEGORIAS } from '../../data/requisitos.js';

const usd = (n) => `USD ${Math.round(n).toLocaleString('es-AR')}`;

export default function Presupuesto({ trip, items }) {
  const datos = useMemo(() => {
    const conCosto = items.filter((i) => i.costo > 0);
    const total = conCosto.reduce((s, i) => s + i.costo, 0);
    const confirmado = conCosto.filter((i) => i.estado === 'listo').reduce((s, i) => s + i.costo, 0);
    const porCat = CATEGORIAS.map((c) => ({
      ...c,
      total: conCosto.filter((i) => i.categoria === c.id).reduce((s, i) => s + i.costo, 0),
    })).filter((c) => c.total > 0);
    return { conCosto, total, confirmado, porCat, sinCosto: items.length - conCosto.length };
  }, [items]);

  if (datos.conCosto.length === 0) {
    return (
      <div className="empty glass">
        <Wallet size={38} weight="duotone" />
        <h2>Todavía no cargaste costos</h2>
        <p className="muted">
          Abrí cualquier ítem del checklist y completá el costo estimado, o guardá vuelos y actividades desde
          Recomendados. Acá vas a ver el total y cuánto sale por persona.
        </p>
      </div>
    );
  }

  const maxCat = Math.max(...datos.porCat.map((c) => c.total));

  return (
    <div className="budget">
      <div className="budget__totals">
        <div className="glass stat">
          <span className="muted">Total estimado</span>
          <strong className="mono">{usd(datos.total)}</strong>
        </div>
        <div className="glass stat">
          <span className="muted">Por persona ({trip.viajeros})</span>
          <strong className="mono">{usd(datos.total / trip.viajeros)}</strong>
        </div>
        <div className="glass stat">
          <span className="muted">Ya resuelto</span>
          <strong className="mono">{usd(datos.confirmado)}</strong>
        </div>
      </div>

      <section className="glass cat" aria-labelledby="bud-cat">
        <header className="cat__head">
          <h3 id="bud-cat">Por categoría</h3>
        </header>
        <ul className="budget__cats">
          {datos.porCat.map((c) => (
            <li key={c.id}>
              <div className="budget__cat-row">
                <span>{c.nombre}</span>
                <span className="mono">{usd(c.total)}</span>
              </div>
              <div className="bar">
                <span style={{ transform: `scaleX(${c.total / maxCat})` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass cat" aria-labelledby="bud-items">
        <header className="cat__head">
          <h3 id="bud-items">Detalle</h3>
          <span className="mono muted">{datos.conCosto.length} ítems</span>
        </header>
        <ul className="budget__items">
          {[...datos.conCosto]
            .sort((a, b) => b.costo - a.costo)
            .map((i) => (
              <li key={i.id}>
                <span>{i.titulo}</span>
                <span className="mono">{usd(i.costo)}</span>
              </li>
            ))}
        </ul>
      </section>

      {datos.sinCosto > 0 && (
        <p className="muted notice">
          {datos.sinCosto} ítems todavía no tienen costo. Los valores son estimaciones en dólares para el grupo completo.
        </p>
      )}
    </div>
  );
}
