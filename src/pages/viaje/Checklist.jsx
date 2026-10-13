import { useMemo, useState } from 'react';
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
import {
  AirplaneTilt,
  Bed,
  CaretDown,
  CaretRight,
  Check,
  Circle,
  Clock,
  DotsSixVertical,
  FirstAidKit,
  IdentificationCard,
  MapPinArea,
  Plus,
  Wallet,
} from '@phosphor-icons/react';
import { CATEGORIAS, CATEGORIAS_POR_ID } from '../../data/requisitos.js';
import { formatoCorto, urgencia } from '../../lib/fechas.js';
import { mensajeError, ordenarItems, estaVencido } from '../../lib/viajes.js';
import { useToast } from '../../components/ui.jsx';
import ItemDrawer from './ItemDrawer.jsx';

const FILTROS = [
  { id: 'todos', nombre: 'Todos' },
  { id: 'pendiente', nombre: 'Pendientes' },
  { id: 'tramite', nombre: 'En trámite' },
  { id: 'listo', nombre: 'Listos' },
];

const ICONOS = { IdentificationCard, FirstAidKit, AirplaneTilt, Bed, MapPinArea, Wallet };

function IconoCategoria({ id }) {
  const Cmp = ICONOS[CATEGORIAS_POR_ID[id]?.icono] || Circle;
  return <Cmp size={18} weight="duotone" />;
}

function Fila({ item, trip, editable, onPatch, onAbrir }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !editable,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const vencido = estaVencido(item);
  const urgente = !vencido && item.estado !== 'listo' && urgencia(item.fechaLimite) === 'urgente';
  const asignado = item.asignadoA ? trip.miembrosInfo?.[item.asignadoA] : null;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`row ${item.estado === 'listo' ? 'is-done' : ''} ${isDragging ? 'is-drag' : ''}`}
    >
      {editable && (
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="row__handle"
          aria-label={`Reordenar "${item.titulo}"`}
          {...attributes}
          {...listeners}
        >
          <DotsSixVertical size={18} weight="bold" />
        </button>
      )}

      <button
        type="button"
        className={`check check--${item.estado}`}
        onClick={() => editable && onPatch(item, { estado: item.estado === 'listo' ? 'pendiente' : 'listo' })}
        disabled={!editable}
        aria-label={item.estado === 'listo' ? `Marcar "${item.titulo}" como pendiente` : `Marcar "${item.titulo}" como listo`}
        aria-pressed={item.estado === 'listo'}
      >
        {item.estado === 'listo' && <Check size={14} weight="bold" />}
        {item.estado === 'tramite' && <Clock size={13} weight="bold" />}
      </button>

      <button type="button" className="row__main" onClick={() => onAbrir(item.id)} aria-label={`Abrir detalle de ${item.titulo}`}>
        <span className="row__text">
          <span className="row__title">{item.titulo}</span>
          {(item.fechaLimite || item.estado === 'tramite' || asignado || item.costo > 0) && (
            <span className="row__sub">
              {item.fechaLimite && item.estado !== 'listo' && (
                <span className={vencido || urgente ? 'is-alert' : ''}>
                  {vencido ? 'Venció el ' : 'Hasta el '}
                  {formatoCorto(item.fechaLimite)}
                </span>
              )}
              {item.estado === 'tramite' && <span className="is-accent">En trámite</span>}
              {asignado && <span>{asignado.nombre.split(' ')[0]}</span>}
              {item.costo > 0 && <span className="mono">USD {item.costo}</span>}
            </span>
          )}
        </span>
        <CaretRight size={18} className="row__go" aria-hidden="true" />
      </button>
    </li>
  );
}

function Seccion({ id, todos, visibles, trip, editable, onPatch, onAbrir, onReordenar }) {
  const listos = todos.filter((i) => i.estado === 'listo').length;
  const [abierta, setAbierta] = useState(listos < todos.length);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const alSoltar = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const desde = todos.findIndex((i) => i.id === active.id);
    const hasta = todos.findIndex((i) => i.id === over.id);
    if (desde < 0 || hasta < 0) return;
    const nuevo = arrayMove(todos, desde, hasta);
    const cambios = nuevo
      .map((it, i) => ({ id: it.id, orden: i * 10, antes: it.orden }))
      .filter((c) => c.orden !== c.antes)
      .map(({ id: itemId, orden }) => ({ id: itemId, orden }));
    if (cambios.length) onReordenar(cambios);
  };

  return (
    <section className="sec" aria-labelledby={`sec-${id}`}>
      <button type="button" className="sec__head" onClick={() => setAbierta((v) => !v)} aria-expanded={abierta}>
        <span className="sec__ico">
          <IconoCategoria id={id} />
        </span>
        <h3 id={`sec-${id}`}>{CATEGORIAS_POR_ID[id]?.nombre || id}</h3>
        <span className="mono sec__count">
          {listos}/{todos.length}
        </span>
        <CaretDown size={16} className={`sec__caret ${abierta ? 'is-open' : ''}`} />
      </button>

      {abierta && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={alSoltar}>
          <SortableContext items={visibles.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="rows">
              {visibles.map((it) => (
                <Fila key={it.id} item={it} trip={trip} editable={editable} onPatch={onPatch} onAbrir={onAbrir} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}

export default function Checklist({ trip, items, editable, store, nota }) {
  const toast = useToast();
  const [filtro, setFiltro] = useState('todos');
  const [abiertoId, setAbiertoId] = useState(null);
  const [agregarAbierto, setAgregarAbierto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('documentacion');
  const [agregando, setAgregando] = useState(false);

  const miembros = useMemo(() => Object.entries(trip.miembrosInfo || {}), [trip.miembrosInfo]);
  const abierto = abiertoId ? items.find((i) => i.id === abiertoId) : null;

  const secciones = useMemo(() => {
    const m = new Map(CATEGORIAS.map((c) => [c.id, []]));
    items.forEach((i) => (m.get(i.categoria) || m.set(i.categoria, []).get(i.categoria)).push(i));
    return [...m.entries()]
      .map(([id, todos]) => {
        const ordenados = [...todos].sort(ordenarItems);
        return {
          id,
          todos: ordenados,
          visibles: ordenados.filter((i) => filtro === 'todos' || i.estado === filtro),
        };
      })
      .filter((s) => s.visibles.length > 0);
  }, [items, filtro]);

  const patch = async (item, cambios) => {
    try {
      await store.updateItem(trip.id, item.id, cambios);
    } catch (e) {
      toast.error(mensajeError(e));
    }
  };

  const reordenar = async (cambios) => {
    try {
      await store.reorderItems(trip.id, cambios);
    } catch (e) {
      toast.error(mensajeError(e));
    }
  };

  const borrar = async (item) => {
    try {
      await store.deleteItem(trip.id, item.id);
      setAbiertoId(null);
      toast.ok('Ítem eliminado.');
    } catch (e) {
      toast.error(mensajeError(e));
    }
  };

  const agregar = async (ev) => {
    ev.preventDefault();
    const t = titulo.trim();
    if (!t) return;
    setAgregando(true);
    try {
      const mismos = items.filter((i) => i.categoria === categoria);
      const ultimo = mismos.length ? Math.max(...mismos.map((i) => i.orden ?? 0)) : -10;
      await store.addItem(trip.id, {
        titulo: t.slice(0, 120),
        categoria,
        estado: 'pendiente',
        fechaLimite: null,
        costo: null,
        notas: '',
        link: '',
        asignadoA: null,
        predeterminado: false,
        clave: null,
        desc: '',
        orden: ultimo + 10,
      });
      setTitulo('');
      toast.ok('Ítem agregado.');
    } catch (e) {
      toast.error(mensajeError(e));
    } finally {
      setAgregando(false);
    }
  };

  return (
    <div className="cl">
      <div className="cl-bar">
        <label className="cl-filter">
          <span className="sr-only">Mostrar</span>
          <select className="select select--sm" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            {FILTROS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombre}
              </option>
            ))}
          </select>
        </label>
        {editable ? (
          <button type="button" className="btn btn--glass btn--sm" onClick={() => setAgregarAbierto((v) => !v)} aria-expanded={agregarAbierto}>
            <Plus size={16} weight="bold" /> Agregar
          </button>
        ) : (
          <span className="muted cl-ro">Solo lectura</span>
        )}
      </div>

      {editable && agregarAbierto && (
        <form className="addrow" onSubmit={agregar}>
          <input
            autoFocus
            className="input"
            placeholder="Ej: Reservar cena de aniversario"
            aria-label="Nuevo ítem"
            value={titulo}
            maxLength={120}
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setAgregarAbierto(false)}
          />
          <select className="select" aria-label="Categoría" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIAS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn--primary" disabled={agregando || !titulo.trim()}>
            {agregando ? <span className="spinner" /> : 'Agregar'}
          </button>
        </form>
      )}

      {secciones.length === 0 && (
        <p className="muted cl-empty">No hay ítems en este filtro. Probá con otro o agregá algo nuevo.</p>
      )}

      <div className="secs">
        {secciones.map((s) => (
          <Seccion
            key={s.id}
            id={s.id}
            todos={s.todos}
            visibles={s.visibles}
            trip={trip}
            editable={editable}
            onPatch={patch}
            onAbrir={setAbiertoId}
            onReordenar={reordenar}
          />
        ))}
      </div>

      {nota && <p className="foot-note">{nota}</p>}

      {abierto && (
        <ItemDrawer
          item={abierto}
          editable={editable}
          miembros={miembros}
          onPatch={patch}
          onDelete={borrar}
          onClose={() => setAbiertoId(null)}
        />
      )}
    </div>
  );
}
