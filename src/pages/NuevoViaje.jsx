import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import Nav from '../components/Nav.jsx';
import { useToast } from '../components/ui.jsx';
import { RangoFechas } from '../components/Calendario.jsx';
import PasajerosEditor, { limpiarPasajeros, validarPasajeros } from '../components/Pasajeros.jsx';
import { DESTINOS, DESTINOS_POR_ID, ORIGEN, foto } from '../data/destinos.js';
import { PLANTILLAS, requisitosPara } from '../data/requisitos.js';
import { titularDesdePerfil } from '../data/pasajeros.js';
import { diasEntre, hoyISO } from '../lib/fechas.js';
import { itemsIniciales, mensajeError } from '../lib/viajes.js';

const PASOS = ['Destino', 'Fechas', 'Pasajeros', 'Tipo de viaje'];
const SEGUN_PASAJEROS = new Set(['menores', 'bebe-asiento', 'botiquin', 'seguro-mayores', 'otra-nacionalidad']);

export default function NuevoViaje() {
  const { user, perfil, store } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [paso, setPaso] = useState(0);
  const [destinoId, setDestinoId] = useState(null);
  const [nombre, setNombre] = useState('');
  const [fechas, setFechas] = useState({ desde: null, hasta: null });
  const [pasajeros, setPasajeros] = useState(() => [titularDesdePerfil(user, perfil)]);
  const [plantilla, setPlantilla] = useState('vacaciones');
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const destino = destinoId ? DESTINOS_POR_ID[destinoId] : null;
  const requisitos = useMemo(
    () => (destinoId ? requisitosPara(destinoId, plantilla, pasajeros) : []),
    [destinoId, plantilla, pasajeros],
  );
  const extrasPasajeros = requisitos.filter((r) => SEGUN_PASAJEROS.has(r.key));

  const validar = () => {
    const e = {};
    if (paso === 0 && !destinoId) e.destino = 'Elegí un destino para continuar.';
    if (paso === 1) {
      if (!fechas.desde) e.fechas = 'Elegí la fecha de salida.';
      else if (!fechas.hasta) e.fechas = 'Elegí la fecha de vuelta.';
      else if (diasEntre(fechas.desde, fechas.hasta) > 90) e.fechas = 'El viaje no puede superar los 90 días.';
      if (nombre.trim().length > 80) e.nombre = 'Máximo 80 caracteres.';
    }
    if (paso === 2) Object.assign(e, validarPasajeros(pasajeros));
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const siguiente = () => {
    if (!validar()) return;
    setPaso((p) => p + 1);
  };

  const crear = async () => {
    setGuardando(true);
    try {
      const lista = limpiarPasajeros(pasajeros);
      const nombreFinal = nombre.trim() || `${destino.ciudadPrincipal}, ${destino.nombre}`;
      const id = await store.createTrip(
        user,
        {
          nombre: nombreFinal,
          destinoId,
          origen: ORIGEN.pais,
          fechaIda: fechas.desde,
          fechaVuelta: fechas.hasta,
          viajeros: lista.length,
          pasajeros: lista,
          plantilla,
          resumen: { total: requisitos.length, listos: 0, tramite: 0 },
        },
        itemsIniciales(destinoId, plantilla, lista),
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
                  ¿Cuándo viajás a {destino.ciudadPrincipal}?
                </h2>
                <RangoFechas
                  desde={fechas.desde}
                  hasta={fechas.hasta}
                  min={hoyISO()}
                  onChange={(f) => {
                    setFechas(f);
                    setErrores((x) => ({ ...x, fechas: undefined }));
                  }}
                  error={errores.fechas}
                />
                <div className="field wizard__name">
                  <label htmlFor="nombre">Nombre del viaje (opcional)</label>
                  <input
                    id="nombre"
                    className="input"
                    placeholder={`${destino.ciudadPrincipal}, ${destino.nombre}`}
                    value={nombre}
                    maxLength={80}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                  {errores.nombre && <span className="field__error">{errores.nombre}</span>}
                </div>
              </>
            )}

            {paso === 2 && (
              <>
                <h2 className="wizard__h">¿Quiénes viajan?</h2>
                <p className="muted wizard__lead">
                  Con la edad y la nacionalidad de cada pasajero sumamos los requisitos que correspondan, por ejemplo la
                  autorización para menores.
                </p>
                <PasajerosEditor
                  pasajeros={pasajeros}
                  onChange={(lista) => {
                    setPasajeros(lista);
                    setErrores({});
                  }}
                  uidTitular={user.uid}
                  errores={errores}
                />
              </>
            )}

            {paso === 3 && (
              <>
                <h2 className="wizard__h">¿Qué tipo de viaje es?</h2>
                <p className="muted wizard__lead">
                  Cada tipo trae por defecto los requisitos básicos del destino y los de tus pasajeros, más algunos propios
                  del tipo de viaje. Si preferís armar la lista desde cero, elegí Personalizado.
                </p>
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
                {plantilla === 'personalizado' ? (
                  <p className="wizard__sum">
                    Tu checklist arranca <strong>vacío</strong>: agregás vos cada requisito desde la pantalla del viaje.
                  </p>
                ) : (
                  <p className="wizard__sum">
                    Vamos a crear <strong className="mono">{requisitos.length}</strong> ítems para{' '}
                    <strong>{destino.nombre}</strong> y <strong className="mono">{pasajeros.length}</strong>{' '}
                    {pasajeros.length === 1 ? 'pasajero' : 'pasajeros'}. Después los editás a tu gusto.
                  </p>
                )}
                {extrasPasajeros.length > 0 && (
                  <div className="wizard__extras">
                    <p className="field__label">Según quiénes viajan, sumamos:</p>
                    <ul>
                      {extrasPasajeros.map((r) => (
                        <li key={r.key} className="chip chip--red">
                          {r.titulo}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
              {paso < PASOS.length - 1 ? (
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
