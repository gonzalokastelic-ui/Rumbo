import { Plus, X } from '@phosphor-icons/react';
import { GRUPOS_EDAD, NACIONALIDADES, pasajeroVacio } from '../data/pasajeros.js';

// Lista editable de pasajeros: nombre, grupo de edad y nacionalidad
export default function PasajerosEditor({ pasajeros, onChange, uidTitular, errores = {} }) {
  const actualizar = (id, campo, valor) => onChange(pasajeros.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));
  const quitar = (id) => onChange(pasajeros.filter((p) => p.id !== id));

  return (
    <div className="pax">
      <div className="pax__cols" aria-hidden="true">
        <span />
        <span>Nombre</span>
        <span>Edad</span>
        <span>Nacionalidad</span>
        <span />
      </div>
      <ol className="pax__list">
        {pasajeros.map((p, i) => (
          <li key={p.id} className="pax__row">
            <span className="pax__n mono">{i + 1}</span>
            <div className="pax__name">
              <input
                className="input"
                aria-label={`Nombre del pasajero ${i + 1}`}
                placeholder={i === 0 ? 'Tu nombre' : 'Nombre'}
                value={p.nombre}
                maxLength={60}
                onChange={(e) => actualizar(p.id, 'nombre', e.target.value)}
                aria-invalid={Boolean(errores[p.id])}
              />
              {p.uid && p.uid === uidTitular && <span className="pax__you">vos</span>}
              {errores[p.id] && <span className="field__error">{errores[p.id]}</span>}
            </div>
            <select
              className="select"
              aria-label={`Edad del pasajero ${i + 1}`}
              value={p.edad}
              onChange={(e) => actualizar(p.id, 'edad', e.target.value)}
            >
              {GRUPOS_EDAD.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </select>
            <select
              className="select"
              aria-label={`Nacionalidad del pasajero ${i + 1}`}
              value={p.nacionalidad}
              onChange={(e) => actualizar(p.id, 'nacionalidad', e.target.value)}
            >
              {NACIONALIDADES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="icon-btn"
              onClick={() => quitar(p.id)}
              disabled={pasajeros.length === 1}
              aria-label={`Quitar al pasajero ${i + 1}`}
            >
              <X size={18} />
            </button>
          </li>
        ))}
      </ol>
      {pasajeros.length < 20 && (
        <button type="button" className="btn btn--glass btn--sm" onClick={() => onChange([...pasajeros, pasajeroVacio()])}>
          <Plus size={16} weight="bold" /> Agregar pasajero
        </button>
      )}
    </div>
  );
}

export function validarPasajeros(pasajeros) {
  const errores = {};
  pasajeros.forEach((p) => {
    if (!p.nombre.trim()) errores[p.id] = 'Escribí un nombre.';
  });
  return errores;
}

export const limpiarPasajeros = (pasajeros) =>
  pasajeros.map((p) => ({ ...p, nombre: p.nombre.trim().slice(0, 60) }));
