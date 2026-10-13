import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, Moon, NavigationArrow, Sun, WarningCircle, X } from '@phosphor-icons/react';

/* ---------- Marca ---------- */
export function Logo({ size = 34 }) {
  return (
    <span className="logo">
      <span className="logo__mark" style={{ width: size, height: size }}>
        <NavigationArrow size={size * 0.56} weight="fill" />
      </span>
      <span className="logo__word">Rumbo</span>
    </span>
  );
}

/* ---------- Tema claro / oscuro ---------- */
export function useTheme() {
  const [tema, setTema] = useState(() => document.documentElement.dataset.theme || 'dark');
  const alternar = useCallback(() => {
    const siguiente = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = siguiente;
    try {
      localStorage.setItem('rumbo-theme', siguiente);
    } catch {
      /* sin almacenamiento: el tema vale solo para esta sesion */
    }
    setTema(siguiente);
  }, []);
  return [tema, alternar];
}

export function ThemeToggle() {
  const [tema, alternar] = useTheme();
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={alternar}
      aria-label={tema === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
    >
      {tema === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}

/* ---------- Anillo de progreso ---------- */
export function ProgressRing({ value = 0, size = 72, stroke = 6, label = true }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <span className="ring" style={{ width: size, height: size }} role="img" aria-label={`${Math.round(pct * 100)}% completado`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle
          className="ring__bar"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      {label && (
        <span className="ring__label" style={{ fontSize: size * 0.27 }}>
          {Math.round(pct * 100)}
          <small style={{ fontSize: '0.55em', marginLeft: 1 }}>%</small>
        </span>
      )}
    </span>
  );
}

export function Avatar({ nombre = '?', foto, rojo }) {
  const ini = nombre.trim().slice(0, 1).toUpperCase();
  return (
    <span className={`avatar ${rojo ? 'avatar--red' : ''}`} title={nombre}>
      {foto ? <img src={foto} alt="" referrerPolicy="no-referrer" /> : ini}
    </span>
  );
}

/* ---------- Aparicion al hacer scroll ---------- */
let observador;
function obtenerObservador() {
  if (!observador) {
    observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            observador.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -6% 0px' },
    );
  }
  return observador;
}

export function Reveal({ as: Tag = 'div', i = 0, className = '', children, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const o = obtenerObservador();
    o.observe(el);
    return () => o.unobserve(el);
  }, []);
  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ '--i': i }} {...rest}>
      {children}
    </Tag>
  );
}

/* ---------- Avisos ---------- */
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const sigId = useRef(1);

  const mostrar = useCallback((tipo, texto) => {
    const id = sigId.current++;
    setToasts((t) => [...t, { id, tipo, texto }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tipo === 'error' ? 6000 : 3200);
  }, []);

  const api = useMemo(
    () => ({ ok: (t) => mostrar('ok', t), error: (t) => mostrar('error', t) }),
    [mostrar],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" aria-live="polite" role="status">
        {toasts.map((t) => (
          <div key={t.id} className={`toast glass glass--md toast--${t.tipo}`}>
            {t.tipo === 'error' ? <WarningCircle size={22} weight="fill" /> : <CheckCircle size={22} weight="fill" />}
            <span>{t.texto}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/* ---------- Modal ---------- */
export function Modal({ titulo, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previo;
    };
  }, [onClose]);

  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal glass" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal__head">
          <h3>{titulo}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Cargando({ texto = 'Cargando' }) {
  return (
    <div className="cargando" role="status">
      <span className="spinner" />
      <span>{texto}</span>
    </div>
  );
}
