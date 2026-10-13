import { useMemo, useState } from 'react';
import { ArrowUpRight, Bed, Info, Plus, Star } from '@phosphor-icons/react';
import { DESTINOS_POR_ID } from '../../data/destinos.js';
import { calendario, datosDestino, linkBrek, linkVuelos, REFERENCIA, resumenPrecios } from '../../lib/recomendados.js';
import { diasEntre, formatoCorto, formatoLargo, sumarDias } from '../../lib/fechas.js';
import { mensajeError } from '../../lib/viajes.js';
import { useToast } from '../../components/ui.jsx';

export default function Recomendados({ trip, items, editable, store }) {
  const toast = useToast();
  const dest = DESTINOS_POR_ID[trip.destinoId];
  const datos = datosDestino(trip.destinoId);
  const cal = useMemo(() => calendario(trip.destinoId), [trip.destinoId]);
  const resumen = resumenPrecios(trip.destinoId);
  const max = Math.max(...cal.map((c) => c.precio));
  const noches = trip.fechaIda && trip.fechaVuelta ? diasEntre(trip.fechaIda, trip.fechaVuelta) : 7;

  const [sel, setSel] = useState(resumen?.fechaMin);
  const seleccionado = cal.find((c) => c.fecha === sel) || cal[0];

  const linkConFechasDelViaje = linkVuelos({
    destinoId: trip.destinoId,
    ida: trip.fechaIda,
    vuelta: trip.fechaVuelta,
    viajeros: trip.viajeros,
  });
  const linkDiaElegido = linkVuelos({
    destinoId: trip.destinoId,
    ida: seleccionado?.fecha,
    vuelta: seleccionado ? sumarDias(seleccionado.fecha, noches) : undefined,
    viajeros: trip.viajeros,
  });

  const itemVuelos = items.find((i) => i.clave === 'vuelos');

  const guardarCostoVuelos = async () => {
    if (!itemVuelos || !seleccionado) return;
    try {
      await store.updateItem(trip.id, itemVuelos.id, { costo: seleccionado.precio * trip.viajeros });
      toast.ok(`Costo de vuelos estimado en USD ${seleccionado.precio * trip.viajeros}.`);
    } catch (e) {
      toast.error(mensajeError(e));
    }
  };

  const agregar = async (datosItem, mensaje) => {
    try {
      await store.addItem(trip.id, {
        estado: 'pendiente',
        fechaLimite: null,
        costo: null,
        notas: '',
        link: '',
        asignadoA: null,
        predeterminado: false,
        clave: null,
        desc: '',
        orden: Date.now() % 1000000,
        ...datosItem,
      });
      toast.ok(mensaje);
    } catch (e) {
      toast.error(mensajeError(e));
    }
  };

  const yaAgregado = (titulo) => items.some((i) => i.titulo === titulo);

  return (
    <div className="recs-tab">
      <p className="notice">
        <Info size={18} weight="fill" />
        <span>
          Datos de referencia de SlickTrip y Brek consultados el {formatoLargo(REFERENCIA.consultado)}. Los precios y la
          disponibilidad en vivo están en cada sitio, al que llegás con tus fechas ya cargadas.
        </span>
      </p>

      {/* ---- Vuelos ---- */}
      <section className="glass rec-card" aria-labelledby="rec-vuelos">
        <header className="rec-card__head">
          <div>
            <h2 id="rec-vuelos" className="rec-card__title">
              Vuelos a {dest.ciudadPrincipal}
            </h2>
            <p className="muted">
              Precio por persona, ida y vuelta de {noches} noches, desde Buenos Aires. Tocá un día para ver el precio.
            </p>
          </div>
          {resumen && (
            <div className="rec-card__big">
              <span className="muted">desde</span>
              <strong className="mono">USD {resumen.min}</strong>
            </div>
          )}
        </header>

        <div className="bars bars--lg" role="listbox" aria-label="Días de salida">
          {cal.map((c) => (
            <button
              key={c.fecha}
              type="button"
              role="option"
              aria-selected={c.fecha === seleccionado?.fecha}
              className={`${c.precio === resumen?.min ? 'is-min' : ''} ${c.fecha === seleccionado?.fecha ? 'is-sel' : ''}`}
              style={{ '--h': `${Math.max(12, (c.precio / max) * 100)}%` }}
              onClick={() => setSel(c.fecha)}
              aria-label={`Salida ${formatoCorto(c.fecha)}: USD ${c.precio}`}
            />
          ))}
        </div>
        <div className="bars__axis mono muted">
          <span>{formatoCorto(cal[0].fecha)}</span>
          <span>{formatoCorto(cal[cal.length - 1].fecha)}</span>
        </div>

        <footer className="rec-card__foot">
          <div>
            <p className="rec-card__sel">
              Salida del <strong>{formatoCorto(seleccionado.fecha)}</strong>:{' '}
              <strong className="mono">USD {seleccionado.precio}</strong>
              {trip.viajeros > 1 && (
                <span className="muted mono"> (x{trip.viajeros} = USD {seleccionado.precio * trip.viajeros})</span>
              )}
            </p>
            {datos.aerolineas.length > 0 && (
              <p className="muted rec-card__air">Vuelos directos: {datos.aerolineas.join(', ')}.</p>
            )}
          </div>
          <div className="rec-card__actions">
            {editable && itemVuelos && (
              <button type="button" className="btn btn--glass btn--sm" onClick={guardarCostoVuelos}>
                <Plus size={16} /> Usar como estimado
              </button>
            )}
            <a className="btn btn--primary btn--sm" href={trip.fechaIda ? linkConFechasDelViaje : linkDiaElegido} target="_blank" rel="noreferrer">
              Ver vuelos en SlickTrip <ArrowUpRight size={16} />
            </a>
          </div>
        </footer>
        {trip.fechaIda && (
          <p className="muted rec-card__fine">
            El botón usa las fechas de tu viaje ({formatoCorto(trip.fechaIda)} a {formatoCorto(trip.fechaVuelta)}).
            <a href={linkDiaElegido} target="_blank" rel="noreferrer">
              {' '}
              Buscar con el día elegido.
            </a>
          </p>
        )}
      </section>

      {/* ---- Hoteles ---- */}
      <section aria-labelledby="rec-hoteles">
        <div className="rec-section__head">
          <h2 id="rec-hoteles" className="rec-card__title">
            Alojamiento en {dest.ciudadPrincipal}
          </h2>
          <a href={linkBrek} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
            Buscar en Brek <ArrowUpRight size={16} />
          </a>
        </div>

        {datos.hoteles.length === 0 ? (
          <div className="glass glass--md rec-empty">
            <Bed size={28} weight="duotone" />
            <p>
              Brek todavía no muestra alojamientos publicados para {dest.ciudadPrincipal}. Probá buscar directamente en
              su sitio con tus fechas.
            </p>
          </div>
        ) : (
          <>
            <p className="muted rec-section__sub">
              Precios mayoristas de Brek: la banda es orientativa para {REFERENCIA.hotel.adults} adultos y 7 noches, el
              precio exacto se ve al entrar.
            </p>
            <ul className="hotels">
              {datos.hoteles.map((h) => (
                <li key={h.id} className="hotel glass">
                  <div className="hotel__img">
                    <img src={h.foto} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                    {h.reembolsable && <span className="chip hotel__badge">Reembolsable</span>}
                  </div>
                  <div className="hotel__body">
                    <p className="hotel__type muted">
                      {h.tipo} <span className="mono">{'★'.repeat(Math.round(h.estrellas))}</span>
                    </p>
                    <h3>{h.nombre}</h3>
                    <p className="hotel__score">
                      <Star size={14} weight="fill" />
                      <span className="mono">{h.puntaje}</span>
                      <span className="muted">({h.resenas} reseñas)</span>
                    </p>
                    {h.destacados.length > 0 && <p className="muted hotel__tags">{h.destacados.join(', ')}</p>}
                    <div className="hotel__foot">
                      {h.banda && <span className="mono hotel__band">USD {h.banda}</span>}
                      <div className="hotel__btns">
                        {editable && (
                          <button
                            type="button"
                            className="icon-btn"
                            title="Guardar en el checklist"
                            aria-label={`Guardar ${h.nombre} en el checklist`}
                            disabled={yaAgregado(`Alojamiento: ${h.nombre}`)}
                            onClick={() =>
                              agregar(
                                {
                                  titulo: `Alojamiento: ${h.nombre}`,
                                  categoria: 'alojamiento',
                                  link: h.url,
                                  desc: 'Opción guardada desde las recomendaciones de Brek.',
                                },
                                'Alojamiento guardado en tu checklist.',
                              )
                            }
                          >
                            <Plus size={18} />
                          </button>
                        )}
                        <a className="btn btn--glass btn--sm" href={h.url} target="_blank" rel="noreferrer">
                          Ver en Brek <ArrowUpRight size={15} />
                        </a>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* ---- Actividades ---- */}
      <section className="glass rec-card" aria-labelledby="rec-act">
        <h2 id="rec-act" className="rec-card__title">
          Actividades para sumar
        </h2>
        <ul className="acts">
          {dest.actividades.map((a) => {
            const costoTotal = a.costo * trip.viajeros;
            return (
              <li key={a.titulo}>
                <div>
                  <p className="acts__t">{a.titulo}</p>
                  <p className="muted mono">
                    {a.costo ? `USD ${a.costo} por persona` : 'Sin costo de entrada'}
                  </p>
                </div>
                {editable && (
                  <button
                    type="button"
                    className="btn btn--glass btn--sm"
                    disabled={yaAgregado(a.titulo)}
                    onClick={() =>
                      agregar(
                        { titulo: a.titulo, categoria: 'actividades', costo: costoTotal || null },
                        'Actividad agregada al checklist.',
                      )
                    }
                  >
                    {yaAgregado(a.titulo) ? 'Agregada' : (
                      <>
                        <Plus size={16} /> Agregar
                      </>
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <p className="muted rec-card__fine">Costos orientativos por persona. Confirmá precios y horarios con cada lugar.</p>
      </section>
    </div>
  );
}
