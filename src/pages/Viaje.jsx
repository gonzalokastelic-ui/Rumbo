import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarBlank,
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
import { diasEntre, diasParaViaje, formatoCorto, formatoLargo } from '../lib/fechas.js';
import { estaVencido, mensajeError, puedeEditar, resumenItems, ROLES, sincronizarPasajeros } from '../lib/viajes.js';
import { pasajerosDe } from '../data/pasajeros.js';
import { RangoFechas } from '../components/Calendario.jsx';
import PasajerosEditor, { limpiarPasajeros, validarPasajeros } from '../components/Pasajeros.jsx';
import Itinerario from './viaje/Itinerario.jsx';
import Checklist from './viaje/Checklist.jsx';
import Recomendados from './viaje/Recomendados.jsx';
import Presupuesto from './viaje/Presupuesto.jsx';
import Grupo from './viaje/Grupo.jsx';

const TABS = [
  { id: 'checklist', nombre: 'Checklist', Icono: ListChecks },
  { id: 'itinerario', nombre: 'Itinerario', Icono: CalendarBlank },
  { id: 'recomendados', nombre: 'Recomendados', Icono: Sparkle },
  { id: 'presupuesto', nombre: 'Presupuesto', Icono: Wallet },
  { id: 'grupo', nombre: 'Grupo', Icono: Users },
];

function EditarViaje({ trip, items, user, perfil, store, onClose }) {
  const toast = useToast();
  const [nombre, setNombre] = useState(trip.nombre);
  const [fechas, setFechas] = useState({ desde: trip.fechaIda, hasta: trip.fechaVuelta });
  const [pasajeros, setPasajeros] = useState(() => pasajerosDe(trip, user, perfil));
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const guardar = async (ev) => {
    ev.preventDefault();
    const e = { ...validarPasajeros(pasajeros) };
    if (!nombre.trim()) e.nombre = 'El viaje necesita un nombre.';
    if (!fechas.desde || !fechas.hasta) e.fechas = 'Elegí la salida y la vuelta.';
    else if (diasEntre(fechas.desde, fechas.hasta) > 90) e.fechas = 'El viaje no puede superar los 90 días.';
    setErrores(e);
    if (Object.keys(e).length) return;

    setGuardando(true);
    try {
      const lista = limpiarPasajeros(pasajeros);
      await store.updateTrip(trip.id, {
        nombre: nombre.trim().slice(0, 80),
        fechaIda: fechas.desde,
        fechaVuelta: fechas.hasta,
        viajeros: lista.length,
        pasajeros: lista,
      });
      // Ajusta los tramites por persona y suma requisitos nuevos (por ejemplo, si se agrego un menor)
      const { cambios, nuevos } = sincronizarPasajeros(trip, items, lista);
      await Promise.all([
        ...cambios.map((c) => store.updateItem(trip.id, c.id, c.patch)),
        ...nuevos.map((it) => store.addItem(trip.id, it)),
      ]);
      toast.ok(
        nuevos.length
          ? `Viaje actualizado. Sumamos ${nuevos.length} ${nuevos.length === 1 ? 'requisito' : 'requisitos'} por los pasajeros.`
          : 'Viaje actualizado.',
      );
      onClose();
    } catch (err) {
      toast.error(mensajeError(err));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo="Editar viaje" onClose={onClose}>
      <form className="modal__form edit-trip" onSubmit={guardar} noValidate>
        <div className="field">
          <label htmlFor="e-nombre">Nombre</label>
          <input id="e-nombre" className="input" value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} />
          {errores.nombre && <span className="field__error">{errores.nombre}</span>}
        </div>
        <div className="field">
          <span className="field__label">Fechas</span>
          <RangoFechas desde={fechas.desde} hasta={fechas.hasta} onChange={setFechas} error={errores.fechas} />
        </div>
        <div className="field">
          <span className="field__label">Pasajeros</span>
          <PasajerosEditor pasajeros={pasajeros} onChange={setPasajeros} uidTitular={user.uid} errores={errores} />
        </div>
        <div className="modal__foot">
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
  const { user, perfil, store } = useAuth();
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
            {tab === 'itinerario' && <Itinerario trip={trip} editable={editable} store={store} />}
            {tab === 'recomendados' && <Recomendados trip={trip} items={items} editable={editable} store={store} />}
            {tab === 'presupuesto' && <Presupuesto trip={trip} items={items} />}
            {tab === 'grupo' && <Grupo trip={trip} user={user} store={store} />}
          </div>
        </main>
      </div>

      {editando && (
        <EditarViaje trip={trip} items={items} user={user} perfil={perfil} store={store} onClose={() => setEditando(false)} />
      )}
      {eliminando && <EliminarViaje trip={trip} store={store} onClose={() => setEliminando(false)} />}
    </>
  );
}
