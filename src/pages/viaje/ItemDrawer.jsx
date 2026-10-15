import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CalendarPlus, LinkSimple, Trash, X } from '@phosphor-icons/react';
import { CATEGORIAS_POR_ID, ESTADOS } from '../../data/requisitos.js';
import { estadoDesdePersonas } from '../../lib/viajes.js';
import { formatoLargo } from '../../lib/fechas.js';
import { FechaUnica } from '../../components/Calendario.jsx';

// Detalle de un item: panel lateral en escritorio y hoja inferior en celular.
// Cada campo guarda al salir del input, asi la persona no tiene que "confirmar".
export default function ItemDrawer({ item, editable, miembros, pasajeros = [], dias = [], onAgendar, onPatch, onDelete, onClose }) {
  const cerrar = useRef(null);
  const tituloRef = useRef(null);
  const [eligiendoFecha, setEligiendoFecha] = useState(false);
  const [diaAgenda, setDiaAgenda] = useState(dias[0]?.fecha || '');

  const personas = item.porPersona && item.personas ? Object.keys(item.personas) : [];
  const nombreDe = (id) => pasajeros.find((p) => p.id === id)?.nombre || 'Pasajero';

  // En los tramites por persona, el estado general sale de cuantas personas lo resolvieron
  const cambiarEstado = (estado) => {
    if (!personas.length || estado === 'tramite') return onPatch(item, { estado });
    const todas = Object.fromEntries(personas.map((id) => [id, estado === 'listo']));
    return onPatch(item, { estado, personas: todas });
  };

  const marcarPersona = (id, hecho) => {
    const nuevas = { ...item.personas, [id]: hecho };
    onPatch(item, { personas: nuevas, estado: estadoDesdePersonas(nuevas) });
  };

  // El titulo es un textarea que crece con su contenido (field-sizing no esta en todos los navegadores)
  const ajustar = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  useLayoutEffect(() => {
    const el = tituloRef.current;
    ajustar(el);
    // Vuelve a medir cuando termina la animacion de entrada, las fuentes y si cambia el ancho
    const raf = requestAnimationFrame(() => ajustar(el));
    document.fonts?.ready.then(() => ajustar(el));
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => ajustar(el)) : null;
    ro?.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [item.titulo]);

  useEffect(() => {
    cerrar.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const blur = (campo, actual, transformar = (v) => v) => (e) => {
    const nuevo = transformar(e.target.value);
    if (nuevo !== actual) onPatch(item, { [campo]: nuevo });
  };

  return (
    <>
      <div className="drawer-back" onMouseDown={onClose} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Detalle: ${item.titulo}`}>
        <header className="drawer__head">
          <p className="drawer__cat">{CATEGORIAS_POR_ID[item.categoria]?.nombre || 'Ítem'}</p>
          <button ref={cerrar} type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar detalle">
            <X size={20} />
          </button>
        </header>

        <textarea
          key={`t-${item.id}-${item.titulo}`}
          ref={tituloRef}
          className="drawer__title"
          rows={1}
          onInput={(e) => ajustar(e.target)}
          defaultValue={item.titulo}
          maxLength={120}
          disabled={!editable}
          aria-label="Título del ítem"
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (!v) {
              e.target.value = item.titulo;
              return;
            }
            if (v !== item.titulo) onPatch(item, { titulo: v });
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), e.target.blur())}
        />

        {item.desc && <p className="muted drawer__desc">{item.desc}</p>}

        <div className="drawer__fields">
          <div className="field">
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
                  onClick={() => cambiarEstado(e.id)}
                >
                  {e.nombre}
                </button>
              ))}
            </div>
          </div>

          {personas.length > 0 && (
            <div className="field">
              <span className="field__label">
                Por pasajero ({personas.filter((id) => item.personas[id]).length} de {personas.length})
              </span>
              <ul className="pax-checks">
                {personas.map((id) => (
                  <li key={id}>
                    <label className="pax-check">
                      <input
                        type="checkbox"
                        checked={Boolean(item.personas[id])}
                        disabled={!editable}
                        onChange={(e) => marcarPersona(id, e.target.checked)}
                      />
                      <span>{nombreDe(id)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="field">
            <label htmlFor="d-lim">Fecha límite</label>
            {eligiendoFecha && editable ? (
              <div className="drawer__cal">
                <FechaUnica
                  valor={item.fechaLimite}
                  onChange={(iso) => {
                    onPatch(item, { fechaLimite: iso });
                    setEligiendoFecha(false);
                  }}
                />
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEligiendoFecha(false)}>
                  Cancelar
                </button>
              </div>
            ) : item.fechaLimite ? (
              <div className="field__row">
                <span className="drawer__none drawer__date">{formatoLargo(item.fechaLimite)}</span>
                {editable && (
                  <>
                    <button type="button" id="d-lim" className="btn btn--glass btn--sm" onClick={() => setEligiendoFecha(true)}>
                      Cambiar
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => onPatch(item, { fechaLimite: null })}>
                      Quitar
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="field__row">
                <span className="muted drawer__none">Sin fecha</span>
                {editable && (
                  <button type="button" id="d-lim" className="btn btn--glass btn--sm" onClick={() => setEligiendoFecha(true)}>
                    Elegir fecha
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="d-asig">Responsable</label>
            <select
              id="d-asig"
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
            <label htmlFor="d-costo">Costo estimado (USD)</label>
            <input
              key={`c-${item.costo ?? 'none'}`}
              id="d-costo"
              type="number"
              min="0"
              inputMode="decimal"
              className="input"
              defaultValue={item.costo ?? ''}
              disabled={!editable}
              onBlur={blur('costo', item.costo ?? null, (v) => (v === '' ? null : Math.max(0, Number(v))))}
            />
          </div>

          <div className="field">
            <label htmlFor="d-link">Link útil</label>
            <input
              key={`k-${item.link || 'none'}`}
              id="d-link"
              type="url"
              className="input"
              placeholder="https://"
              defaultValue={item.link || ''}
              disabled={!editable}
              onBlur={blur('link', item.link || '', (v) => v.trim())}
            />
          </div>

          <div className="field">
            <label htmlFor="d-notas">Notas</label>
            <textarea
              key={`n-${item.notas || 'none'}`}
              id="d-notas"
              className="textarea"
              maxLength={600}
              defaultValue={item.notas || ''}
              disabled={!editable}
              onBlur={blur('notas', item.notas || '')}
            />
          </div>
        </div>

        {editable && onAgendar && dias.length > 0 && (
          <div className="field drawer__agenda">
            <label htmlFor="d-dia">Agendar en el itinerario</label>
            <div className="field__row">
              <select id="d-dia" className="select" value={diaAgenda} onChange={(e) => setDiaAgenda(e.target.value)}>
                {dias.map((d) => (
                  <option key={d.fecha} value={d.fecha}>
                    {d.etiqueta}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn--glass btn--sm" onClick={() => onAgendar(item, diaAgenda)}>
                <CalendarPlus size={16} /> Agendar
              </button>
            </div>
          </div>
        )}

        <footer className="drawer__foot">
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
        </footer>
      </aside>
    </>
  );
}
