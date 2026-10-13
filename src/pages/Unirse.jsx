import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, LinkBreak, PencilSimple, UsersThree } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import Nav from '../components/Nav.jsx';
import { Cargando, useToast } from '../components/ui.jsx';
import { mensajeError } from '../lib/viajes.js';

export default function Unirse() {
  const { token } = useParams();
  const { user, store } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [invite, setInvite] = useState(undefined);
  const [uniendo, setUniendo] = useState(false);

  useEffect(() => {
    let vivo = true;
    store
      .getInvite(token)
      .then((i) => vivo && setInvite(i && i.activo ? i : null))
      .catch(() => vivo && setInvite(null));
    return () => {
      vivo = false;
    };
  }, [store, token]);

  const unirme = async () => {
    setUniendo(true);
    try {
      await store.joinTrip(user, { tripId: invite.tripId, token, rol: invite.rol });
      toast.ok('Ya sos parte del viaje.');
      navigate(`/viaje/${invite.tripId}`, { replace: true });
    } catch (e) {
      // Si ya era miembro, la regla rechaza el alta: igual lo llevamos al viaje
      if (e?.code === 'permission-denied') {
        navigate(`/viaje/${invite.tripId}`, { replace: true });
      } else {
        toast.error(mensajeError(e));
        setUniendo(false);
      }
    }
  };

  return (
    <>
      <div className="stage stage--aurora" aria-hidden="true" />
      <div className="page">
        <Nav />
        <main className="auth container">
          <section className="auth__card glass" aria-live="polite">
            {invite === undefined && <Cargando texto="Revisando la invitación" />}

            {invite === null && (
              <>
                <LinkBreak size={40} weight="duotone" />
                <h1 className="auth__title">Este link ya no funciona</h1>
                <p className="muted">Puede que quien organiza el viaje lo haya cerrado. Pedile uno nuevo.</p>
                <Link to="/viajes" className="btn btn--glass">
                  Ir a mis viajes
                </Link>
              </>
            )}

            {invite && (
              <>
                <UsersThree size={40} weight="duotone" />
                <h1 className="auth__title">Te invitaron a un viaje</h1>
                <p className="muted">
                  Vas a entrar con permiso de{' '}
                  <strong>{invite.rol === 'editor' ? 'edición' : 'solo lectura'}</strong>.
                </p>
                <p className="auth__role">
                  {invite.rol === 'editor' ? (
                    <>
                      <PencilSimple size={18} /> Podés tachar, agregar y modificar ítems.
                    </>
                  ) : (
                    <>
                      <Eye size={18} /> Podés ver el viaje y su avance, sin cambiar nada.
                    </>
                  )}
                </p>
                <button type="button" className="btn btn--primary btn--block" onClick={unirme} disabled={uniendo}>
                  {uniendo && <span className="spinner" />}
                  Unirme al viaje
                </button>
              </>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
