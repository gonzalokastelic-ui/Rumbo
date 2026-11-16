import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Eye, LinkSimple, PencilSimple, SignOut, Trash } from '@phosphor-icons/react';
import { useSub } from '../../lib/useSub.js';
import { mensajeError, nuevoToken, ROLES } from '../../lib/viajes.js';
import { Avatar, useToast } from '../../components/ui.jsx';
import { GRUPOS_POR_ID } from '../../data/pasajeros.js';
import { hace } from '../../lib/actividad.js';

const linkDe = (token) => `${window.location.origin}/unirse/${token}`;

// Respaldo para navegadores que bloquean la API del portapapeles
function copiarConSeleccion(texto) {
  const area = document.createElement('textarea');
  area.value = texto;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}

// Se llama dentro del clic, sin esperar nada antes: si pasa por un await,
// Safari y algunos Chrome ya no lo toman como gesto y bloquean el portapapeles.
async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return copiarConSeleccion(texto);
  }
}

const ms = (t) => (t?.toMillis ? t.toMillis() : typeof t === 'number' ? t : 0);

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

  // Un link activo por rol: el mas nuevo de cada uno. Si quedaron varios de antes,
  // cerrar el link los cierra a todos.
  const porRol = (r) => (invites || []).filter((i) => i.rol === r).sort((a, b) => ms(b.creado) - ms(a.creado));
  const activos = ['editor', 'viewer'].map((r) => ({ rol: r, lista: porRol(r) })).filter((g) => g.lista.length);
  const actual = porRol(rol)[0];

  const avisarCopia = (ok) =>
    ok ? toast.ok('Link copiado. Pegalo donde quieras compartirlo.') : toast.error('No pudimos copiar. Copiá el link de la lista de abajo.');

  const copiarLink = async () => {
    // Ya hay un link con este rol: se copia ese, no se crea otro
    if (actual) {
      avisarCopia(await copiar(linkDe(actual.id)));
      return;
    }
    // El codigo se genera aca para copiar el link en el mismo clic y guardarlo despues
    const token = nuevoToken();
    const copiado = copiar(linkDe(token));
    setCreando(true);
    try {
      await store.createInvite(user, trip.id, rol, token);
      avisarCopia(await copiado);
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

  const revocar = async (lista) => {
    try {
      await Promise.all(lista.map((i) => store.revokeInvite(i.id)));
      toast.ok('El link dejó de funcionar.');
    } catch (e) {
      toast.error(mensajeError(e));
    }
  };

  const pasajeros = trip.pasajeros || [];
  const { data: actividad, cargando: cargandoAct } = useSub(
    (ok, ko) => store.subscribeActividad(trip.id, ok, ko),
    [store, trip.id],
  );

  return (
    <div className="group">
      <section className="glass cat" aria-labelledby="g-actividad">
        <header className="cat__head">
          <h3 id="g-actividad">Actividad reciente</h3>
        </header>
        {cargandoAct ? (
          <p className="muted notice">Cargando actividad…</p>
        ) : !actividad?.length ? (
          <p className="muted notice">
            Acá vas a ver lo que hace cada persona del grupo: lo que tilda, agrega, comenta o agenda.
          </p>
        ) : (
          <ol className="feed">
            {actividad.map((a) => (
              <li key={a.id} className="feed__item">
                <Avatar nombre={a.nombre} rojo={a.uid === user.uid} />
                <p>
                  <strong>{a.nombre}</strong>{a.uid === user.uid && <span className="muted"> (vos)</span>} {a.texto}
                  <span className="muted feed__when"> {hace(a.creado)}</span>
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

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
            <button type="button" className="btn btn--primary" onClick={copiarLink} disabled={creando}>
              {creando ? <span className="spinner" /> : <LinkSimple size={18} />}
              {actual ? 'Copiar link' : 'Crear y copiar link'}
            </button>
          </div>

          {activos.length > 0 && (
            <>
              <h4 className="invite__h">Links activos</h4>
              <ul className="invites">
                {activos.map(({ rol: r, lista }) => (
                  <li key={r}>
                    <span className="chip">{r === 'editor' ? 'Editor' : 'Solo lectura'}</span>
                    <input
                      className="input invites__link mono"
                      readOnly
                      value={linkDe(lista[0].id)}
                      aria-label={`Link de invitación, ${r === 'editor' ? 'editor' : 'solo lectura'}`}
                      onFocus={(e) => e.target.select()}
                    />
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={async () => avisarCopia(await copiar(linkDe(lista[0].id)))}
                      aria-label="Copiar link"
                    >
                      <Copy size={18} />
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm btn--danger" onClick={() => revocar(lista)}>
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
