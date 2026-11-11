import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from './lib/supabase.js';
import { hoyMes } from './lib/escalas.js';
import { CAMBIOS_LOGICA } from './lib/cambiosLogica.js';
import { contextoCalculo } from './lib/proyecto.js';
import LogCambios from './pantallas/LogCambios.jsx';
import Basicos from './pantallas/Basicos.jsx';
import Parametros from './pantallas/Parametros.jsx';
import TipoCambio from './pantallas/TipoCambio.jsx';
import Proyectos from './pantallas/Proyectos.jsx';
import Proyecto from './pantallas/Proyecto.jsx';

const MENU = [
  ['#/', 'Proyectos'],
  ['#/escalas', 'Básicos y divisas'],
  ['#/parametros', 'Parámetros'],
  ['#/tipo-cambio', 'Tipo de cambio'],
  ['#/log', 'Log de cambios'],
];

function useRuta() {
  const [ruta, setRuta] = useState(() => window.location.hash || '#/');
  useEffect(() => {
    const f = () => { setRuta(window.location.hash || '#/'); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return ruta;
}

export default function App() {
  const [sesion, setSesion] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s));
    return () => data.subscription.unsubscribe();
  }, []);
  const ruta = useRuta();

  return (
    <div className="app">
      <header className="barra">
        <a href="#/" className="marca"><img src="/terramare-azul.png" alt="TERRAMARE" /></a>
        <div className="barra-titulo">
          <div className="overline">Calculadora de sueldos</div>
          <div className="barra-sub">Personal embarcado · FENA / FESIMAF</div>
        </div>
        {sesion && (
          <nav className="menu">
            {MENU.map(([h, n]) => {
              const activo = h === '#/' ? ruta === '#/' || ruta.startsWith('#/p/') : ruta.startsWith(h);
              return <a key={h} href={h} className={activo ? 'activo' : ''}>{n}</a>;
            })}
          </nav>
        )}
        <div className="usuario">
          <a className="volver-portal" href="https://integra.home.terra-mare.com.ar">← Portal</a>
          {sesion && <><span className="usuario-mail">{sesion.user.email}</span>
            <button className="terciario" onClick={() => supabase.auth.signOut()}>Salir</button></>}
        </div>
      </header>
      {sesion === undefined ? null : sesion ? <Calculadora email={sesion.user.email} ruta={ruta} /> : <Ingreso />}
    </div>
  );
}

function Ingreso() {
  const [modo, setModo] = useState('entrar');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [aviso, setAviso] = useState(null);
  const [enviando, setEnviando] = useState(false);
  async function enviar(e) {
    e.preventDefault();
    setAviso(null); setEnviando(true);
    const r = modo === 'entrar'
      ? await supabase.auth.signInWithPassword({ email, password: clave })
      : await supabase.auth.signUp({ email, password: clave, options: { emailRedirectTo: window.location.origin } });
    setEnviando(false);
    if (r.error) setAviso({ error: true, texto: r.error.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos.' : r.error.message });
    else if (modo === 'crear') { setAviso({ texto: `Te enviamos un email a ${email} para confirmar la cuenta.` }); setModo('entrar'); }
  }
  return (
    <main className="ingreso">
      <h1>{modo === 'entrar' ? 'Ingresar.' : 'Crear cuenta.'}</h1>
      <div className="filete" />
      <p className="aviso">Es la misma cuenta del portal de Terra Mare.</p>
      <form onSubmit={enviar}>
        <label>Email<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Contraseña{modo === 'crear' && ' (mínimo 10 caracteres)'}
          <input type="password" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} required
            minLength={modo === 'crear' ? 10 : undefined} value={clave} onChange={(e) => setClave(e.target.value)} />
        </label>
        <button disabled={enviando}>{modo === 'entrar' ? 'Ingresar' : 'Crear cuenta'}</button>
      </form>
      {aviso && <p className={aviso.error ? 'aviso error' : 'aviso'}>{aviso.texto}</p>}
      <button className="terciario" onClick={() => { setModo(modo === 'entrar' ? 'crear' : 'entrar'); setAviso(null); }}>
        {modo === 'entrar' ? 'No tengo cuenta: crear una' : 'Ya tengo cuenta: ingresar'}
      </button>
    </main>
  );
}

const TABLAS = {
  categorias: () => supabase.from('cs_categorias').select('*'),
  actas: () => supabase.from('cs_actas').select('*').order('firmada_el', { ascending: false, nullsFirst: false }),
  basicos: () => supabase.from('cs_basicos').select('*'),
  overrides: () => supabase.from('cs_overrides').select('*').order('created_at', { ascending: false }),
  parametros: () => supabase.from('cs_parametros').select('*').order('vigente_desde', { ascending: false }),
  divisas: () => supabase.from('cs_divisas').select('*').order('vigente_desde', { ascending: false }),
  adicionales: () => supabase.from('cs_adicionales').select('*').order('orden').order('nombre'),
  log: () => supabase.from('cs_log').select('*').order('at', { ascending: false }).limit(1000),
};

function Calculadora({ email, ruta }) {
  const [acceso, setAcceso] = useState(undefined);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [mesEscalas, setMesEscalas] = useState(hoyMes());
  const [tcConsulta, setTcConsulta] = useState({ tipo: 'divisa_venta' });

  useEffect(() => {
    Promise.all([supabase.rpc('cs_puede_ver'), supabase.rpc('cs_puede_editar')])
      .then(([v, e]) => setAcceso(v.data ? { editor: !!e.data } : null), () => setAcceso(null));
  }, []);

  const recargar = useCallback(async (...cuales) => {
    const nombres = cuales.length ? cuales : Object.keys(TABLAS);
    const res = await Promise.all(nombres.map((n) => TABLAS[n]()));
    const err = res.find((r) => r.error);
    if (err) { setError(err.error.message); return; }
    setDatos((d) => ({ ...(d ?? {}), ...Object.fromEntries(nombres.map((n, i) => [n, res[i].data])) }));
  }, []);
  useEffect(() => { if (acceso) recargar(); }, [acceso, recargar]);

  // Los cambios de lógica del código quedan en el log la primera vez que entra un editor.
  useEffect(() => {
    if (!acceso?.editor || !datos?.log) return;
    const faltan = CAMBIOS_LOGICA.filter((c) => !datos.log.some((l) => l.tipo === 'logica' && l.version === c.version));
    if (!faltan.length) return;
    supabase.from('cs_log').insert(faltan.map((c) => ({
      tipo: 'logica', version: c.version, vigente_desde: c.fecha, descripcion: c.descripcion, email: email.toLowerCase(), detalle: { cambios: c.detalle },
    }))).then(() => recargar('log'));
  }, [acceso, datos?.log, email, recargar]);

  const base = useMemo(() => (datos ? { datos, editor: acceso?.editor, email, recargar } : null), [datos, acceso, email, recargar]);
  const ctxEscalas = useMemo(() => (base ? { ...base, ...contextoCalculo(datos, mesEscalas), setMes: setMesEscalas } : null), [base, datos, mesEscalas]);

  if (acceso === undefined) return <main><p className="aviso">Cargando…</p></main>;
  if (acceso === null) return (
    <main>
      <h1>Sin acceso.</h1><div className="filete" />
      <p className="aviso">Tu cuenta no tiene habilitada la calculadora de sueldos. Pedí el acceso desde el panel de Administración del portal Terra Mare.</p>
    </main>
  );
  if (error) return <main><p className="aviso error">No se pudieron leer los datos: {error}</p></main>;
  if (!base) return <main><p className="aviso">Cargando…</p></main>;

  const m = ruta.match(/^#\/p\/([^/]+)(?:\/([\w-]+))?/);
  if (m) return <Proyecto key={m[1]} ctx={base} id={m[1]} seccion={m[2] ?? 'tripulacion'} />;
  return (
    <main>
      {ruta.startsWith('#/escalas') && <Basicos ctx={ctxEscalas} />}
      {ruta.startsWith('#/parametros') && <Parametros ctx={ctxEscalas} />}
      {ruta.startsWith('#/tipo-cambio') && <TipoCambio ctx={{ ...ctxEscalas, tc: tcConsulta, setTc: setTcConsulta }} />}
      {ruta.startsWith('#/log') && <LogCambios ctx={base} />}
      {(ruta === '#/' || ruta === '#' || ruta === '') && <Proyectos ctx={base} />}
      <p className="aviso pie">Lógica {CAMBIOS_LOGICA[0].version}</p>
    </main>
  );
}
