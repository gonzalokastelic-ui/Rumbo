import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarBlank, Plus, SuitcaseRolling, WarningCircle } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSub } from '../lib/useSub.js';
import { DESTINOS_POR_ID, foto } from '../data/destinos.js';
import { diasParaViaje, formatoCorto, hoyISO } from '../lib/fechas.js';
import { ROLES } from '../lib/viajes.js';
import Nav from '../components/Nav.jsx';
import { Avatar, Reveal } from '../components/ui.jsx';

function TarjetaViaje({ trip, uid, i }) {
  const dest = DESTINOS_POR_ID[trip.destinoId];
  const rol = trip.miembros?.[uid];
  const dias = diasParaViaje(trip.fechaIda);
  const res = trip.resumen || { total: 0, listos: 0 };
  const avance = res.total ? res.listos / res.total : 0;
  const miembros = Object.entries(trip.miembrosInfo || {});

  return (
    <Reveal as="div" i={i % 4}>
      <Link to={`/viaje/${trip.id}`} className="trip-card glass">
        <div className="trip-card__img">
          <img src={foto(trip.destinoId, 'sm')} alt="" loading="lazy" decoding="async" />
          {dias != null && dias >= 0 && (
            <span className="chip trip-card__count">
              <CalendarBlank size={14} /> {dias === 0 ? 'Es hoy' : `Faltan ${dias} días`}
            </span>
          )}
          {dias != null && dias < 0 && <span className="chip trip-card__count">Viaje realizado</span>}
        </div>
        <div className="trip-card__body">
          <div>
            <p className="trip-card__dest">{dest?.ciudadPrincipal || trip.destinoId}</p>
            <h3>{trip.nombre}</h3>
            <p className="muted trip-card__dates mono">
              {trip.fechaIda ? `${formatoCorto(trip.fechaIda)} a ${formatoCorto(trip.fechaVuelta)}` : 'Sin fechas'}
            </p>
          </div>
          <div>
            <div className="trip-card__prog">
              <span className="mono">
                {res.listos} de {res.total}
              </span>
              <span className="muted">listos</span>
            </div>
            <div className="bar">
              <span style={{ transform: `scaleX(${avance})` }} />
            </div>
          </div>
          <div className="trip-card__foot">
            <span className="avatars">
              {miembros.slice(0, 4).map(([id, m]) => (
                <Avatar key={id} nombre={m.nombre} foto={m.foto} />
              ))}
            </span>
            {rol && rol !== 'owner' && <span className="chip">{ROLES[rol]}</span>}
            <ArrowRight size={18} className="trip-card__go" />
          </div>
        </div>
      </Link>
    </Reveal>
  );
}

export default function Dashboard() {
  const { user, store } = useAuth();
  const { data, error, cargando } = useSub(
    (ok, ko) => store.subscribeTrips(user.uid, ok, ko),
    [store, user.uid],
  );

  const viajes = useMemo(
    () =>
      [...(data || [])].sort((a, b) => {
        const hoy = hoyISO();
        const fa = a.fechaIda >= hoy ? a.fechaIda : `9${a.fechaIda}`;
        const fb = b.fechaIda >= hoy ? b.fechaIda : `9${b.fechaIda}`;
        return fa < fb ? -1 : 1;
      }),
    [data],
  );

  return (
    <>
      <div className="stage stage--aurora" aria-hidden="true" />
      <div className="page">
        <Nav />
        <main className="app container">
          <header className="app__head">
            <div>
              <h1 className="app__title">Mis viajes</h1>
              <p className="muted">Hola, {user.displayName.split(' ')[0]}. Esto es lo que tenés en marcha.</p>
            </div>
            <Link to="/viajes/nuevo" className="btn btn--primary">
              <Plus size={18} weight="bold" />
              Nuevo viaje
            </Link>
          </header>

          {cargando && (
            <div className="trip-grid" aria-busy="true">
              {[0, 1, 2].map((n) => (
                <div key={n} className="skeleton trip-skel" />
              ))}
            </div>
          )}

          {error && (
            <div className="empty glass" role="alert">
              <WarningCircle size={36} weight="fill" />
              <h2>No pudimos cargar tus viajes</h2>
              <p className="muted">Revisá tu conexión y las reglas de Firestore, y volvé a intentar.</p>
              <button type="button" className="btn btn--glass" onClick={() => window.location.reload()}>
                Reintentar
              </button>
            </div>
          )}

          {!cargando && !error && viajes.length === 0 && (
            <div className="empty glass">
              <SuitcaseRolling size={40} weight="duotone" />
              <h2>Todavía no armaste ningún viaje</h2>
              <p className="muted">Elegí un destino y te generamos el checklist con todo lo que necesitás resolver.</p>
              <Link to="/viajes/nuevo" className="btn btn--primary">
                Armar mi primer viaje
                <span className="btn__ico">
                  <ArrowRight size={16} weight="bold" />
                </span>
              </Link>
            </div>
          )}

          {viajes.length > 0 && (
            <div className="trip-grid">
              {viajes.map((t, i) => (
                <TarjetaViaje key={t.id} trip={t} uid={user.uid} i={i} />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
