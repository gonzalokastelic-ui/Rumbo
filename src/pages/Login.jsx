import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Eye, EyeSlash, GoogleLogo, Info } from '@phosphor-icons/react';
import { mensajeAuth, useAuth } from '../context/AuthContext.jsx';
import Nav from '../components/Nav.jsx';
import { Cargando } from '../components/ui.jsx';

export default function Login() {
  const { user, listo, hasFirebase, entrarConGoogle, entrarConEmail, crearCuenta, entrarDemo } = useAuth();
  const location = useLocation();
  const destino = location.state?.from || '/viajes';

  const [modo, setModo] = useState('entrar');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!listo) {
    return (
      <div className="auth-wait">
        <Cargando texto="Preparando tu sesión" />
      </div>
    );
  }
  if (user) return <Navigate to={destino} replace />;

  const validar = () => {
    const e = {};
    if (modo === 'crear' && nombre.trim().length < 2) e.nombre = 'Escribí tu nombre.';
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Ingresá un email válido.';
    if (password.length < 6) e.password = 'Mínimo 6 caracteres.';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const enviar = async (ev) => {
    ev.preventDefault();
    setError('');
    if (!validar()) return;
    setEnviando(true);
    try {
      if (modo === 'crear') await crearCuenta(nombre.trim(), email.trim(), password);
      else await entrarConEmail(email.trim(), password);
    } catch (e) {
      setError(mensajeAuth(e));
    } finally {
      setEnviando(false);
    }
  };

  const google = async () => {
    setError('');
    setEnviando(true);
    try {
      await entrarConGoogle();
    } catch (e) {
      setError(mensajeAuth(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <div className="stage stage--aurora" aria-hidden="true" />
      <div className="page">
        <Nav />
        <main className="auth container">
          <section className="auth__card glass" aria-labelledby="auth-titulo">
            <h1 id="auth-titulo" className="auth__title">
              {modo === 'entrar' ? 'Volvé a tu viaje' : 'Creá tu cuenta'}
            </h1>
            <p className="muted">Guardamos tu progreso para que lo retomes desde cualquier dispositivo.</p>

            {!hasFirebase ? (
              <div className="auth__demo">
                <p className="auth__note">
                  <Info size={20} weight="fill" />
                  <span>
                    Firebase no está configurado todavía, así que la app corre en modo demo: los datos viven en esta
                    pestaña y se pierden al recargar.
                  </span>
                </p>
                <button type="button" className="btn btn--primary btn--block" onClick={entrarDemo}>
                  Entrar en modo demo
                </button>
              </div>
            ) : (
              <>
                <button type="button" className="btn btn--glass btn--block" onClick={google} disabled={enviando}>
                  <GoogleLogo size={20} weight="bold" />
                  Continuar con Google
                </button>

                <div className="auth__sep">
                  <span>o con tu email</span>
                </div>

                <form className="auth__form" onSubmit={enviar} noValidate>
                  {modo === 'crear' && (
                    <div className="field">
                      <label htmlFor="nombre">Nombre</label>
                      <input
                        id="nombre"
                        className="input"
                        autoComplete="name"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        aria-invalid={Boolean(errores.nombre)}
                      />
                      {errores.nombre && <span className="field__error">{errores.nombre}</span>}
                    </div>
                  )}
                  <div className="field">
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      className="input"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-invalid={Boolean(errores.email)}
                    />
                    {errores.email && <span className="field__error">{errores.email}</span>}
                  </div>
                  <div className="field">
                    <label htmlFor="password">Contraseña</label>
                    <div className="pass">
                      <input
                        id="password"
                        type={verPassword ? 'text' : 'password'}
                        className="input"
                        autoComplete={modo === 'crear' ? 'new-password' : 'current-password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        aria-invalid={Boolean(errores.password)}
                      />
                      <button
                        type="button"
                        className="icon-btn pass__toggle"
                        onClick={() => setVerPassword((v) => !v)}
                        aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        aria-pressed={verPassword}
                        aria-controls="password"
                      >
                        {verPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {errores.password && <span className="field__error">{errores.password}</span>}
                  </div>

                  {error && (
                    <p className="field__error auth__error" role="alert">
                      {error}
                    </p>
                  )}

                  <button type="submit" className="btn btn--primary btn--block" disabled={enviando}>
                    {enviando && <span className="spinner" />}
                    {modo === 'entrar' ? 'Ingresar' : 'Crear cuenta'}
                  </button>
                </form>

                <p className="auth__switch">
                  {modo === 'entrar' ? '¿Primera vez en Rumbo?' : '¿Ya tenés cuenta?'}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setModo(modo === 'entrar' ? 'crear' : 'entrar');
                      setErrores({});
                      setError('');
                    }}
                  >
                    {modo === 'entrar' ? 'Crear una cuenta' : 'Ingresar'}
                  </button>
                </p>
              </>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
