import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  DotsThreeVertical,
  ListChecks,
  LockSimple,
  PencilSimple,
  ShareNetwork,
  Sparkle,
  Trash,
  Users,
  Wallet,
} from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSub } from '../lib/useSub.js';
import Nav from '../components/Nav.jsx';
import { Cargando, Modal, ProgressRing, useToast } from '../components/ui.jsx';
import { DESTINOS_POR_ID, foto } from '../data/destinos.js';
import { verificadoPara } from '../data/requisitos.js';
import { diasParaViaje, formatoCorto, formatoLargo } from '../lib/fechas.js';
import { estaVencido, mensajeError, puedeEditar, resumenItems, ROLES } from '../lib/viajes.js';
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

function EditarViaje({ trip, store, onClose }) {
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

function EliminarViaje({ trip, store, onClose }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [borrando, setBorrando] = useState(false);

  const confirmar = async () => {
    setBorrando(true);
    try {
      await store.deleteTrip(trip.id);
      toast.ok('Viaje eliminado.');
      navigate('/viajes', { replace: true });
    } catch (e) {
      toast.error(mensajeError(e));
      setBorrando(false);
    }
  };

  return (
    <Modal titulo="Eliminar viaje" onClose={onClose}>
      <p className="muted">
        Se borran <strong>{trip.nombre}</strong>, su checklist y los accesos de todo el grupo. No se puede deshacer.
      </p>
      <div className="modal__foot">
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn btn--primary" onClick={confirmar} disabled={borrando}>
          {borrando && <span className="spinner" />}
          Eliminar definitivamente
        </button>
      </div>
    </Modal>
  );
}

function MenuViaje({ onEditar, onCompartir, onEliminar }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => !ref.current?.contains(e.target) && setAbierto(false);
    const tecla = (e) => e.key === 'Escape' && setAbierto(false);
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto]);

  const accion = (fn) => () => {
    setAbierto(false);
    fn();
  };

  return (
    <div className="menu" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label="Más acciones del viaje"
        onClick={() => setAbierto((v) => !v)}
      >
        <DotsThreeVertical size={22} weight="bold" />
      </button>
      {abierto && (
        <div className="menu__list glass glass--md" role="menu">
          <button type="button" role="menuitem" onClick={accion(onEditar)}>
            <PencilSimple size={18} /> Editar viaje
          </button>
          <button type="button" role="menuitem" onClick={accion(onCompartir)}>
            <ShareNetwork size={18} /> Compartir
          </button>
          <button type="button" role="menuitem" className="is-danger" onClick={accion(onEliminar)}>
            <Trash size={18} /> Eliminar viaje
          </button>
        </div>
      )}
    </div>
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
  const [eliminando, setEliminando] = useState(false);

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
          <main className="trip container">
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
  const verificado = verificadoPara(trip.destinoId);
  const vencidos = (items || []).filter(estaVencido).length;
  const nota = verificado
    ? `Los requisitos de ingreso cambian. Esta lista se armó con información pública al ${formatoLargo(verificado)}: confirmá cada trámite en el sitio oficial.`
    : null;

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

          <header className="tv-head glass">
            <div className="tv-head__text">
              <p className="tv-head__dest">
                {dest?.ciudadPrincipal}, {dest?.nombre}
                {rol && rol !== 'owner' && <span className="tv-head__role">{ROLES[rol]}</span>}
              </p>
              <h1 className="tv-head__title">{trip.nombre}</h1>
              <p className="tv-head__meta">
                <span className="mono">
                  {formatoCorto(trip.fechaIda)} a {formatoCorto(trip.fechaVuelta)}
                </span>
                <span>
                  {trip.viajeros} {trip.viajeros === 1 ? 'viajero' : 'viajeros'}
                </span>
                {dias != null && dias >= 0 && <span className="is-accent">Faltan {dias} días</span>}
                {vencidos > 0 && (
                  <span className="is-accent">
                    {vencidos} {vencidos === 1 ? 'vencido' : 'vencidos'}
                  </span>
                )}
              </p>
            </div>
            <ProgressRing value={progreso.avance} size={68} stroke={6} />
            {rol === 'owner' && (
              <MenuViaje
                onEditar={() => setEditando(true)}
                onCompartir={() => setParams({ tab: 'grupo' })}
                onEliminar={() => setEliminando(true)}
              />
            )}
          </header>

          <nav className="tv-tabs" aria-label="Secciones del viaje">
            {TABS.map(({ id: tid, nombre, Icono }) => (
              <button
                key={tid}
                type="button"
                className={tab === tid ? 'is-on' : ''}
                aria-current={tab === tid ? 'page' : undefined}
                onClick={() => {
                  setParams(tid === 'checklist' ? {} : { tab: tid });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <Icono size={22} weight={tab === tid ? 'fill' : 'regular'} />
                <span>{nombre}</span>
              </button>
            ))}
          </nav>

          <div className="trip-body">
            {tab === 'checklist' && <Checklist trip={trip} items={items} editable={editable} store={store} nota={nota} />}
            {tab === 'recomendados' && <Recomendados trip={trip} items={items} editable={editable} store={store} />}
            {tab === 'presupuesto' && <Presupuesto trip={trip} items={items} />}
            {tab === 'grupo' && <Grupo trip={trip} user={user} store={store} />}
          </div>
        </main>
      </div>

      {editando && <EditarViaje trip={trip} store={store} onClose={() => setEditando(false)} />}
      {eliminando && <EliminarViaje trip={trip} store={store} onClose={() => setEliminando(false)} />}
    </>
  );
}
