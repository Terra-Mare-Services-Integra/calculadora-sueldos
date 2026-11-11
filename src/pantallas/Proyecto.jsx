import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { REGIMEN } from '../lib/categorias.js';
import { proyectoNuevo, calcularProyecto, migrarProyecto } from '../lib/proyecto.js';
import { fmt, fmt0, fmtMes } from '../lib/formato.js';
import { hoyMes } from '../lib/escalas.js';
import Configuracion from './proyecto/Configuracion.jsx';
import Tripulacion from './proyecto/Tripulacion.jsx';
import PosicionDia from './proyecto/PosicionDia.jsx';
import Liquidacion from './proyecto/Liquidacion.jsx';

const SECCIONES = [
  ['configuracion', 'Configuración', 'Tipo de cambio, escala y días'],
  ['tripulacion', 'Tripulación', 'Puestos, cantidades y adicionales'],
  ['posicion', 'Posición por día', 'Costo diario por puesto'],
  ['liquidacion', 'Cálculo de liquidación', 'Tablas completas'],
];

export default function Proyecto({ ctx, id, seccion }) {
  const [fila, setFila] = useState(null);
  const [p, setP] = useState(null);
  const [estado, setEstado] = useState('guardado');
  const [error, setError] = useState(null);
  const pendiente = useRef(null);

  useEffect(() => {
    supabase.from('cs_crewing').select('*').eq('id', id).single().then(({ data, error: e }) => {
      if (e) { setError(e.message); return; }
      setFila(data);
      setP(migrarProyecto({ ...proyectoNuevo({ nombre: data.nombre, regimen: 'terramare' }), ...data.datos, nombre: data.nombre }));
    });
  }, [id]);

  // Guardado automático (al dejar de tipear un momento).
  const sinCambios = useRef(true);
  const set = (cambio) => {
    sinCambios.current = false;
    setEstado('pendiente');
    setP((prev) => ({ ...prev, ...(typeof cambio === 'function' ? cambio(prev) : cambio) }));
  };
  useEffect(() => {
    if (!p || sinCambios.current) return;
    clearTimeout(pendiente.current);
    pendiente.current = setTimeout(async () => {
      setEstado('guardando');
      const { nombre, ...datos } = p;
      const { error: e } = await supabase.from('cs_crewing').update({ nombre: nombre || 'Sin nombre', datos }).eq('id', id);
      setEstado(e ? 'error' : 'guardado');
      if (e) setError(e.message);
    }, 700);
  }, [p, id]);
  // Si se sale del proyecto con cambios pendientes, se guardan igual.
  const ultimo = useRef(null);
  ultimo.current = { p, sucio: estado === 'pendiente' };
  useEffect(() => () => {
    clearTimeout(pendiente.current);
    const { p: q, sucio } = ultimo.current ?? {};
    if (sucio && q) { const { nombre, ...datos } = q; supabase.from('cs_crewing').update({ nombre: nombre || 'Sin nombre', datos }).eq('id', id).then(() => {}); }
  }, [id]);
  useEffect(() => {
    const f = (e) => { if (ultimo.current?.sucio) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', f);
    return () => window.removeEventListener('beforeunload', f);
  }, []);

  const calc = useMemo(() => (p ? calcularProyecto(ctx.datos, p) : null), [ctx.datos, p]);

  if (error && !p) return <main><p className="aviso error">No se pudo abrir el proyecto: {error}</p><a href="#/">← Proyectos</a></main>;
  if (!p || !calc) return <main><p className="aviso">Cargando…</p></main>;

  const avisos = [];
  if (!calc.c.fx) avisos.push(['configuracion', 'Elegí el tipo de cambio']);
  if (!calc.c.parametros) avisos.push(['configuracion', 'Faltan los parámetros de cálculo']);
  const sinBasico = p.lineas.filter((l) => !calc.c.basicos[l.categoria]?.monto).length;
  if (sinBasico) avisos.push(['tripulacion', `${sinBasico} posiciones sin básico cargado`]);
  if (!p.lineas.length) avisos.push(['tripulacion', 'Agregá las posiciones']);
  const sinAdic = p.lineas.filter((l) => !Object.values(l.a ?? {}).some((v) => v)).length;
  if (sinAdic) avisos.push(['tripulacion', `${sinAdic} ${sinAdic === 1 ? 'posición' : 'posiciones'} sin adicionales`]);
  const provisoria = p.lineas.some((l) => calc.c.basicos[l.categoria]?.provisoria);

  const props = { ctx, p, set, calc };
  return (
    <div className="proyecto">
      <aside className="lateral">
        <a href="#/" className="volver">← Proyectos</a>
        <div className="lateral-titulo">
          <span className={`chip regimen-${p.regimen}`}>{REGIMEN[p.regimen]?.nombre}</span>
          <h2>{p.nombre}</h2>
          {p.cliente && <div className="ayuda">{p.cliente}</div>}
        </div>
        <nav>
          {SECCIONES.map(([k, n, d]) => (
            <a key={k} href={`#/p/${id}/${k}`} className={seccion === k ? 'activo' : ''}>
              <span>{n}</span><span className="ayuda">{d}</span>
            </a>
          ))}
        </nav>
        <div className="resumen-lateral">
          <div><span className="etiqueta">Personas</span><span className="mono">{fmt0(calc.resumen.personas)}</span></div>
          <div><span className="etiqueta">Costo por día navegado</span><span className="mono">{calc.c.fx ? `USD ${fmt(calc.navegadoDiaUsd)}` : '—'}</span></div>
          <div><span className="etiqueta">Total del proyecto</span><span className="mono grande">{calc.c.fx ? `USD ${fmt(calc.resumen.usd.total ?? 0)}` : '—'}</span></div>
          <div className="ayuda">Escala {fmtMes(p.mes || hoyMes())}{provisoria ? ' (provisoria)' : ''} · TC {calc.c.fx ? fmt(calc.c.fx) : '—'}</div>
        </div>
        {avisos.length > 0 && (
          <ul className="avisos-lateral">
            {avisos.map(([s, t]) => <li key={t}><a href={`#/p/${id}/${s}`}>{t}</a></li>)}
          </ul>
        )}
        <div className={`guardado ${estado}`}>{{ guardado: 'Guardado', pendiente: 'Cambios sin guardar…', guardando: 'Guardando…', error: 'Error al guardar' }[estado]}</div>
        <div className="ayuda">Creado por {fila.created_by}</div>
      </aside>
      <main className="contenido">
        {seccion === 'configuracion' && <Configuracion {...props} />}
        {seccion === 'tripulacion' && <Tripulacion {...props} />}
        {seccion === 'posicion' && <PosicionDia {...props} />}
        {seccion === 'liquidacion' && <Liquidacion {...props} />}
        {error && <p className="aviso error">{error}</p>}
      </main>
    </div>
  );
}
