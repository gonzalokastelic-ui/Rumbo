import { useEffect, useRef } from 'react';
import { AirplaneTakeoff } from '@phosphor-icons/react';

const PIEZAS = Array.from({ length: 28 }, (_, i) => i);

// Se muestra cuando el checklist llega al 100% y se cierra sola a los 6 segundos.
// Con "reducir movimiento" no hay confeti.
export default function Celebracion({ nombre, onClose }) {
  const boton = useRef(null);
  // El viaje se actualiza en tiempo real: con una ref, el cierre automatico no se reinicia en cada render
  const cerrar = useRef(onClose);
  useEffect(() => {
    cerrar.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previo = document.activeElement;
    boton.current?.focus();
    const t = setTimeout(() => cerrar.current(), 6000);
    const tecla = (e) => e.key === 'Escape' && cerrar.current();
    window.addEventListener('keydown', tecla);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', tecla);
      previo?.focus?.();
    };
  }, []);

  return (
    <div className="party" role="dialog" aria-modal="true" aria-labelledby="party-t" onMouseDown={onClose}>
      <div className="party__confetti" aria-hidden="true">
        {PIEZAS.map((i) => (
          <i key={i} style={{ '--i': i, '--x': `${(i * 37) % 100}%`, '--r': `${(i * 53) % 360}deg` }} />
        ))}
      </div>
      <div className="party__card glass" onMouseDown={(e) => e.stopPropagation()}>
        <span className="party__ico">
          <AirplaneTakeoff size={34} weight="fill" />
        </span>
        <h2 id="party-t">Listo para viajar</h2>
        <p className="muted">Resolviste todo el checklist de {nombre}. Buen viaje.</p>
        <button ref={boton} type="button" className="btn btn--primary" onClick={onClose}>
          Genial
        </button>
      </div>
    </div>
  );
}
