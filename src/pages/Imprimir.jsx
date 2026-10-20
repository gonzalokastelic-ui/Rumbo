import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSub } from '../lib/useSub.js';
import { Cargando } from '../components/ui.jsx';
import { DESTINOS_POR_ID } from '../data/destinos.js';
import { CATEGORIAS, ESTADOS } from '../data/requisitos.js';
import { GRUPOS_POR_ID } from '../data/pasajeros.js';
import { diasDelViaje, formatoCorto, formatoLargo } from '../lib/fechas.js';
import { ordenarItems } from '../lib/viajes.js';
import '../styles/imprimir.css';

const ESTADO = Object.fromEntries(ESTADOS.map((e) => [e.id, e.nombre]));

// Version imprimible del viaje: checklist, pasajeros e itinerario en papel blanco.
// "Guardar como PDF" sale del dialogo de impresion del navegador.
export default function Imprimir() {
  const { id } = useParams();
  const { store } = useAuth();
  const viaje = useSub((ok, ko) => store.subscribeTrip(id, ok, ko), [store, id]);
  const lista = useSub((ok, ko) => store.subscribeItems(id, ok, ko), [store, id]);
  const agenda = useSub((ok, ko) => store.subscribeItinerario(id, ok, ko), [store, id]);

  const trip = viaje.data;
  const items = useMemo(() => [...(lista.data || [])].sort(ordenarItems), [lista.data]);
  const dias = useMemo(() => (trip ? diasDelViaje(trip.fechaIda, trip.fechaVuelta) : []), [trip]);

  if (viaje.cargando || lista.cargando || agenda.cargando) return <Cargando texto="Preparando la versión para imprimir" />;
  if (!trip) {
    return (
      <main className="print">
        <p>No pudimos abrir este viaje.</p>
        <Link to="/viajes">Volver a mis viajes</Link>
      </main>
    );
  }

  const dest = DESTINOS_POR_ID[trip.destinoId];
  const eventos = agenda.data || [];
  const pax = Object.fromEntries((trip.pasajeros || []).map((p) => [p.id, p.nombre]));

  return (
    <main className="print">
      <div className="print__bar no-print">
        <Link to={`/viaje/${trip.id}`} className="print__back">
          <ArrowLeft size={16} /> Volver al viaje
        </Link>
        <button type="button" className="print__btn" onClick={() => window.print()}>
          <Printer size={18} /> Imprimir o guardar PDF
        </button>
      </div>

      <header className="print__head">
        <p className="print__kicker">
          Rumbo · {dest?.ciudadPrincipal}, {dest?.nombre}
        </p>
        <h1>{trip.nombre}</h1>
        <p>
          Del {formatoLargo(trip.fechaIda)} al {formatoLargo(trip.fechaVuelta)}.
        </p>
      </header>

      {trip.pasajeros?.length > 0 && (
        <section>
          <h2>Pasajeros</h2>
          <ul className="print__pax">
            {trip.pasajeros.map((p) => (
              <li key={p.id}>
                {p.nombre}: {GRUPOS_POR_ID[p.edad]?.nombre || 'Adulto'}, {p.nacionalidad}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>Checklist</h2>
        {CATEGORIAS.map((c) => {
          const deCat = items.filter((i) => i.categoria === c.id);
          if (!deCat.length) return null;
          return (
            <div key={c.id} className="print__cat">
              <h3>{c.nombre}</h3>
              <ul>
                {deCat.map((i) => (
                  <li key={i.id} className={i.estado === 'listo' ? 'is-done' : ''}>
                    <span className="print__box" aria-hidden="true">
                      {i.estado === 'listo' ? '✓' : ''}
                    </span>
                    <span>
                      <strong>{i.titulo}</strong>
                      <small>
                        {ESTADO[i.estado]}
                        {i.fechaLimite ? `. Hasta el ${formatoCorto(i.fechaLimite)}` : ''}
                        {i.costo > 0 ? `. USD ${i.costo}` : ''}
                        {i.porPersona && i.personas
                          ? `. ${Object.entries(i.personas)
                              .map(([pid, ok]) => `${pax[pid] || 'Pasajero'} ${ok ? '(listo)' : '(falta)'}`)
                              .join(', ')}`
                          : ''}
                      </small>
                      {i.notas && <small className="print__notes">{i.notas}</small>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      {eventos.length > 0 && (
        <section className="print__itin">
          <h2>Itinerario</h2>
          {dias.map((d) => {
            const delDia = eventos.filter((e) => e.fecha === d.fecha).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
            if (!delDia.length) return null;
            return (
              <div key={d.fecha} className="print__day">
                <h3>{d.etiqueta}</h3>
                <ul>
                  {delDia.map((e) => (
                    <li key={e.id}>
                      <span className="print__hora">{e.hora || ''}</span>
                      <span>
                        <strong>{e.titulo}</strong>
                        {e.lugar && <small>{e.lugar}</small>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      )}

      <footer className="print__foot">
        Los requisitos de ingreso cambian: confirmá cada trámite en el sitio oficial antes de viajar.
      </footer>
    </main>
  );
}
