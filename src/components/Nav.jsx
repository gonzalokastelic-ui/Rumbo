import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { SignOut, SuitcaseRolling } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar, Logo, ThemeToggle } from './ui.jsx';

export default function Nav({ landing = false }) {
  const { user, salir } = useAuth();
  const [elevada, setElevada] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    // Un sentinel evita escuchar el evento scroll: se observa cuando sale de la vista
    const s = document.getElementById('nav-sentinel');
    if (!s) return undefined;
    const io = new IntersectionObserver(([e]) => setElevada(!e.isIntersecting), { threshold: 0 });
    io.observe(s);
    return () => io.disconnect();
  }, [pathname]);

  return (
    <>
      <span id="nav-sentinel" aria-hidden="true" style={{ position: 'absolute', top: 0, height: 24, width: 1 }} />
      <header className={`nav ${elevada ? 'is-scrolled' : ''}`}>
        <nav className="nav__bar glass" aria-label="Principal">
          <Link to="/" className="nav__logo" aria-label="Rumbo, inicio">
            <Logo size={30} />
          </Link>

          {landing && (
            <div className="nav__links">
              <a href="#como">Cómo funciona</a>
              <a href="#destinos">Destinos</a>
              <a href="#recomendados">Recomendados</a>
              <a href="#compartir">Compartir</a>
            </div>
          )}

          <div className="nav__end">
            <ThemeToggle />
            {user ? (
              <>
                <NavLink to="/viajes" className="btn btn--glass btn--sm">
                  <SuitcaseRolling size={18} />
                  <span className="nav__hide-sm">Mis viajes</span>
                </NavLink>
                <button type="button" className="icon-btn" onClick={salir} aria-label="Cerrar sesión" title="Cerrar sesión">
                  <SignOut size={20} />
                </button>
                <span className="nav__hide-sm">
                  <Avatar nombre={user.displayName} foto={user.photoURL} rojo />
                </span>
              </>
            ) : (
              <Link to="/ingresar" className="btn btn--primary btn--sm">
                Ingresar
              </Link>
            )}
          </div>
        </nav>
      </header>
    </>
  );
}
