import { useState } from 'react';
import { PaperPlaneRight, Trash } from '@phosphor-icons/react';
import { useSub } from '../../lib/useSub.js';
import { cita, hace } from '../../lib/actividad.js';
import { mensajeError } from '../../lib/viajes.js';
import { Avatar, useToast } from '../../components/ui.jsx';

// Comentarios de un item: todos los miembros los leen; organizador y editores escriben
export default function Comentarios({ trip, item, user, editable, store, registrar }) {
  const toast = useToast();
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { data, cargando, error } = useSub(
    (ok, ko) => store.subscribeComentarios(trip.id, item.id, ok, ko),
    [store, trip.id, item.id],
  );
  const esOwner = trip.ownerId === user.uid;

  const enviar = async (ev) => {
    ev.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setEnviando(true);
    try {
      await store.addComentario(trip.id, item.id, {
        uid: user.uid,
        nombre: (user.displayName || 'Alguien').slice(0, 80),
        texto: t.slice(0, 500),
      });
      registrar('comentario', `comentó en ${cita(item.titulo)}`);
      setTexto('');
    } catch (e) {
      toast.error(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  };

  const borrar = async (c) => {
    try {
      await store.deleteComentario(trip.id, item.id, c.id);
    } catch (e) {
      toast.error(mensajeError(e));
    }
  };

  const lista = data || [];

  return (
    <section className="coms" aria-labelledby={`coms-${item.id}`}>
      <h4 id={`coms-${item.id}`} className="field__label">
        Comentarios {lista.length > 0 && <span className="mono">({lista.length})</span>}
      </h4>

      {cargando && <p className="muted coms__info">Cargando comentarios…</p>}
      {error && <p className="field__error">No pudimos cargar los comentarios.</p>}
      {!cargando && !error && lista.length === 0 && (
        <p className="muted coms__info">
          {editable ? 'Nadie comentó todavía. Usalo para decidir en grupo.' : 'Todavía no hay comentarios.'}
        </p>
      )}

      {lista.length > 0 && (
        <ul className="coms__list">
          {lista.map((c) => (
            <li key={c.id} className="com">
              <Avatar nombre={c.nombre} rojo={c.uid === user.uid} />
              <div className="com__body">
                <p className="com__meta">
                  <strong>{c.uid === user.uid ? 'Vos' : c.nombre}</strong>
                  <span className="muted">{hace(c.creado)}</span>
                </p>
                <p className="com__text">{c.texto}</p>
              </div>
              {(c.uid === user.uid || esOwner) && (
                <button type="button" className="icon-btn com__del" onClick={() => borrar(c)} aria-label="Borrar comentario">
                  <Trash size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <form className="coms__form" onSubmit={enviar}>
          <label htmlFor={`com-${item.id}`} className="sr-only">
            Escribir un comentario
          </label>
          <textarea
            id={`com-${item.id}`}
            className="textarea coms__input"
            rows={2}
            maxLength={500}
            placeholder="Escribí un comentario"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) enviar(e);
            }}
          />
          <button type="submit" className="btn btn--primary btn--sm" disabled={enviando || !texto.trim()}>
            {enviando ? <span className="spinner" /> : <PaperPlaneRight size={16} weight="fill" />}
            Comentar
          </button>
        </form>
      )}
    </section>
  );
}
