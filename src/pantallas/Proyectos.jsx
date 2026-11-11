import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { REGIMENES, REGIMEN } from '../lib/categorias.js';
import { proyectoNuevo, calcularProyecto } from '../lib/proyecto.js';
import { fmt, fmt0, fmtFechaHora } from '../lib/formato.js';
import CatalogoAdicionales from '../componentes/CatalogoAdicionales.jsx';

export default function Proyectos({ ctx }) {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState(null);
  const [creando, setCreando] = useState(false);
  const [buscar, setBuscar] = useState('');

  const cargar = () => supabase.from('cs_crewing').select('*').order('updated_at', { ascending: false })
    .then(({ data, error: e }) => (e ? setError(e.message) : setLista(data)));
  useEffect(() => { cargar(); }, []);

  const filas = useMemo(() => (lista ?? [])
    .filter((x) => !buscar || `${x.nombre} ${x.datos?.cliente ?? ''}`.toLowerCase().includes(buscar.toLowerCase()))
    .map((x) => {
      const p = { ...proyectoNuevo({ nombre: x.nombre, regimen: 'terramare' }), ...x.datos, nombre: x.nombre };
      let calc = null;
      try { calc = calcularProyecto(ctx.datos, p); } catch { /* proyecto incompleto */ }
      return { x, p, calc };
    }), [lista, buscar, ctx.datos]);

  async function duplicar(x) {
    const { data, error: e } = await supabase.from('cs_crewing')
      .insert({ nombre: `${x.nombre} (copia)`, datos: x.datos, created_by: ctx.email.toLowerCase() }).select('id').single();
    if (e) setError(e.message); else window.location.hash = `#/p/${data.id}/configuracion`;
  }
  async function borrar(x) {
    if (!confirm(`¿Borrar el proyecto "${x.nombre}"?`)) return;
    const { error: e } = await supabase.from('cs_crewing').delete().eq('id', x.id);
    if (e) setError(e.message); else cargar();
  }

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Proyectos.</h1>
          <div className="filete" />
        </div>
        <button onClick={() => setCreando(true)}>+ Crear proyecto</button>
      </div>
      <p className="aviso">Cada proyecto es una cotización de tripulación: elegís la forma de liquidar, armás las posiciones con sus adicionales y la app
        calcula el costo por día, la liquidación completa y el total en dólares.</p>

      {creando && <Asistente ctx={ctx} cerrar={() => setCreando(false)} />}
      {error && <p className="aviso error">{error}</p>}

      {lista && lista.length > 3 && (
        <div className="fila-botones"><label>Buscar<input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Nombre o cliente" /></label></div>
      )}
      {lista === null ? <p className="aviso">Cargando…</p> : !lista.length && !creando ? (
        <div className="vacio">
          <p>Todavía no hay proyectos.</p>
          <button onClick={() => setCreando(true)}>Crear el primero</button>
        </div>
      ) : (
        <div className="proyectos">
          {filas.map(({ x, p, calc }) => (
            <article key={x.id} className="proyecto-tarjeta">
              <a href={`#/p/${x.id}/tripulacion`} className="proyecto-link">
                <div className="fila-chips"><span className={`chip regimen-${p.regimen}`}>{REGIMEN[p.regimen]?.nombre ?? p.regimen}</span>
                  {p.cliente && <span className="ayuda">{p.cliente}</span>}</div>
                <h3>{x.nombre}</h3>
                <div className="cifras">
                  <div><span className="etiqueta">Personas</span><span className="mono">{fmt0(calc?.resumen.personas ?? 0)}</span></div>
                  <div><span className="etiqueta">USD / día navegado</span><span className="mono">{calc?.c.fx ? fmt(calc.navegadoDiaUsd) : '—'}</span></div>
                  <div><span className="etiqueta">Total USD</span><span className="mono">{calc?.c.fx ? fmt(calc.resumen.usd.total ?? 0) : '—'}</span></div>
                </div>
                <div className="ayuda">Modificado {fmtFechaHora(x.updated_at)} · {x.updated_by}</div>
              </a>
              <div className="proyecto-acciones">
                <button className="secundario" onClick={() => duplicar(x)}>Duplicar</button>
                <button className="terciario" onClick={() => borrar(x)}>Borrar</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function Asistente({ ctx, cerrar }) {
  const [paso, setPaso] = useState(1);
  const [nombre, setNombre] = useState('');
  const [cliente, setCliente] = useState('');
  const [regimen, setRegimen] = useState(null);
  const [adicionales, setAdicionales] = useState(() => (ctx.datos.adicionales ?? []).filter((c) => c.activo && c.por_defecto).map((c) => c.id));
  const [error, setError] = useState(null);
  const [creando, setCreando] = useState(false);

  async function crear() {
    setCreando(true);
    const datos = proyectoNuevo({ nombre: nombre.trim(), cliente: cliente.trim(), regimen, adicionales });
    const { data, error: e } = await supabase.from('cs_crewing')
      .insert({ nombre: nombre.trim(), datos, created_by: ctx.email.toLowerCase() }).select('id').single();
    setCreando(false);
    if (e) { setError(e.message); return; }
    window.location.hash = `#/p/${data.id}/configuracion`;
  }

  return (
    <section className="asistente">
      <div className="pasos">
        {['Proyecto', 'Forma de liquidar', 'Adicionales', 'Listo'].map((n, i) => (
          <span key={n} className={`paso ${paso === i + 1 ? 'actual' : paso > i + 1 ? 'hecho' : ''}`}><b>{i + 1}</b> {n}</span>
        ))}
        <button className="terciario" onClick={cerrar}>Cancelar</button>
      </div>

      {paso === 1 && (
        <form onSubmit={(e) => { e.preventDefault(); setPaso(2); }} className="paso-cuerpo">
          <label>Nombre del proyecto<input autoFocus required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder='Ej.: "Supply C · Vaca Muerta offshore"' /></label>
          <label>Cliente / buque (opcional)<input value={cliente} onChange={(e) => setCliente(e.target.value)} /></label>
          <div className="fila-botones"><button disabled={!nombre.trim()}>Siguiente</button></div>
        </form>
      )}

      {paso === 2 && (
        <div className="paso-cuerpo">
          <p className="aviso">¿Cómo se liquida el personal de este proyecto?</p>
          <div className="opciones-grandes">
            {REGIMENES.map((r) => (
              <button key={r.clave} className={`opcion-grande ${regimen === r.clave ? 'elegida' : ''}`} onClick={() => setRegimen(r.clave)}>
                <span className="opcion-titulo">{r.nombre}</span>
                <span className="opcion-detalle">{r.detalle}</span>
                <span className="opcion-nota">{{
                  terramare: 'Terra Mare contrata y factura al cliente: suma Ingresos Brutos e impuesto al crédito y débito.',
                  eventuales: 'Personal propio no efectivo, contratado por proyecto.',
                  efectivos: 'Personal de planta: liquidación con antigüedad y vacaciones propias, sin integración de contrato.',
                }[r.clave]}</span>
              </button>
            ))}
          </div>
          <div className="fila-botones">
            <button className="secundario" onClick={() => setPaso(1)}>Atrás</button>
            <button disabled={!regimen} onClick={() => setPaso(3)}>Siguiente</button>
          </div>
        </div>
      )}

      {paso === 3 && (
        <div className="paso-cuerpo ancho">
          <p className="aviso">¿Qué adicionales se pagan en este proyecto? Vienen tildados los habituales: sacá los que no van, sumá otros o creá uno nuevo.
            El valor de cada uno (Supply A, B o C; RJ 84 % o 140 %…) se elige después en cada posición.</p>
          <CatalogoAdicionales ctx={ctx} seleccion={adicionales} onCambio={setAdicionales} />
          <div className="fila-botones">
            <button className="secundario" onClick={() => setPaso(2)}>Atrás</button>
            <button onClick={() => setPaso(4)}>Siguiente</button>
          </div>
        </div>
      )}

      {paso === 4 && (
        <div className="paso-cuerpo">
          <p><strong>{nombre}</strong>{cliente ? ` · ${cliente}` : ''} · liquidación <strong>{REGIMEN[regimen].nombre}</strong>.</p>
          <p className="aviso">Adicionales: {(ctx.datos.adicionales ?? []).filter((c) => adicionales.includes(c.id)).map((c) => c.nombre).join(', ') || 'ninguno'}.</p>
          <p className="aviso">Al crearlo vas a la configuración (tipo de cambio, mes de escala y días) y de ahí a armar la tripulación.</p>
          <div className="fila-botones">
            <button className="secundario" onClick={() => setPaso(3)}>Atrás</button>
            <button onClick={crear} disabled={creando}>{creando ? 'Creando…' : 'Crear proyecto'}</button>
          </div>
          {error && <p className="aviso error">{error}</p>}
        </div>
      )}
    </section>
  );
}
