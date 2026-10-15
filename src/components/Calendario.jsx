import { useEffect, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'react-day-picker/locale';
import 'react-day-picker/style.css';
import '../styles/calendario.css';
import { diasEntre, formatoLargo, parseISO, toISO } from '../lib/fechas.js';

function useMedia(query) {
  const [ok, setOk] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const cambio = () => setOk(mq.matches);
    mq.addEventListener('change', cambio);
    return () => mq.removeEventListener('change', cambio);
  }, [query]);
  return ok;
}

// Calendario de rango: el primer toque fija la salida y el mismo calendario
// pasa a pedir la vuelta. Un toque sobre un rango completo arranca uno nuevo.
export function RangoFechas({ desde, hasta, onChange, min, error }) {
  const dosMeses = useMedia('(min-width: 760px)');
  const etapa = !desde ? 'salida' : !hasta ? 'vuelta' : 'listo';
  const noches = desde && hasta ? diasEntre(desde, hasta) : null;

  const alTocar = (_rango, dia) => {
    if (!dia) return;
    const iso = toISO(dia);
    if (!desde || hasta || iso <= desde) {
      onChange({ desde: iso, hasta: null });
      return;
    }
    onChange({ desde, hasta: iso });
  };

  return (
    <div className="cal">
      <div className="cal__summary" aria-live="polite">
        <div className={`cal__slot ${etapa === 'salida' ? 'is-active' : ''}`}>
          <span>Salida</span>
          <strong>{desde ? formatoLargo(desde) : 'Elegí un día'}</strong>
        </div>
        <div className={`cal__slot ${etapa === 'vuelta' ? 'is-active' : ''}`}>
          <span>Vuelta</span>
          <strong>{hasta ? formatoLargo(hasta) : desde ? 'Ahora elegí la vuelta' : 'Sin elegir'}</strong>
        </div>
        {noches != null && <span className="chip chip--red cal__nights">{noches} noches</span>}
      </div>

      <DayPicker
        mode="range"
        locale={es}
        weekStartsOn={1}
        numberOfMonths={dosMeses ? 2 : 1}
        selected={{ from: desde ? parseISO(desde) : undefined, to: hasta ? parseISO(hasta) : undefined }}
        onSelect={alTocar}
        defaultMonth={desde ? parseISO(desde) : min ? parseISO(min) : undefined}
        disabled={min ? { before: parseISO(min) } : undefined}
        className="rdp-rumbo"
      />
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}

// Calendario de un solo dia (fecha limite de un item)
export function FechaUnica({ valor, onChange }) {
  return (
    <DayPicker
      mode="single"
      locale={es}
      weekStartsOn={1}
      selected={valor ? parseISO(valor) : undefined}
      onSelect={(d) => d && onChange(toISO(d))}
      defaultMonth={valor ? parseISO(valor) : undefined}
      className="rdp-rumbo rdp-rumbo--sm"
    />
  );
}
