import { useMemo, useState } from 'react';
import {
  AirplaneTilt,
  Bed,
  CaretDown,
  Check,
  Circle,
  Clock,
  FirstAidKit,
  IdentificationCard,
  LinkSimple,
  MapPinArea,
  Plus,
  Trash,
  Wallet,
  WarningCircle,
} from '@phosphor-icons/react';
import { CATEGORIAS, CATEGORIAS_POR_ID, ESTADOS } from '../../data/requisitos.js';
import { formatoCorto, urgencia } from '../../lib/fechas.js';
import { mensajeError } from '../../lib/viajes.js';
import { Avatar, useToast } from '../../components/ui.jsx';

const FILTROS = [{ id: 'todos', nombre: 'Todos' }, ...ESTADOS.map((e) => ({ id: e.id, nombre: e.nombre === 'Listo' ? 'Listos' : e.nombre === 'Pendiente' ? 'Pendientes' : e.nombre }))];

const ICONOS = { IdentificationCard, FirstAidKit, AirplaneTilt, Bed, MapPinArea, Wallet };

function IconoCategoria({ id, size = 20 }) {
  const Cmp = ICONOS[CATEGORIAS_POR_ID[id]?.icono] || Circle;
  return <Cmp size={size} weight="duotone" />;
}

function FilaItem({ item, trip, editable, onPatch, onDelete, miembros, abierto, onToggle }) {
  const lim = item.estado === 'listo' ? null : urgencia(item.fechaLimite);
  const asignado = item.asignadoA ? trip.miembrosInfo?.[item.asignadoA] : null;

  const alternar = () => {
    if (!editable) return;
    onPatch(item, { estado: item.estado === 'listo' ? 'pendiente' : 'listo' });
  };

  return (
    <li className={`item ${item.estado === 'listo' ? 'is-done' : ''} ${abierto ? 'is-open' : ''}`}>
      <div className="item__row">
        <button
          type="button"
          className={`check check--${item.estado}`}
          onClick={alternar}
          disabled={!editable}
          aria-label={item.estado === 'listo' ? `Marcar "${item.titulo}" como pendiente` : `Marcar "${item.titulo}" como listo`}
          aria-pressed={item.estado === 'listo'}
        >
          {item.estado === 'listo' && <Check size={14} weight="bold" />}
          {item.estado === 'tramite' && <Clock size={13} weight="bold" />}
        </button>

        <button type="button" className="item__main" onClick={onToggle} aria-expanded={abierto}>
          <span className="item__title">{item.titulo}</span>
          <span className="item__meta">
            {item.fechaLimite && (
              <span className={`chip ${lim === 'vencido' || lim === 'urgente' ? 'chip--red' : ''}`}>
                {lim === 'vencido' && <WarningCircle size={13} weight="fill" />}
                {lim === 'vencido' ? 'Venció el ' : 'Hasta el '}
                {formatoCorto(item.fechaLimite)}
              </span>
            )}
            {item.estado === 'tramite' && <span className="chip chip--red">En trámite</span>}
            {item.costo > 0 && <span className="chip mono">USD {item.costo}</span>}
            {item.link && (
              <span className="chip">
                <LinkSimple size={13} /> Link
              </span>
            )}
          </span>
        </button>

        {asignado && <Avatar nombre={asignado.nombre} foto={asignado.foto} />}
        <button type="button" className="icon-btn item__caret" onClick={onToggle} aria-label={abierto ? 'Cerrar detalle' : 'Abrir detalle'}>
          <CaretDown size={18} />
        </button>
      </div>

      {abierto && (
        <div className="item__detail">
          {item.desc && <p className="muted item__desc">{item.desc}</p>}

          <div className="detail-grid">
            <div className="field detail-grid__wide">
              <span className="field__label">Estado</span>
              <div className="seg seg--full" role="radiogroup" aria-label="Estado">
                {ESTADOS.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    role="radio"
                    aria-checked={item.estado === e.id}
                    className={item.estado === e.id ? 'is-on' : ''}
                    disabled={!editable}
                    onClick={() => onPatch(item, { estado: e.id })}
                  >
                    {e.nombre}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label htmlFor={`lim-${item.id}`}>Fecha límite</label>
              <input
                id={`lim-${item.id}`}
                type="date"
                className="input"
                defaultValue={item.fechaLimite || ''}
                disabled={!editable}
                onBlur={(e) => e.target.value !== (item.fechaLimite || '') && onPatch(item, { fechaLimite: e.target.value || null })}
              />
            </div>

            <div className="field">
              <label htmlFor={`costo-${item.id}`}>Costo estimado (USD)</label>
              <input
                id={`costo-${item.id}`}
                type="number"
                min="0"
                inputMode="decimal"
                className="input"
                defaultValue={item.costo ?? ''}
                disabled={!editable}
                onBlur={(e) => {
                  const v = e.target.value === '' ? null : Math.max(0, Number(e.target.value));
                  if (v !== (item.costo ?? null)) onPatch(item, { costo: v });
                }}
              />
            </div>

            <div className="field">
              <label htmlFor={`asig-${item.id}`}>Responsable</label>
              <select
                id={`asig-${item.id}`}
                className="select"
                value={item.asignadoA || ''}
                disabled={!editable}
                onChange={(e) => onPatch(item, { asignadoA: e.target.value || null })}
              >
                <option value="">Sin asignar</option>
                {miembros.map(([uid, m]) => (
                  <option key={uid} value={uid}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor={`link-${item.id}`}>Link útil</label>
              <input
                id={`link-${item.id}`}
                type="url"
                className="input"
                placeholder="https://"
                defaultValue={item.link || ''}
                disabled={!editable}
                onBlur={(e) => e.target.value !== (item.link || '') && onPatch(item, { link: e.target.value.trim() })}
              />
            </div>

            <div className="field detail-grid__wide">
              <label htmlFor={`notas-${item.id}`}>Notas</label>
              <textarea
                id={`notas-${item.id}`}
                className="textarea"
                maxLength={600}
                defaultValue={item.notas || ''}
                disabled={!editable}
                onBlur={(e) => e.target.value !== (item.notas || '') && onPatch(item, { notas: e.target.value })}
              />
            </div>
          </div>

          <div className="item__actions">
            {item.link && (
              <a className="btn btn--glass btn--sm" href={item.link} target="_blank" rel="noreferrer">
                <LinkSimple size={16} /> Abrir link
              </a>
            )}
            {editable && (
              <button type="button" className="btn btn--ghost btn--sm btn--danger" onClick={() => onDelete(item)}>
                <Trash size={16} /> Eliminar ítem
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export default function Checklist({ trip, items, editable, store }) {
  const toast = useToast();
  const [filtro, setFiltro] = useState('todos');
  const [abierto, setAbierto] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('documentacion');
  const [agregando, setAgregando] = useState(false);

  const miembros = useMemo(() => Object.entries(trip.miembrosInfo || {}), [trip.miembrosInfo]);

  const visibles = useMemo(
    () => items.filter((i) => filtro === 'todos' || i.estado === filtro),
    [items, filtro],
  );

  const porCategoria = useMemo(() => {
    const m = new Map(CATEGORIAS.map((c) => [c.id, []]));
    visibles.forEach((i) => (m.get(i.categoria) || m.set(i.categoria, []).get(i.categoria)).push(i));
    m.forEach((lista) => lista.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
    return [...m.entries()].filter(([, l]) => l.length > 0);
  }, [visibles]);

  const patch = async (item, cambios) => {
    try {
      await store.updateItem(trip.id, item.id, cambios);
    } catch (e) {
      toast.error(mensajeError(e));
    }
  };

  const borrar = async (item) => {
    try {
      await store.deleteItem(trip.id, item.id);
      setAbierto(null);
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
        orden: Date.now() % 1000000,
      });
      setTitulo('');
      toast.ok('Ítem agregado al checklist.');
    } catch (e) {
      toast.error(mensajeError(e));
    } finally {
      setAgregando(false);
    }
  };

  return (
    <div className="checklist">
      <div className="checklist__bar">
        <div className="seg" role="tablist" aria-label="Filtrar por estado">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filtro === f.id}
              className={filtro === f.id ? 'is-on' : ''}
              onClick={() => setFiltro(f.id)}
            >
              {f.nombre}
            </button>
          ))}
        </div>
      </div>

      {editable && (
        <form className="add glass glass--md" onSubmit={agregar}>
          <div className="field add__title">
            <label htmlFor="nuevo-item">Sumar algo a tu lista</label>
            <input
              id="nuevo-item"
              className="input"
              placeholder="Ej: Reservar cena de aniversario"
              value={titulo}
              maxLength={120}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>
          <div className="field add__cat">
            <label htmlFor="nuevo-cat">Categoría</label>
            <select id="nuevo-cat" className="select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {CATEGORIAS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn--primary add__btn" disabled={agregando || !titulo.trim()}>
            {agregando ? <span className="spinner" /> : <Plus size={18} weight="bold" />}
            Agregar
          </button>
        </form>
      )}

      {!editable && <p className="notice muted">Tenés acceso de solo lectura: podés seguir el avance pero no modificarlo.</p>}

      {porCategoria.length === 0 && (
        <div className="empty glass">
          <Check size={34} weight="bold" />
          <h2>No hay ítems en este filtro</h2>
          <p className="muted">Probá con otro estado o agregá algo nuevo a la lista.</p>
        </div>
      )}

      <div className="cats">
        {porCategoria.map(([id, lista]) => {
          const listos = lista.filter((i) => i.estado === 'listo').length;
          return (
            <section key={id} className="cat glass" aria-labelledby={`cat-${id}`}>
              <header className="cat__head">
                <span className="cat__ico">
                  <IconoCategoria id={id} />
                </span>
                <h3 id={`cat-${id}`}>{CATEGORIAS_POR_ID[id]?.nombre || id}</h3>
                <span className="mono muted">
                  {listos}/{lista.length}
                </span>
              </header>
              <ul>
                {lista.map((it) => (
                  <FilaItem
                    key={it.id}
                    item={it}
                    trip={trip}
                    editable={editable}
                    miembros={miembros}
                    abierto={abierto === it.id}
                    onToggle={() => setAbierto((a) => (a === it.id ? null : it.id))}
                    onPatch={patch}
                    onDelete={borrar}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
