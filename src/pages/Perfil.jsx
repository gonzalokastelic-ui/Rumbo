import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Nav from '../components/Nav.jsx';
import { useToast } from '../components/ui.jsx';
import { NACIONALIDADES, edadDesde } from '../data/pasajeros.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = Array.from({ length: 111 }, (_, i) => ANIO_ACTUAL - i);

const partes = (iso) => {
  if (!iso) return { d: '', m: '', a: '' };
  const [a, m, d] = iso.split('-');
  return { d: String(Number(d)), m: String(Number(m)), a };
};

export default function Perfil() {
  const { user, perfil, guardarPerfil } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const completar = !perfil;

  const inicial = partes(perfil?.nacimiento);
  const [nombre, setNombre] = useState(perfil?.nombre || user.displayName || '');
  const [dia, setDia] = useState(inicial.d);
  const [mes, setMes] = useState(inicial.m);
  const [anio, setAnio] = useState(inicial.a);
  const [nacionalidad, setNacionalidad] = useState(perfil?.nacionalidad || 'Argentina');
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const guardar = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (nombre.trim().length < 2) e.nombre = 'Escribí tu nombre y apellido.';
    let nacimiento = null;
    if (!dia || !mes || !anio) e.nacimiento = 'Completá día, mes y año.';
    else {
      const f = new Date(Number(anio), Number(mes) - 1, Number(dia));
      const valida = f.getDate() === Number(dia) && f.getMonth() === Number(mes) - 1;
      nacimiento = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const edad = edadDesde(nacimiento);
      if (!valida) e.nacimiento = 'Esa fecha no existe.';
      else if (edad < 0) e.nacimiento = 'La fecha no puede ser futura.';
    }
    setErrores(e);
    if (Object.keys(e).length) return;

    setGuardando(true);
    try {
      await guardarPerfil({ nombre: nombre.trim().slice(0, 80), nacimiento, nacionalidad });
      toast.ok(completar ? 'Listo, ya podés armar tu viaje.' : 'Perfil actualizado.');
      navigate(location.state?.from || '/viajes', { replace: true });
    } catch (err) {
      console.error(err);
      toast.error('No pudimos guardar tu perfil. Intentá de nuevo.');
      setGuardando(false);
    }
  };

  return (
    <>
      <div className="stage stage--aurora" aria-hidden="true" />
      <div className="page">
        <Nav />
        <main className="auth container">
          <form className="auth__card glass" onSubmit={guardar} noValidate aria-labelledby="perfil-titulo">
            <h1 id="perfil-titulo" className="auth__title">
              {completar ? 'Contanos un poco de vos' : 'Tu perfil'}
            </h1>
            <p className="muted">
              Lo usamos para armar los requisitos de tus viajes. No te pedimos documentos.
            </p>

            <div className="field">
              <label htmlFor="p-nombre">Nombre y apellido</label>
              <input
                id="p-nombre"
                className="input"
                autoComplete="name"
                value={nombre}
                maxLength={80}
                onChange={(e) => setNombre(e.target.value)}
                aria-invalid={Boolean(errores.nombre)}
              />
              {errores.nombre && <span className="field__error">{errores.nombre}</span>}
            </div>

            <fieldset className="field fieldset">
              <legend className="field__label">Fecha de nacimiento</legend>
              <div className="fecha3">
                <select className="select" aria-label="Día" value={dia} onChange={(e) => setDia(e.target.value)}>
                  <option value="">Día</option>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>
                      {i + 1}
                    </option>
                  ))}
                </select>
                <select className="select" aria-label="Mes" value={mes} onChange={(e) => setMes(e.target.value)}>
                  <option value="">Mes</option>
                  {MESES.map((m, i) => (
                    <option key={m} value={String(i + 1)}>
                      {m}
                    </option>
                  ))}
                </select>
                <select className="select" aria-label="Año" value={anio} onChange={(e) => setAnio(e.target.value)}>
                  <option value="">Año</option>
                  {ANIOS.map((a) => (
                    <option key={a} value={String(a)}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <span className="field__hint">Sirve para saber si aplican requisitos de menores o de mayores de 65.</span>
              {errores.nacimiento && <span className="field__error">{errores.nacimiento}</span>}
            </fieldset>

            <div className="field">
              <label htmlFor="p-nac">Nacionalidad</label>
              <select id="p-nac" className="select" value={nacionalidad} onChange={(e) => setNacionalidad(e.target.value)}>
                {NACIONALIDADES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="field__hint">Los requisitos de Rumbo están pensados para pasaporte argentino.</span>
            </div>

            <button type="submit" className="btn btn--primary btn--block" disabled={guardando}>
              {guardando && <span className="spinner" />}
              {completar ? 'Continuar' : 'Guardar cambios'}
            </button>
          </form>
        </main>
      </div>
    </>
  );
}
