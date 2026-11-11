import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from './lib/supabase.js';
import { basicosVigentes, vigente, hoyMes } from './lib/escalas.js';
import { CAMBIOS_LOGICA } from './lib/cambiosLogica.js';
import { fmt, fmtMes } from './lib/formato.js';
import LogCambios from './pantallas/LogCambios.jsx';
import Basicos from './pantallas/Basicos.jsx';
import Parametros from './pantallas/Parametros.jsx';
import TipoCambio, { TIPOS_TC } from './pantallas/TipoCambio.jsx';
import Liquidacion from './pantallas/Liquidacion.jsx';
import Crewing from './pantallas/Crewing.jsx';
import PosicionDia from './pantallas/PosicionDia.jsx';

const VISTAS = [
  ['log', 'Log de cambios'],
  ['crewing', 'Calculadora Crewing'],
  ['posicion', 'Posición Día Ext.'],
  ['liquidacion', 'Liquidación de sueldos'],
  ['basicos', 'Básicos y divisas'],
  ['parametros', 'Parámetros'],
  ['tc', 'Tipo de cambio'],
];

const leerLocal = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } };
const guardarLocal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

export default function App() {
  const [sesion, setSesion] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="app">
      <header className="barra">
        <img src="/terramare-azul.png" alt="TERRAMARE" />
        <div className="barra-titulo">
          <div className="overline">Calculadora de sueldos</div>
          <div className="barra-sub">Personal embarcado · FENA / FESIMAF</div>
        </div>
        <a className="volver-portal" href="https://integra.home.terra-mare.com.ar">← Portal Terra Mare</a>
        {sesion && (
          <div className="usuario">
            <span>{sesion.user.email}</span>
            <button className="terciario" onClick={() => supabase.auth.signOut()}>Salir</button>
          </div>
        )}
      </header>
      {sesion === undefined ? null : sesion ? <Calculadora email={sesion.user.email} /> : <Ingreso />}
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
  log: () => supabase.from('cs_log').select('*').order('at', { ascending: false }).limit(1000),
};

function Calculadora({ email }) {
  const [acceso, setAcceso] = useState(undefined);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [vista, setVista] = useState(() => leerLocal('cs-vista', 'crewing'));
  const [mes, setMes] = useState(hoyMes());
  const [tc, setTcState] = useState(() => leerLocal('cs-tc', { tipo: 'divisa_venta' }));
  const setTc = (t) => { setTcState(t); guardarLocal('cs-tc', t); };
  const irA = (v) => { setVista(v); guardarLocal('cs-vista', v); };

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

  const ctx = useMemo(() => {
    if (!datos) return null;
    const finMes = `${mes}-31`;
    const parametros = vigente(datos.parametros, finMes);
    const divisas = vigente(datos.divisas, finMes);
    const activos = datos.overrides.filter((o) => o.activo);
    const basicos = basicosVigentes({ categorias: datos.categorias, basicos: datos.basicos, actas: datos.actas, overrides: activos, mes });
    const fx = tc.tipo === 'manual' ? Number(tc.manual) || 0 : Number(tc.valores?.[tc.tipo]) || 0;
    return { datos, mes, parametros, valores: parametros?.valores ?? {}, divisas: divisas?.valores ?? {}, divisasFila: divisas,
      basicos, fx, tc, setTc, editor: acceso?.editor, email, recargar, irA };
  }, [datos, mes, tc, acceso, email, recargar]);

  if (acceso === undefined) return <main><p className="aviso">Cargando…</p></main>;
  if (acceso === null) return (
    <main>
      <h1>Sin acceso.</h1><div className="filete" />
      <p className="aviso">Tu cuenta no tiene habilitada la calculadora de sueldos. Pedí el acceso desde el panel de Administración del portal Terra Mare.</p>
    </main>
  );
  if (error) return <main><p className="aviso error">No se pudieron leer los datos: {error}</p></main>;
  if (!ctx) return <main><p className="aviso">Cargando…</p></main>;

  const provisorias = Object.values(ctx.basicos).filter((b) => b.provisoria && b.monto > 0).length;
  const tipoTc = TIPOS_TC.find((t) => t[0] === tc.tipo)?.[1] ?? tc.tipo;

  return (
    <>
      <nav className="vistas">
        {VISTAS.map(([k, n]) => <button key={k} className={`vista ${vista === k ? 'activa' : ''}`} onClick={() => irA(k)}>{n}</button>)}
      </nav>
      <div className="contexto">
        <label>Mes de escala
          <input type="month" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} />
        </label>
        <div className="dato"><span className="etiqueta">Escala aplicada</span>
          <span>{provisorias ? <span className="chip alerta" title="No hay acta para este mes: se usa la última vigente">última vigente · {provisorias} provisorias</span> : <span className="chip ok">acta del mes</span>}</span>
        </div>
        <div className="dato"><span className="etiqueta">Tipo de cambio ({tipoTc}{tc.fecha ? ` · ${tc.fecha}` : ''})</span>
          <span className="valor">{ctx.fx ? fmt(ctx.fx) : <button className="secundario" onClick={() => irA('tc')}>Elegir</button>}</span>
        </div>
        <div className="dato"><span className="etiqueta">Parámetros vigentes</span>
          <span className="valor">{ctx.parametros ? `desde ${ctx.parametros.vigente_desde}` : 'sin cargar'}</span>
        </div>
        <div className="dato"><span className="etiqueta">Rol</span><span>{acceso.editor ? 'Edición' : 'Consulta'}</span></div>
      </div>
      <main>
        {vista === 'log' && <LogCambios ctx={ctx} />}
        {vista === 'crewing' && <Crewing ctx={ctx} />}
        {vista === 'posicion' && <PosicionDia ctx={ctx} />}
        {vista === 'liquidacion' && <Liquidacion ctx={ctx} />}
        {vista === 'basicos' && <Basicos ctx={ctx} />}
        {vista === 'parametros' && <Parametros ctx={ctx} />}
        {vista === 'tc' && <TipoCambio ctx={ctx} />}
        <p className="aviso" style={{ marginTop: 48 }}>Mes {fmtMes(mes)} · lógica {CAMBIOS_LOGICA[0].version}</p>
      </main>
    </>
  );
}
