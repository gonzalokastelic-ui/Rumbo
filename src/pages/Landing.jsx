import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowRight,
  ArrowUpRight,
  AirplaneTilt,
  Bed,
  Check,
  Eye,
  Link as LinkIcon,
  PencilSimple,
  ShareNetwork,
  Users,
} from '@phosphor-icons/react';
import Nav from '../components/Nav.jsx';
import { ProgressRing, Reveal } from '../components/ui.jsx';
import { DESTINOS, foto } from '../data/destinos.js';
import { CATEGORIAS_POR_ID, requisitosPara } from '../data/requisitos.js';
import { calendario, datosDestino, resumenPrecios } from '../lib/recomendados.js';
import { fechaLimite, formatoCorto, sumarDias } from '../lib/fechas.js';
import credits from '../data/credits.json';
import '../styles/landing.css';

gsap.registerPlugin(ScrollTrigger);

/* Los datos de la landing salen del mismo motor que usa la app */
const EEUU = requisitosPara('eeuu').slice(0, 6);
const IDA_EJEMPLO = '2027-02-14';

/* ================= Escenario fijo con las fotos ================= */
function Escenario({ refs, rootRef }) {
  return (
    <div className="stage" ref={rootRef} aria-hidden="true">
      {DESTINOS.map((d, i) => (
        <img
          key={d.id}
          ref={(el) => (refs.current[i] = el)}
          className={`stage__img ${i === 0 ? 'is-on' : ''}`}
          src={i === 0 ? foto(d.id) : undefined}
          data-src={foto(d.id)}
          alt=""
          decoding="async"
          fetchPriority={i === 0 ? 'high' : 'low'}
        />
      ))}
    </div>
  );
}

/* ================= 1. Hero ================= */
function Hero() {
  const items = EEUU.slice(0, 5);
  return (
    <section className="hero container" aria-labelledby="hero-titulo">
      <div className="hero__copy">
        <h1 id="hero-titulo" className="hero__title">
          Armá tu viaje sin que se te escape nada.
        </h1>
        <p className="hero__sub">
          Elegí un destino y Rumbo te arma el checklist completo: documentos, vuelos, alojamiento y actividades.
        </p>
        <div className="hero__cta">
          <Link to="/ingresar" className="btn btn--primary">
            Empezar mi viaje
            <span className="btn__ico">
              <ArrowRight size={16} weight="bold" />
            </span>
          </Link>
          <a href="#como" className="btn btn--ghost">
            Ver cómo funciona
          </a>
        </div>
      </div>

      <aside className="hero__card glass" aria-label="Ejemplo de checklist">
        <header className="hero__card-head">
          <div>
            <p className="hero__card-kicker">Argentina a Estados Unidos</p>
            <h2 className="hero__card-title">Checklist de Miami</h2>
          </div>
          <ProgressRing value={0.4} size={64} />
        </header>
        <ul className="mini-list">
          {items.map((it, i) => (
            <li key={it.key} className={i < 2 ? 'is-done' : ''}>
              <span className="mini-check">{i < 2 && <Check size={13} weight="bold" />}</span>
              <span>{it.titulo}</span>
              <span className="mono mini-days">{it.diasAntes} d</span>
            </li>
          ))}
        </ul>
      </aside>
    </section>
  );
}

/* ================= 2. Como funciona (pinned, scrub) ================= */
const PASOS = [
  { t: 'Elegís el destino', d: 'Argentina de origen, una de las 8 ciudades y tus fechas.' },
  { t: 'El checklist se arma solo', d: 'Documentos, salud, vuelos y alojamiento según el país.' },
  { t: 'Vas tachando y compartís', d: 'Cada ítem cambia de estado y todos ven el avance.' },
];

function ComoFunciona() {
  const root = useRef(null);
  const items = useMemo(() => requisitosPara('eeuu').slice(0, 6), []);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const el = root.current;
      const filas = el.querySelectorAll('.how__row');
      const pasos = el.querySelectorAll('.how__step');
      const barra = el.querySelector('.how__bar > span');
      const num = el.querySelector('.how__count');
      const anillo = el.querySelector('.how__ring');
      const cont = { v: 0 };

      gsap.set(barra, { scaleX: 0, transformOrigin: 'left' });
      gsap.set(filas, { opacity: 0.35 });
      gsap.set(pasos, { opacity: 0.4 });
      gsap.set(pasos[0], { opacity: 1 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: '+=2000',
          scrub: 0.6,
          pin: true,
          anticipatePin: 1,
        },
        defaults: { ease: 'none' },
      });

      filas.forEach((fila, i) => {
        const marca = fila.querySelector('.how__check');
        tl.to(fila, { opacity: 1, duration: 0.5 }, i)
          .to(marca, { scale: 1, backgroundColor: 'var(--red)', duration: 0.4 }, i + 0.3)
          .to(fila.querySelector('.how__tick'), { opacity: 1, scale: 1, duration: 0.3 }, i + 0.45)
          .to(fila.querySelector('.how__name'), { opacity: 0.55, duration: 0.3 }, i + 0.55);
      });
      tl.to(barra, { scaleX: 1, duration: filas.length }, 0.3);
      tl.to(
        cont,
        {
          v: filas.length,
          duration: filas.length,
          onUpdate: () => {
            num.textContent = Math.floor(cont.v + 0.0001);
            const p = cont.v / filas.length;
            anillo.style.setProperty('--p', p.toFixed(3));
            anillo.dataset.pct = Math.round(p * 100);
          },
        },
        0.3,
      );
      tl.to(pasos[0], { opacity: 0.4, duration: 0.4 }, 2)
        .to(pasos[1], { opacity: 1, duration: 0.4 }, 2)
        .to(pasos[1], { opacity: 0.4, duration: 0.4 }, 4)
        .to(pasos[2], { opacity: 1, duration: 0.4 }, 4);
    });
    return () => mm.revert();
  }, []);

  return (
    <section id="como" ref={root} className="how" aria-labelledby="como-titulo">
      <div className="how__pin container">
        <div className="how__copy">
          <h2 id="como-titulo">Todo lo que falta, en una sola lista.</h2>
          <ol className="how__steps">
            {PASOS.map((p, i) => (
              <li key={p.t} className="how__step">
                <span className="mono how__n">{i + 1}</span>
                <div>
                  <h3>{p.t}</h3>
                  <p className="muted">{p.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="how__card glass">
          <header className="how__head">
            <div>
              <p className="hero__card-kicker">Miami, febrero</p>
              <p className="how__tally">
                <span className="how__count mono">0</span>
                <span className="mono"> de {items.length}</span> listos
              </p>
            </div>
            <span className="how__ring" data-pct="0" style={{ '--p': 0 }} />
          </header>
          <div className="bar how__bar">
            <span />
          </div>
          <ul className="how__list">
            {items.map((it) => (
              <li key={it.key} className="how__row">
                <span className="how__check">
                  <Check className="how__tick" size={14} weight="bold" />
                </span>
                <span className="how__name">{it.titulo}</span>
                <span className="chip">{CATEGORIAS_POR_ID[it.categoria].nombre}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ================= 3. Destinos (paneo horizontal) ================= */
function Destinos({ stageRefs }) {
  const root = useRef(null);
  const track = useRef(null);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    const activar = (idx) => {
      stageRefs.current.forEach((img, i) => {
        if (!img) return;
        if (i === idx) img.classList.add('is-on');
        else img.classList.remove('is-on');
      });
    };

    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      const t = track.current;
      const distancia = () => Math.max(0, t.scrollWidth - window.innerWidth + 80);
      let ultimo = -1;
      gsap.to(t, {
        x: () => -distancia(),
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: () => `+=${distancia()}`,
          scrub: 0.6,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onLeave: () => activar(0),
          onUpdate: (self) => {
            const idx = Math.min(DESTINOS.length - 1, Math.round(self.progress * (DESTINOS.length - 1)));
            if (idx !== ultimo) {
              ultimo = idx;
              activar(idx);
            }
          },
        },
      });
      return () => activar(0);
    });

    mm.add('(max-width: 899px)', () => {
      const cards = root.current.querySelectorAll('.dest-card');
      const io = new IntersectionObserver(
        (entradas) => {
          entradas.forEach((e) => {
            if (e.isIntersecting) activar(Number(e.target.dataset.i));
          });
        },
        { threshold: 0.7 },
      );
      cards.forEach((c) => io.observe(c));
      return () => {
        io.disconnect();
        activar(0);
      };
    });

    return () => mm.revert();
  }, [stageRefs]);

  return (
    <section id="destinos" ref={root} className="dest" aria-labelledby="dest-titulo">
      <div className="dest__pin">
        <div className="container dest__head">
          <h2 id="dest-titulo">Ocho destinos que los argentinos eligen una y otra vez.</h2>
        </div>
        <div className="dest__track" ref={track}>
          {DESTINOS.map((d, i) => {
            const r = resumenPrecios(d.id);
            const directo = datosDestino(d.id).aerolineas.length;
            return (
              <article key={d.id} className="dest-card glass" data-i={i}>
                <div className="dest-card__img">
                  <img src={foto(d.id, 'sm')} alt={`${d.ciudadPrincipal}, ${d.nombre}`} loading="lazy" decoding="async" />
                </div>
                <div className="dest-card__body">
                  <div>
                    <p className="dest-card__city">{d.ciudadPrincipal}</p>
                    <h3>{d.nombre}</h3>
                  </div>
                  <p className="muted dest-card__tag">{d.tagline}</p>
                  <dl className="dest-card__facts">
                    <div>
                      <dt>Tiempo de vuelo</dt>
                      <dd className="mono">{d.vuelo}</dd>
                    </div>
                    {r && (
                      <div>
                        <dt>Pasajes desde</dt>
                        <dd className="mono">USD {r.min}</dd>
                      </div>
                    )}
                    <div>
                      <dt>Aerolíneas directas</dt>
                      <dd className="mono">{directo}</dd>
                    </div>
                  </dl>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ================= 4. Fechas limite (linea que se dibuja) ================= */
function FechasLimite() {
  const root = useRef(null);
  const lista = useMemo(
    () =>
      [...EEUU]
        .map((it) => ({ ...it, limite: fechaLimite(IDA_EJEMPLO, it.diasAntes) }))
        .sort((a, b) => (a.limite < b.limite ? -1 : 1)),
    [],
  );

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const linea = root.current.querySelector('.when__line > span');
      gsap.fromTo(
        linea,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current.querySelector('.when__list'),
            start: 'top 70%',
            end: 'bottom 60%',
            scrub: 0.5,
          },
        },
      );
    });
    return () => mm.revert();
  }, []);

  return (
    <section id="fechas" ref={root} className="when container" aria-labelledby="when-titulo">
      <div className="when__copy">
        <Reveal as="h2" id="when-titulo">
          Rumbo cuenta para atrás desde tu viaje.
        </Reveal>
        <Reveal as="p" className="muted when__lead" i={1}>
          Ponés la fecha de salida y cada trámite tiene su fecha límite. Si algo tarda meses, lo ves a tiempo.
        </Reveal>
        <Reveal as="div" className="when__goal glass glass--md" i={2}>
          <AirplaneTilt size={22} weight="fill" />
          <div>
            <p className="when__goal-title">Salida a Miami</p>
            <p className="mono muted">{formatoCorto(IDA_EJEMPLO)} 2027</p>
          </div>
        </Reveal>
      </div>

      <div className="when__timeline">
        <span className="when__line" aria-hidden="true">
          <span />
        </span>
        <ol className="when__list">
          {lista.map((it, i) => (
            <Reveal as="li" key={it.key} className="when__item" i={i % 3}>
              <span className="when__dot" aria-hidden="true" />
              <div className="when__card glass glass--md">
                <p className="mono when__date">{formatoCorto(it.limite)}</p>
                <div>
                  <h3>{it.titulo}</h3>
                  <p className="muted when__days">
                    <span className="mono">{it.diasAntes}</span> días antes de la salida
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ================= 5. Recomendados (bento con datos reales) ================= */
function Barras({ id }) {
  const cal = calendario(id);
  const max = Math.max(...cal.map((c) => c.precio));
  const min = Math.min(...cal.map((c) => c.precio));
  return (
    <div className="bars" role="img" aria-label={`Calendario de precios de pasajes a ${id}, el más barato USD ${min}`}>
      {cal.map((c) => (
        <span
          key={c.fecha}
          className={c.precio === min ? 'is-min' : ''}
          style={{ '--h': `${Math.max(10, (c.precio / max) * 100)}%` }}
          title={`${formatoCorto(c.fecha)}: USD ${c.precio}`}
        />
      ))}
    </div>
  );
}

function Recomendados() {
  const r = resumenPrecios('espana');
  const hotel = datosDestino('espana').hoteles[0];
  const act = DESTINOS.find((d) => d.id === 'espana').actividades.slice(0, 4);
  return (
    <section id="recomendados" className="recs container" aria-labelledby="recs-titulo">
      <Reveal as="h2" id="recs-titulo" className="recs__title">
        Vuelos y hoteles a mano, sin salir del plan.
      </Reveal>

      <div className="bento">
        <Reveal as="article" className="bento__flights glass">
          <header className="bento__head">
            <div>
              <h3>Cuándo conviene volar a Madrid</h3>
              <p className="muted">Precio de ida y vuelta por día de salida, de SlickTrip.</p>
            </div>
            <div className="bento__price">
              <span className="muted">desde</span>
              <strong className="mono">USD {r.min}</strong>
            </div>
          </header>
          <Barras id="espana" />
          <footer className="bento__foot">
            <span className="chip chip--red">Salida más barata: {formatoCorto(r.fechaMin)}</span>
            <span className="chip">Mediana USD {r.mediana}</span>
          </footer>
        </Reveal>

        {hotel && (
          <Reveal as="article" className="bento__hotel glass" i={1}>
            <img src={hotel.foto} alt={hotel.nombre} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
            <div className="bento__hotel-body">
              <p className="chip">
                <Bed size={14} weight="fill" /> {hotel.estrellas} estrellas
              </p>
              <h3>{hotel.nombre}</h3>
              <p className="muted mono">Puntaje {hotel.puntaje} de 10</p>
              <span className="bento__link">
                Ver en Brek <ArrowUpRight size={16} />
              </span>
            </div>
          </Reveal>
        )}

        <Reveal as="article" className="bento__acts glass" i={2}>
          <h3>Actividades para sumar</h3>
          <ul>
            {act.map((a) => (
              <li key={a.titulo}>
                <span>{a.titulo}</span>
                <span className="mono muted">{a.costo ? `USD ${a.costo}` : 'Gratis'}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal as="article" className="bento__alert glass" i={3}>
          <AirplaneTilt size={26} weight="fill" />
          <h3>No vendemos pasajes</h3>
          <p className="muted">
            Rumbo organiza y recomienda. Cada tarjeta te lleva al sitio de SlickTrip o Brek con tus fechas ya cargadas.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ================= 6. Compartir con roles ================= */
function Compartir() {
  const [rol, setRol] = useState('editor');
  const permisos = {
    editor: ['Ve todo el viaje', 'Tacha y agrega ítems', 'Cambia fechas y notas', 'No puede borrar el viaje'],
    viewer: ['Ve todo el viaje', 'Sigue el progreso', 'No puede modificar nada', 'No puede borrar el viaje'],
  };
  return (
    <section id="compartir" className="share container" aria-labelledby="share-titulo">
      <div className="share__copy">
        <Reveal as="h2" id="share-titulo">
          Un solo link y todos organizan el mismo viaje.
        </Reveal>
        <Reveal as="p" className="muted" i={1}>
          Elegís si quien entra puede editar o solo mirar. Podés cambiar el rol o cerrar el link cuando quieras.
        </Reveal>
      </div>

      <Reveal as="div" className="share__card glass" i={1}>
        <div className="share__link">
          <LinkIcon size={18} />
          <span className="mono">rumbo.app/unirse/9f3c…a1b7</span>
          <span className="chip chip--red">
            <ShareNetwork size={14} /> Compartir
          </span>
        </div>

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

        <ul className="share__perms" key={rol}>
          {permisos[rol].map((p, i) => (
            <li key={p} style={{ '--i': i }}>
              <Check size={16} weight="bold" />
              {p}
            </li>
          ))}
        </ul>

        <div className="share__people">
          <span className="avatars">
            <span className="avatar avatar--red">M</span>
            <span className="avatar">L</span>
            <span className="avatar">J</span>
          </span>
          <span className="muted">
            <Users size={16} style={{ verticalAlign: '-3px' }} /> 3 viajeros
          </span>
        </div>
      </Reveal>
    </section>
  );
}

/* ================= 7. Cierre ================= */
function Cierre() {
  return (
    <section className="finale container" aria-labelledby="finale-titulo">
      <Reveal as="h2" id="finale-titulo" className="finale__title">
        Tu próximo viaje empieza con una lista.
      </Reveal>
      <Reveal as="div" i={1}>
        <Link to="/ingresar" className="btn btn--primary">
          Crear mi primer viaje
          <span className="btn__ico">
            <ArrowRight size={16} weight="bold" />
          </span>
        </Link>
      </Reveal>
    </section>
  );
}

function Pie() {
  const [abierto, setAbierto] = useState(false);
  const nombres = { brasil: 'Río de Janeiro', chile: 'Santiago', espana: 'Madrid', eeuu: 'Miami', italia: 'Roma', uruguay: 'Punta del Este', mexico: 'Cancún', aruba: 'Aruba' };
  return (
    <footer className="footer container">
      <div className="footer__row">
        <p className="muted">
          Rumbo organiza tu viaje y no vende pasajes ni alojamiento. Los requisitos migratorios cambian: confirmalos
          siempre en la fuente oficial.
        </p>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
          Créditos de fotos
        </button>
      </div>
      {abierto && (
        <ul className="footer__credits">
          {credits.map((c) => (
            <li key={c.id}>
              <span>{nombres[c.id]}</span>
              <a href={c.url} target="_blank" rel="noreferrer">
                {c.autor}, {c.licencia}
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="muted footer__small">
        Datos de vuelos y hoteles de SlickTrip y Brek, de referencia al {formatoCorto(sumarDias('2026-10-13', 0))} de 2026.
      </p>
    </footer>
  );
}

/* ================= Pagina ================= */
export default function Landing() {
  const stageRefs = useRef([]);
  const stageRoot = useRef(null);

  // Pasada la seccion de destinos, el escenario se calma (foto desenfocada)
  useLayoutEffect(() => {
    const st = ScrollTrigger.create({
      trigger: '#fechas',
      start: 'top 85%',
      onToggle: (self) => stageRoot.current?.classList.toggle('stage--calm', self.isActive || self.progress === 1),
    });
    return () => st.kill();
  }, []);

  // Las fotos de los otros destinos se cargan en segundo plano, de a una
  useEffect(() => {
    let cancelado = false;
    const imgs = stageRefs.current.slice(1);
    const cargar = (i) => {
      if (cancelado || i >= imgs.length) return;
      const el = imgs[i];
      if (!el) return;
      el.onload = el.onerror = () => cargar(i + 1);
      el.src = el.dataset.src;
    };
    const t = setTimeout(() => cargar(0), 1200);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <>
      <Escenario refs={stageRefs} rootRef={stageRoot} />
      <div className="page landing">
        <Nav landing />
        <main>
          <Hero />
          <ComoFunciona />
          <Destinos stageRefs={stageRefs} />
          <FechasLimite />
          <Recomendados />
          <Compartir />
          <Cierre />
        </main>
        <Pie />
      </div>
    </>
  );
}
