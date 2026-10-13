import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Minus, Plus } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import Nav from '../components/Nav.jsx';
import { useToast } from '../components/ui.jsx';
import { DESTINOS, DESTINOS_POR_ID, ORIGEN, foto } from '../data/destinos.js';
import { PLANTILLAS, requisitosPara } from '../data/requisitos.js';
import { diasEntre, hoyISO, sumarDias } from '../lib/fechas.js';
import { itemsIniciales, mensajeError } from '../lib/viajes.js';

const PASOS = ['Destino', 'Fechas y personas', 'Tipo de viaje'];

export default function NuevoViaje() {
  const { user, store } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [paso, setPaso] = useState(0);
  const [destinoId, setDestinoId] = useState(null);
  const [nombre, setNombre] = useState('');
  const [ida, setIda] = useState('');
  const [vuelta, setVuelta] = useState('');
  const [viajeros, setViajeros] = useState(1);
  const [plantilla, setPlantilla] = useState('vacaciones');
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const destino = destinoId ? DESTINOS_POR_ID[destinoId] : null;
  const cantidadItems = useMemo(
    () => (destinoId ? requisitosPara(destinoId, plantilla).length : 0),
    [destinoId, plantilla],
  );

  const validarFechas = () => {
    const e = {};
    if (nombre.trim().length > 80) e.nombre = 'Máximo 80 caracteres.';
    if (!ida) e.ida = 'Elegí la fecha de salida.';
    else if (ida < hoyISO()) e.ida = 'La salida no puede ser en el pasado.';
    if (!vuelta) e.vuelta = 'Elegí la fecha de regreso.';
    else if (ida && vuelta <= ida) e.vuelta = 'El regreso tiene que ser después de la salida.';
    else if (ida && diasEntre(ida, vuelta) > 90) e.vuelta = 'El viaje no puede superar los 90 días.';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const siguiente = () => {
    if (paso === 0 && !destinoId) {
      setErrores({ destino: 'Elegí un destino para continuar.' });
      return;
    }
    if (paso === 1 && !validarFechas()) return;
    setErrores({});
    setPaso((p) => p + 1);
  };

  const crear = async () => {
    setGuardando(true);
    try {
      const nombreFinal = nombre.trim() || `${destino.ciudadPrincipal}, ${destino.nombre}`;
      const id = await store.createTrip(
        user,
        {
          nombre: nombreFinal,
          destinoId,
          origen: ORIGEN.pais,
          fechaIda: ida,
          fechaVuelta: vuelta,
          viajeros,
          plantilla,
          resumen: { total: cantidadItems, listos: 0, tramite: 0 },
        },
        itemsIniciales(destinoId, plantilla, ida),
      );
      toast.ok('Tu viaje está listo. Empezá a tachar.');
      navigate(`/viaje/${id}`, { replace: true });
    } catch (e) {
      toast.error(mensajeError(e));
      setGuardando(false);
    }
  };

  return (
    <>
      <div className="stage stage--aurora" aria-hidden="true" />
      <div className="page">
        <Nav />
        <main className="wizard container">
          <Link to="/viajes" className="wizard__back">
            <ArrowLeft size={16} /> Mis viajes
          </Link>
          <h1 className="wizard__title">Nuevo viaje</h1>

          <ol className="steps" aria-label="Pasos">
            {PASOS.map((p, i) => (
              <li key={p} className={i === paso ? 'is-on' : i < paso ? 'is-done' : ''} aria-current={i === paso ? 'step' : undefined}>
                <span className="steps__n mono">{i < paso ? <Check size={14} weight="bold" /> : i + 1}</span>
                {p}
              </li>
            ))}
          </ol>

          <section className="wizard__card glass">
            {paso === 0 && (
              <>
                <h2 className="wizard__h">¿A dónde viajás desde {ORIGEN.pais}?</h2>
                <div className="pick-grid" role="radiogroup" aria-label="Destino">
                  {DESTINOS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      role="radio"
                      aria-checked={destinoId === d.id}
                      className={`pick ${destinoId === d.id ? 'is-on' : ''}`}
                      onClick={() => {
                        setDestinoId(d.id);
                        setErrores({});
                      }}
                    >
                      <img src={foto(d.id, 'sm')} alt="" loading="lazy" decoding="async" />
                      <span className="pick__label">
                        <strong>{d.nombre}</strong>
                        <small>{d.ciudadPrincipal}</small>
                      </span>
                      {destinoId === d.id && (
                        <span className="pick__tick">
                          <Check size={14} weight="bold" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {errores.destino && (
                  <p className="field__error" role="alert">
                    {errores.destino}
                  </p>
                )}
              </>
            )}

            {paso === 1 && (
              <>
                <h2 className="wizard__h">
                  {destino.ciudadPrincipal}, {destino.nombre}
                </h2>
                <div className="form-grid">
                  <div className="field form-grid__wide">
                    <label htmlFor="nombre">Nombre del viaje</label>
                    <input
                      id="nombre"
                      className="input"
                      placeholder={`${destino.ciudadPrincipal}, ${destino.nombre}`}
                      value={nombre}
                      maxLength={80}
                      onChange={(e) => setNombre(e.target.value)}
                    />
                    <span className="field__hint">Opcional. Si lo dejás vacío usamos el destino.</span>
                    {errores.nombre && <span className="field__error">{errores.nombre}</span>}
                  </div>
                  <div className="field">
                    <label htmlFor="ida">Salida</label>
                    <input
                      id="ida"
                      type="date"
                      className="input"
                      min={hoyISO()}
                      value={ida}
                      onChange={(e) => {
                        setIda(e.target.value);
                        if (!vuelta && e.target.value) setVuelta(sumarDias(e.target.value, 7));
                        setErrores((x) => ({ ...x, ida: undefined, vuelta: undefined }));
                      }}
                      aria-invalid={Boolean(errores.ida)}
                    />
                    {errores.ida && <span className="field__error">{errores.ida}</span>}
                  </div>
                  <div className="field">
                    <label htmlFor="vuelta">Regreso</label>
                    <input
                      id="vuelta"
                      type="date"
                      className="input"
                      min={ida || hoyISO()}
                      value={vuelta}
                      onChange={(e) => {
                        setVuelta(e.target.value);
                        setErrores((x) => ({ ...x, vuelta: undefined }));
                      }}
                      aria-invalid={Boolean(errores.vuelta)}
                    />
                    {errores.vuelta && <span className="field__error">{errores.vuelta}</span>}
                  </div>
                  <div className="field form-grid__wide">
                    <span className="field__label" id="viajeros-l">
                      Cantidad de viajeros
                    </span>
                    <div className="stepper" role="group" aria-labelledby="viajeros-l">
                      <button type="button" className="icon-btn" onClick={() => setViajeros((v) => Math.max(1, v - 1))} aria-label="Menos viajeros">
                        <Minus size={18} />
                      </button>
                      <output className="mono">{viajeros}</output>
                      <button type="button" className="icon-btn" onClick={() => setViajeros((v) => Math.min(20, v + 1))} aria-label="Más viajeros">
                        <Plus size={18} />
                      </button>
                    </div>
                    <span className="field__hint">Después podés invitar a los demás con un link.</span>
                  </div>
                </div>
              </>
            )}

            {paso === 2 && (
              <>
                <h2 className="wizard__h">¿Qué tipo de viaje es?</h2>
                <div className="tpl-grid" role="radiogroup" aria-label="Tipo de viaje">
                  {PLANTILLAS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={plantilla === p.id}
                      className={`tpl ${plantilla === p.id ? 'is-on' : ''}`}
                      onClick={() => setPlantilla(p.id)}
                    >
                      <strong>{p.nombre}</strong>
                      <span className="muted">{p.desc}</span>
                    </button>
                  ))}
                </div>
                <p className="wizard__sum">
                  Vamos a crear <strong className="mono">{cantidadItems}</strong> ítems para{' '}
                  <strong>{destino.nombre}</strong>. Después los editás a tu gusto.
                </p>
              </>
            )}

            <footer className="wizard__foot">
              {paso > 0 ? (
                <button type="button" className="btn btn--ghost" onClick={() => setPaso((p) => p - 1)}>
                  <ArrowLeft size={16} /> Atrás
                </button>
              ) : (
                <span />
              )}
              {paso < 2 ? (
                <button type="button" className="btn btn--primary" onClick={siguiente}>
                  Continuar <ArrowRight size={16} weight="bold" />
                </button>
              ) : (
                <button type="button" className="btn btn--primary" onClick={crear} disabled={guardando}>
                  {guardando && <span className="spinner" />}
                  Crear viaje
                </button>
              )}
            </footer>
          </section>
        </main>
      </div>
    </>
  );
}
