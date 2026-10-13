import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarBlank,
  ListChecks,
  LockSimple,
  PencilSimple,
  ShareNetwork,
  Sparkle,
  Users,
  Wallet,
} from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSub } from '../lib/useSub.js';
import Nav from '../components/Nav.jsx';
import { Cargando, Modal, ProgressRing, useToast } from '../components/ui.jsx';
import { DESTINOS_POR_ID, foto } from '../data/destinos.js';
import { verificadoPara } from '../data/requisitos.js';
import { diasEntre, diasParaViaje, fechaLimite, formatoCorto, formatoLargo, hoyISO } from '../lib/fechas.js';
import { mensajeError, puedeEditar, resumenItems, ROLES } from '../lib/viajes.js';
import Checklist from './viaje/Checklist.jsx';
import Recomendados from './viaje/Recomendados.jsx';
import Presupuesto from './viaje/Presupuesto.jsx';
import Grupo from './viaje/Grupo.jsx';

const TABS = [
  { id: 'checklist', nombre: 'Checklist', Icono: ListChecks },
  { id: 'recomendados', nombre: 'Recomendados', Icono: Sparkle },
  { id: 'presupuesto', nombre: 'Presupuesto', Icono: Wallet },
  { id: 'grupo', nombre: 'Grupo', Icono: Users },
];

function EditarViaje({ trip, items, store, onClose }) {
  const toast = useToast();
  const [nombre, setNombre] = useState(trip.nombre);
  const [ida, setIda] = useState(trip.fechaIda);
  const [vuelta, setVuelta] = useState(trip.fechaVuelta);
  const [viajeros, setViajeros] = useState(trip.viajeros);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const guardar = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (!nombre.trim()) e.nombre = 'El viaje necesita un nombre.';
    if (!ida) e.ida = 'Elegí la fecha de salida.';
    if (!vuelta) e.vuelta = 'Elegí la fecha de regreso.';
    else if (ida && vuelta <= ida) e.vuelta = 'El regreso tiene que ser después de la salida.';
    if (!(viajeros >= 1 && viajeros <= 20)) e.viajeros = 'Entre 1 y 20 viajeros.';
    setErrores(e);
    if (Object.keys(e).length) return;

    setGuardando(true);
    try {
      await store.updateTrip(trip.id, {
        nombre: nombre.trim().slice(0, 80),
        fechaIda: ida,
        fechaVuelta: vuelta,
        viajeros: Number(viajeros),
      });
      if (ida !== trip.fechaIda) {
        // Los ítems predeterminados recalculan su fecha límite con la nueva salida
        await Promise.all(
          items
            .filter((i) => i.predeterminado && i.diasAntes != null)
            .map((i) => store.updateItem(trip.id, i.id, { fechaLimite: fechaLimite(ida, i.diasAntes) })),
        );
      }
      toast.ok('Viaje actualizado.');
      onClose();
    } catch (err) {
      toast.error(mensajeError(err));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo="Editar viaje" onClose={onClose}>
      <form className="form-grid modal__form" onSubmit={guardar} noValidate>
        <div className="field form-grid__wide">
          <label htmlFor="e-nombre">Nombre</label>
          <input id="e-nombre" className="input" value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} />
          {errores.nombre && <span className="field__error">{errores.nombre}</span>}
        </div>
        <div className="field">
          <label htmlFor="e-ida">Salida</label>
          <input id="e-ida" type="date" className="input" value={ida} onChange={(e) => setIda(e.target.value)} />
          {errores.ida && <span className="field__error">{errores.ida}</span>}
        </div>
        <div className="field">
          <label htmlFor="e-vuelta">Regreso</label>
          <input id="e-vuelta" type="date" className="input" min={ida} value={vuelta} onChange={(e) => setVuelta(e.target.value)} />
          {errores.vuelta && <span className="field__error">{errores.vuelta}</span>}
        </div>
        <div className="field form-grid__wide">
          <label htmlFor="e-viajeros">Cantidad de viajeros</label>
          <input
            id="e-viajeros"
            type="number"
            min="1"
            max="20"
            className="input"
            value={viajeros}
            onChange={(e) => setViajeros(e.target.value)}
          />
          {errores.viajeros && <span className="field__error">{errores.viajeros}</span>}
        </div>
        {ida !== trip.fechaIda && (
          <p className="field__hint form-grid__wide">Al cambiar la salida, las fechas límite de la lista se recalculan.</p>
        )}
        <div className="form-grid__wide modal__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={guardando}>
            {guardando && <span className="spinner" />}
            Guardar cambios
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Mensaje({ icono, titulo, texto }) {
  return (
    <>
      <div className="stage stage--aurora" aria-hidden="true" />
      <div className="page">
        <Nav />
        <main className="app container">
          <div className="empty glass">
            {icono}
            <h2>{titulo}</h2>
            <p className="muted">{texto}</p>
            <Link to="/viajes" className="btn btn--glass">
              <ArrowLeft size={16} /> Volver a mis viajes
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}

export default function Viaje() {
  const { id } = useParams();
  const { user, store } = useAuth();
  const [params, setParams] = useSearchParams();
  const [editando, setEditando] = useState(false);

  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'checklist';

  const viaje = useSub((ok, ko) => store.subscribeTrip(id, ok, ko), [store, id]);
  const lista = useSub((ok, ko) => store.subscribeItems(id, ok, ko), [store, id]);

  const trip = viaje.data;
  const items = lista.data;
  const editable = puedeEditar(trip, user.uid);
  const rol = trip?.miembros?.[user.uid];

  const progreso = useMemo(() => resumenItems(items || []), [items]);

  // Mantiene el resumen del viaje al dia para mostrarlo en "Mis viajes"
  const ultimoResumen = useRef('');
  useEffect(() => {
    if (!trip || !items || !editable) return;
    const clave = `${progreso.total}/${progreso.listos}/${progreso.tramite}`;
    const guardado = trip.resumen ? `${trip.resumen.total}/${trip.resumen.listos}/${trip.resumen.tramite ?? 0}` : '';
    if (clave === guardado || clave === ultimoResumen.current) return;
    ultimoResumen.current = clave;
    store
      .updateTrip(trip.id, { resumen: { total: progreso.total, listos: progreso.listos, tramite: progreso.tramite } })
      .catch(() => {
        ultimoResumen.current = '';
      });
  }, [trip, items, editable, progreso, store]);

  if (viaje.error) {
    const denegado = viaje.error.code === 'permission-denied';
    return (
      <Mensaje
        icono={<LockSimple size={38} weight="duotone" />}
        titulo={denegado ? 'No tenés acceso a este viaje' : 'No pudimos abrir el viaje'}
        texto={
          denegado
            ? 'Pedile a quien lo organiza que te comparta un link de invitación.'
            : 'Revisá tu conexión e intentá de nuevo.'
        }
      />
    );
  }

  if (viaje.cargando || lista.cargando) {
    return (
      <>
        <div className="stage stage--aurora" aria-hidden="true" />
        <div className="page">
          <Nav />
          <main className="app container">
            <div className="skeleton trip-head-skel" />
            <Cargando texto="Abriendo tu viaje" />
          </main>
        </div>
      </>
    );
  }

  if (!trip) {
    return (
      <Mensaje
        icono={<LockSimple size={38} weight="duotone" />}
        titulo="Este viaje no existe"
        texto="Puede que lo hayan eliminado o que el link no sea correcto."
      />
    );
  }

  const dest = DESTINOS_POR_ID[trip.destinoId];
  const dias = diasParaViaje(trip.fechaIda);
  const noches = diasEntre(trip.fechaIda, trip.fechaVuelta);
  const verificado = verificadoPara(trip.destinoId);
  const vencidos = (items || []).filter(
    (i) => i.estado !== 'listo' && i.fechaLimite && i.fechaLimite < hoyISO(),
  ).length;

  return (
    <>
      <div className="stage stage--calm" aria-hidden="true">
        <img className="stage__img is-on" src={foto(trip.destinoId)} alt="" decoding="async" />
      </div>
      <div className="page">
        <Nav />
        <main className="trip container">
          <Link to="/viajes" className="wizard__back">
            <ArrowLeft size={16} /> Mis viajes
          </Link>

          <header className="trip-head glass">
            <div className="trip-head__main">
              <p className="trip-head__dest">
                {dest?.ciudadPrincipal}, {dest?.nombre}
              </p>
              <h1 className="trip-head__title">{trip.nombre}</h1>
              <div className="trip-head__chips">
                <span className="chip">
                  <CalendarBlank size={14} /> {formatoLargo(trip.fechaIda)} a {formatoCorto(trip.fechaVuelta)}
                </span>
                <span className="chip">{noches} noches</span>
                <span className="chip">
                  <Users size={14} /> {trip.viajeros} {trip.viajeros === 1 ? 'viajero' : 'viajeros'}
                </span>
                {dias != null && dias >= 0 && <span className="chip chip--red">Faltan {dias} días</span>}
                {rol && rol !== 'owner' && <span className="chip">{ROLES[rol]}</span>}
              </div>
              <div className="trip-head__actions">
                {rol === 'owner' && (
                  <>
                    <button type="button" className="btn btn--glass btn--sm" onClick={() => setEditando(true)}>
                      <PencilSimple size={16} /> Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => setParams({ tab: 'grupo' })}
                    >
                      <ShareNetwork size={16} /> Compartir
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="trip-head__progress">
              <ProgressRing value={progreso.avance} size={104} stroke={8} />
              <p className="mono">
                {progreso.listos} de {progreso.total}
              </p>
              <p className="muted trip-head__small">
                {vencidos > 0 ? `${vencidos} con fecha vencida` : progreso.tramite > 0 ? `${progreso.tramite} en trámite` : 'listos'}
              </p>
            </div>
          </header>

          <nav className="tabs glass" aria-label="Secciones del viaje">
            {TABS.map(({ id: tid, nombre, Icono }) => (
              <button
                key={tid}
                type="button"
                className={tab === tid ? 'is-on' : ''}
                aria-label={nombre}
                aria-current={tab === tid ? 'page' : undefined}
                onClick={() => setParams(tid === 'checklist' ? {} : { tab: tid })}
              >
                <Icono size={18} weight={tab === tid ? 'fill' : 'regular'} />
                <span>{nombre}</span>
              </button>
            ))}
          </nav>

          <div className="trip-body">
            {tab === 'checklist' && (
              <>
                {verificado && (
                  <p className="notice">
                    Los requisitos de ingreso cambian. Esta lista se armó con información pública al{' '}
                    {formatoLargo(verificado)}: confirmá cada trámite en el link oficial de cada ítem.
                  </p>
                )}
                <Checklist trip={trip} items={items} editable={editable} store={store} />
              </>
            )}
            {tab === 'recomendados' && <Recomendados trip={trip} items={items} editable={editable} store={store} />}
            {tab === 'presupuesto' && <Presupuesto trip={trip} items={items} />}
            {tab === 'grupo' && <Grupo trip={trip} user={user} store={store} />}
          </div>
        </main>
      </div>

      {editando && <EditarViaje trip={trip} items={items} store={store} onClose={() => setEditando(false)} />}
    </>
  );
}
