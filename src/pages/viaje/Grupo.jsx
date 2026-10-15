import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Eye, LinkSimple, PencilSimple, SignOut, Trash } from '@phosphor-icons/react';
import { useSub } from '../../lib/useSub.js';
import { mensajeError, ROLES } from '../../lib/viajes.js';
import { Avatar, useToast } from '../../components/ui.jsx';
import { GRUPOS_POR_ID } from '../../data/pasajeros.js';

const linkDe = (token) => `${window.location.origin}/unirse/${token}`;

async function copiar(texto, toast) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.ok('Link copiado al portapapeles.');
  } catch {
    toast.error('No pudimos copiar. Seleccioná el link y copialo a mano.');
  }
}

export default function Grupo({ trip, user, store }) {
  const toast = useToast();
  const navigate = useNavigate();
  const esOwner = trip.ownerId === user.uid;
  const [rol, setRol] = useState('editor');
  const [creando, setCreando] = useState(false);

  const { data: invites } = useSub(
    esOwner ? (ok, ko) => store.subscribeInvites(user, trip.id, ok, ko) : null,
    [store, trip.id, esOwner],
  );

  const miembros = Object.entries(trip.miembros || {}).map(([uid, r]) => ({
    uid,
    rol: r,
    ...(trip.miembrosInfo?.[uid] || { nombre: 'Viajero' }),
  }));
  miembros.sort((a, b) => (a.rol === 'owner' ? -1 : b.rol === 'owner' ? 1 : a.nombre.localeCompare(b.nombre)));

  const crearLink = async () => {
    setCreando(true);
    try {
      const token = await store.createInvite(user, trip.id, rol);
      await copiar(linkDe(token), toast);
    } catch (e) {
      toast.error(mensajeError(e));
    } finally {
      setCreando(false);
    }
  };

  const cambiarRol = async (uid, nuevo) => {
    try {
      await store.setMemberRole(trip.id, uid, nuevo);
      toast.ok('Rol actualizado.');
    } catch (e) {
      toast.error(mensajeError(e));
    }
  };

  const quitar = async (m) => {
    try {
      await store.removeMember(trip.id, m.uid);
      toast.ok(`${m.nombre} ya no tiene acceso.`);
    } catch (e) {
      toast.error(mensajeError(e));
    }
  };

  const salir = async () => {
    try {
      await store.removeMember(trip.id, user.uid);
      navigate('/viajes', { replace: true });
    } catch (e) {
      toast.error(mensajeError(e));
    }
  };

  const revocar = async (token) => {
    try {
      await store.revokeInvite(token);
      toast.ok('El link dejó de funcionar.');
    } catch (e) {
      toast.error(mensajeError(e));
    }
  };

  const pasajeros = trip.pasajeros || [];

  return (
    <div className="group">
      {pasajeros.length > 0 && (
        <section className="glass cat" aria-labelledby="g-pasajeros">
          <header className="cat__head">
            <h3 id="g-pasajeros">Pasajeros</h3>
            <span className="mono muted">{pasajeros.length}</span>
          </header>
          <ul className="members">
            {pasajeros.map((p) => (
              <li key={p.id}>
                <Avatar nombre={p.nombre} />
                <div className="members__name">
                  <strong>{p.nombre}</strong>
                  <span className="muted">
                    {GRUPOS_POR_ID[p.edad]?.nombre || 'Adulto'}, {p.nacionalidad}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          {esOwner && <p className="muted notice">Para cambiar los pasajeros usá el menú del viaje, Editar viaje.</p>}
        </section>
      )}

      <section className="glass cat" aria-labelledby="g-miembros">
        <header className="cat__head">
          <h3 id="g-miembros">Quiénes organizan</h3>
          <span className="mono muted">{miembros.length} con acceso</span>
        </header>
        <ul className="members">
          {miembros.map((m) => (
            <li key={m.uid}>
              <Avatar nombre={m.nombre} foto={m.foto} rojo={m.rol === 'owner'} />
              <div className="members__name">
                <strong>
                  {m.nombre}
                  {m.uid === user.uid && <span className="muted"> (vos)</span>}
                </strong>
                <span className="muted">{ROLES[m.rol]}</span>
              </div>
              {esOwner && m.rol !== 'owner' && (
                <div className="members__ctl">
                  <label className="sr-only" htmlFor={`rol-${m.uid}`}>
                    Rol de {m.nombre}
                  </label>
                  <select
                    id={`rol-${m.uid}`}
                    className="select"
                    value={m.rol}
                    onChange={(e) => cambiarRol(m.uid, e.target.value)}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Solo lectura</option>
                  </select>
                  <button type="button" className="icon-btn" onClick={() => quitar(m)} aria-label={`Quitar a ${m.nombre}`}>
                    <Trash size={18} />
                  </button>
                </div>
              )}
              {!esOwner && m.uid === user.uid && (
                <button type="button" className="btn btn--ghost btn--sm btn--danger" onClick={salir}>
                  <SignOut size={16} /> Salir del viaje
                </button>
              )}
            </li>
          ))}
        </ul>
        {trip.viajeros > miembros.length && (
          <p className="muted notice">
            El viaje es para {trip.viajeros} personas y {miembros.length} tienen la lista en Rumbo. Compartí el link para
            sumar al resto.
          </p>
        )}
      </section>

      {esOwner ? (
        <section className="glass cat" aria-labelledby="g-link">
          <header className="cat__head">
            <h3 id="g-link">Invitar con un link</h3>
          </header>
          <div className="invite">
            <div className="seg" role="radiogroup" aria-label="Rol de quien recibe el link">
              <button
                type="button"
                role="radio"
                aria-checked={rol === 'editor'}
                className={rol === 'editor' ? 'is-on' : ''}
                onClick={() => setRol('editor')}
              >
                <PencilSimple size={16} /> Puede editar
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={rol === 'viewer'}
                className={rol === 'viewer' ? 'is-on' : ''}
                onClick={() => setRol('viewer')}
              >
                <Eye size={16} /> Solo lectura
              </button>
            </div>
            <p className="muted">
              {rol === 'editor'
                ? 'Quien entre con este link podrá tachar, agregar y modificar ítems.'
                : 'Quien entre con este link podrá ver el viaje y su avance, sin cambiar nada.'}
            </p>
            <button type="button" className="btn btn--primary" onClick={crearLink} disabled={creando}>
              {creando ? <span className="spinner" /> : <LinkSimple size={18} />}
              Crear y copiar link
            </button>
          </div>

          {invites && invites.length > 0 && (
            <>
              <h4 className="invite__h">Links activos</h4>
              <ul className="invites">
                {invites.map((i) => (
                  <li key={i.id}>
                    <span className="chip">{i.rol === 'editor' ? 'Editor' : 'Solo lectura'}</span>
                    <input
                      className="input invites__link mono"
                      readOnly
                      value={linkDe(i.id)}
                      aria-label="Link de invitación"
                      onFocus={(e) => e.target.select()}
                    />
                    <button type="button" className="icon-btn" onClick={() => copiar(linkDe(i.id), toast)} aria-label="Copiar link">
                      <Copy size={18} />
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm btn--danger" onClick={() => revocar(i.id)}>
                      Cerrar link
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ) : (
        <p className="notice muted">Solo quien organiza el viaje puede crear links de invitación y cambiar roles.</p>
      )}
    </div>
  );
}
