import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CaretRight, Clock, DotsSixVertical, MapPin, Plus, SortAscending, Trash, X } from '@phosphor-icons/react';
import { useSub } from '../../lib/useSub.js';
import { diasDelViaje, formatoDia, hoyISO, parseISO, sumarDias } from '../../lib/fechas.js';
import { mensajeError } from '../../lib/viajes.js';
import { Cargando, useToast } from '../../components/ui.jsx';

const porOrden = (a, b) => (a.orden ?? 0) - (b.orden ?? 0);

const SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const lunesDe = (iso) => sumarDias(iso, -((parseISO(iso).getDay() + 6) % 7));
const domingoDe = (iso) => sumarDias(iso, (7 - parseISO(iso).getDay()) % 7);

function tituloMeses(desde, hasta) {
  const a = parseISO(desde);
  const b = parseISO(hasta);
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `${MESES_LARGO[a.getMonth()]} ${a.getFullYear()}`;
  if (a.getFullYear() === b.getFullYear()) return `${MESES_LARGO[a.getMonth()]} y ${MESES_LARGO[b.getMonth()]} ${b.getFullYear()}`;
  return `${MESES_LARGO[a.getMonth()]} ${a.getFullYear()} y ${MESES_LARGO[b.getMonth()]} ${b.getFullYear()}`;
}

// Calendario del viaje: semanas de lunes a domingo; los dias fuera del viaje quedan apagados
function CalendarioViaje({ dias, porDia, seleccion, onSeleccionar }) {
  const enViaje = new Map(dias.map((d) => [d.fecha, d]));
  const inicio = lunesDe(dias[0].fecha);
  const fin = domingoDe(dias[dias.length - 1].fecha);
  const celdas = [];
  for (let f = inicio; f <= fin; f = sumarDias(f, 1)) celdas.push(f);
  const hoy = hoyISO();

  return (
    <div className="tcal">
      <p className="tcal__title">{tituloMeses(dias[0].fecha, dias[dias.length - 1].fecha)}</p>
      <div className="tcal__head" aria-hidden="true">
        {SEMANA.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="tcal__grid">
        {celdas.map((f) => {
          const d = enViaje.get(f);
          const fecha = parseISO(f);
          const numero = (
            <span className="tcal__num">
              {fecha.getDate()}
              {(fecha.getDate() === 1 || f === inicio) && <small> {MESES[fecha.getMonth()]}</small>}
            </span>
          );
          if (!d) {
            return (
              <div key={f} className="tcal__cell is-out" aria-hidden="true">
                {numero}
              </div>
            );
          }
          const evs = porDia.get(f) || [];
          return (
            <button
              key={f}
              type="button"
              className={`tcal__cell ${seleccion === f ? 'is-sel' : ''} ${f === hoy ? 'is-today' : ''}`}
              aria-pressed={seleccion === f}
              aria-label={`${d.etiqueta}: ${evs.length === 1 ? '1 actividad' : `${evs.length} actividades`}`}
              onClick={() => onSeleccionar(f)}
            >
              <span className="tcal__top">
                {numero}
                <span className="tcal__dia">Día {d.n}</span>
              </span>
              <span className="tcal__evs">
                {evs.slice(0, 3).map((e) => (
                  <span key={e.id} className="tcal__ev">
                    {e.hora && <b className="mono">{e.hora}</b>} {e.titulo}
                  </span>
                ))}
                {evs.length > 3 && <span className="tcal__more">+{evs.length - 3} más</span>}
              </span>
              {evs.length > 0 && (
                <span className="tcal__dots" aria-hidden="true">
                  {evs.slice(0, 4).map((e) => (
                    <i key={e.id} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Evento({ evento, editable, onAbrir }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: evento.id,
    disabled: !editable,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`row ev ${isDragging ? 'is-drag' : ''}`}
    >
      {editable && (
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="row__handle"
          aria-label={`Mover "${evento.titulo}"`}
          {...attributes}
          {...listeners}
        >
          <DotsSixVertical size={18} weight="bold" />
        </button>
      )}
      <span className={`ev__hora mono ${evento.hora ? '' : 'is-empty'}`}>{evento.hora || 'Sin hora'}</span>
      <button type="button" className="row__main" onClick={() => onAbrir(evento.id)} aria-label={`Abrir ${evento.titulo}`}>
        <span className="row__text">
          <span className="row__title">{evento.titulo}</span>
          {evento.lugar && (
            <span className="row__sub">
              <span>
                <MapPin size={12} weight="fill" /> {evento.lugar}
              </span>
            </span>
          )}
        </span>
        <CaretRight size={18} className="row__go" aria-hidden="true" />
      </button>
    </li>
  );
}

function Dia({ dia, eventos, editable, onAbrir, onAgregar, onReordenar }) {
  const [agregando, setAgregando] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [hora, setHora] = useState('');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const alSoltar = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const desde = eventos.findIndex((e) => e.id === active.id);
    const hasta = eventos.findIndex((e) => e.id === over.id);
    onReordenar(arrayMove(eventos, desde, hasta));
  };

  const ordenarPorHora = () => {
    const conHora = eventos.filter((e) => e.hora).sort((a, b) => (a.hora < b.hora ? -1 : 1));
    onReordenar([...conHora, ...eventos.filter((e) => !e.hora)]);
  };

  const enviar = async (ev) => {
    ev.preventDefault();
    if (!titulo.trim()) return;
    await onAgregar(dia.fecha, titulo.trim().slice(0, 120), hora || null);
    setTitulo('');
    setHora('');
  };

  const desordenado = eventos.some((e, i) => {
    const sig = eventos.slice(i + 1).find((x) => x.hora);
    return e.hora && sig && sig.hora < e.hora;
  });

  return (
    <section className="dia" aria-labelledby={`dia-${dia.fecha || 'fuera'}`}>
      <header className="dia__head">
        <h3 id={`dia-${dia.fecha || 'fuera'}`}>
          {dia.n ? `Día ${dia.n}` : 'Fuera de las fechas del viaje'}
          {dia.fecha && <span className="muted dia__fecha">{formatoDia(dia.fecha)}</span>}
        </h3>
        {editable && desordenado && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={ordenarPorHora}>
            <SortAscending size={16} /> Ordenar por hora
          </button>
        )}
      </header>

      {eventos.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={alSoltar}>
          <SortableContext items={eventos.map((e) => e.id)} strategy={verticalListSortingStrategy}>
            <ul className="rows">
              {eventos.map((e) => (
                <Evento key={e.id} evento={e} editable={editable} onAbrir={onAbrir} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="muted dia__vacio">Todavía no hay nada planeado.</p>
      )}

      {editable && dia.fecha && (
        <>
          {agregando ? (
            <form className="ev-add" onSubmit={enviar}>
              <input
                autoFocus
                className="input"
                placeholder="Ej: Paseo por Copacabana"
                aria-label={`Actividad para el día ${dia.n}`}
                value={titulo}
                maxLength={120}
                onChange={(e) => setTitulo(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setAgregando(false)}
              />
              <input
                type="time"
                className="input ev-add__hora"
                aria-label="Hora (opcional)"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
              <button type="submit" className="btn btn--primary btn--sm" disabled={!titulo.trim()}>
                Agregar
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAgregando(false)}>
                Listo
              </button>
            </form>
          ) : (
            <button type="button" className="btn btn--ghost btn--sm dia__add" onClick={() => setAgregando(true)}>
              <Plus size={16} weight="bold" /> Agregar al día
            </button>
          )}
        </>
      )}
    </section>
  );
}

function EventoDrawer({ evento, dias, editable, onPatch, onDelete, onClose }) {
  const cerrar = useRef(null);
  const tituloRef = useRef(null);

  const ajustar = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  useLayoutEffect(() => {
    const el = tituloRef.current;
    ajustar(el);
    const raf = requestAnimationFrame(() => ajustar(el));
    return () => cancelAnimationFrame(raf);
  }, [evento.titulo]);

  useEffect(() => {
    cerrar.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const blur = (campo, actual, transformar = (v) => v) => (e) => {
    const nuevo = transformar(e.target.value);
    if (nuevo !== actual) onPatch(evento, { [campo]: nuevo });
  };

  return (
    <>
      <div className="drawer-back" onMouseDown={onClose} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Actividad: ${evento.titulo}`}>
        <header className="drawer__head">
          <p className="drawer__cat">Itinerario</p>
          <button ref={cerrar} type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </header>

        <textarea
          key={`t-${evento.id}-${evento.titulo}`}
          ref={tituloRef}
          className="drawer__title"
          rows={1}
          defaultValue={evento.titulo}
          maxLength={120}
          disabled={!editable}
          aria-label="Actividad"
          onInput={(e) => ajustar(e.target)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), e.target.blur())}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (!v) {
              e.target.value = evento.titulo;
              return;
            }
            if (v !== evento.titulo) onPatch(evento, { titulo: v });
          }}
        />

        <div className="drawer__fields">
          <div className="field">
            <label htmlFor="e-dia">Día</label>
            <select
              id="e-dia"
              className="select"
              value={evento.fecha}
              disabled={!editable}
              onChange={(e) => onPatch(evento, { fecha: e.target.value, orden: Date.now() })}
            >
              {!dias.some((d) => d.fecha === evento.fecha) && <option value={evento.fecha}>{formatoDia(evento.fecha)} (fuera del viaje)</option>}
              {dias.map((d) => (
                <option key={d.fecha} value={d.fecha}>
                  {d.etiqueta}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="e-hora">
              <Clock size={14} style={{ verticalAlign: '-2px' }} /> Hora (opcional)
            </label>
            <div className="field__row">
              <input
                key={`h-${evento.hora || 'none'}`}
                id="e-hora"
                type="time"
                className="input"
                defaultValue={evento.hora || ''}
                disabled={!editable}
                onBlur={blur('hora', evento.hora || null, (v) => v || null)}
              />
              {editable && evento.hora && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => onPatch(evento, { hora: null })}>
                  Quitar
                </button>
              )}
            </div>
          </div>

          <div className="field">
            <label htmlFor="e-lugar">Lugar</label>
            <input
              key={`l-${evento.lugar || 'none'}`}
              id="e-lugar"
              className="input"
              placeholder="Dirección o punto de encuentro"
              defaultValue={evento.lugar || ''}
              maxLength={120}
              disabled={!editable}
              onBlur={blur('lugar', evento.lugar || '', (v) => v.trim())}
            />
          </div>

          <div className="field">
            <label htmlFor="e-notas">Notas</label>
            <textarea
              key={`n-${evento.notas || 'none'}`}
              id="e-notas"
              className="textarea"
              maxLength={600}
              defaultValue={evento.notas || ''}
              disabled={!editable}
              onBlur={blur('notas', evento.notas || '')}
            />
          </div>
        </div>

        {editable && (
          <footer className="drawer__foot">
            <button type="button" className="btn btn--ghost btn--sm btn--danger" onClick={() => onDelete(evento)}>
              <Trash size={16} /> Quitar del itinerario
            </button>
          </footer>
        )}
      </aside>
    </>
  );
}

export default function Itinerario({ trip, editable, store }) {
  const toast = useToast();
  const [abiertoId, setAbiertoId] = useState(null);
  const { data: eventos, cargando, error } = useSub(
    (ok, ko) => store.subscribeItinerario(trip.id, ok, ko),
    [store, trip.id],
  );
  const dias = useMemo(() => diasDelViaje(trip.fechaIda, trip.fechaVuelta), [trip.fechaIda, trip.fechaVuelta]);

  const { porDia, fuera } = useMemo(() => {
    const m = new Map(dias.map((d) => [d.fecha, []]));
    const afuera = [];
    (eventos || []).forEach((e) => (m.has(e.fecha) ? m.get(e.fecha).push(e) : afuera.push(e)));
    m.forEach((l) => l.sort(porOrden));
    return { porDia: m, fuera: afuera.sort(porOrden) };
  }, [eventos, dias]);

  const abierto = abiertoId ? (eventos || []).find((e) => e.id === abiertoId) : null;

  // Dia elegido en el calendario: hoy si cae dentro del viaje, si no el primer dia
  const [elegido, setElegido] = useState(null);
  const hoy = hoyISO();
  const seleccion = dias.some((d) => d.fecha === elegido)
    ? elegido
    : dias.some((d) => d.fecha === hoy)
      ? hoy
      : dias[0]?.fecha;
  const diaSel = dias.find((d) => d.fecha === seleccion);

  const seguro = (fn) => async (...args) => {
    try {
      await fn(...args);
    } catch (e) {
      toast.error(mensajeError(e));
    }
  };

  const agregar = seguro((fecha, titulo, hora) =>
    store.addEvento(trip.id, { fecha, titulo, hora, lugar: '', notas: '', itemId: null, orden: Date.now() }),
  );
  const reordenar = seguro((lista) =>
    store.reorderEventos(
      trip.id,
      lista.map((e, i) => ({ id: e.id, orden: i * 10 })),
    ),
  );
  const patch = seguro((evento, cambios) => store.updateEvento(trip.id, evento.id, cambios));
  const borrar = seguro(async (evento) => {
    await store.deleteEvento(trip.id, evento.id);
    setAbiertoId(null);
    toast.ok('Actividad quitada del itinerario.');
  });

  if (cargando) return <Cargando texto="Cargando el itinerario" />;
  if (error) return <p className="notice">No pudimos cargar el itinerario. Revisá tu conexión y las reglas de Firestore.</p>;

  return (
    <div className="itin">
      <p className="muted itin__lead">
        {editable
          ? 'Tocá un día del calendario para ver y armar sus actividades.'
          : 'Tocá un día del calendario para ver sus actividades.'}
      </p>
      {dias.length > 0 && (
        <CalendarioViaje dias={dias} porDia={porDia} seleccion={seleccion} onSeleccionar={setElegido} />
      )}
      {diaSel && (
        <div className="itin__day glass glass--md">
          <Dia
            key={diaSel.fecha}
            dia={diaSel}
            eventos={porDia.get(diaSel.fecha) || []}
            editable={editable}
            onAbrir={setAbiertoId}
            onAgregar={agregar}
            onReordenar={reordenar}
          />
        </div>
      )}
      {fuera.length > 0 && (
        <Dia
          dia={{ fecha: null }}
          eventos={fuera}
          editable={editable}
          onAbrir={setAbiertoId}
          onAgregar={agregar}
          onReordenar={reordenar}
        />
      )}
      {abierto && (
        <EventoDrawer
          evento={abierto}
          dias={dias}
          editable={editable}
          onPatch={patch}
          onDelete={borrar}
          onClose={() => setAbiertoId(null)}
        />
      )}
    </div>
  );
}
