import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { CATEGORIAS_LIQUIDACION, REGIMENES, REGIMEN, CATEGORIA } from '../lib/categorias.js';
import { CAMPOS_REGIMEN, AJUSTABLES_CREWING } from '../lib/parametros.js';
import { useCrewing, lineaNueva, crewingVacio, calcularCrewing } from '../lib/crewingEstado.js';
import { fmt, fmt0, leerNumero, fmtFechaHora } from '../lib/formato.js';

const ADIC = [
  ['rj', 'RJ / Plus op.'], ['supply', 'Supply / Buque mayor'], ['locacion', 'Locación / Gasero'],
  ['acta', 'Acta 04-08-22'], ['regimenFranco', 'Régimen franco'], ['precioFranco', 'Precio franco'],
];
const DIAS = [['navegado', 'Navegado'], ['integracion', 'Integración'], ['ordenes15', 'Órdenes 0-15'], ['ordenes90', 'Órdenes 16-90'], ['divisas', 'Divisas']];
const EXTRAS = [['lavanderia', 'Lavand.'], ['trasladoPuerto', 'Trasl. puerto'], ['trasladoDomestico', 'Trasl. dom.'], ['hospedaje', 'Hosp.'], ['epp', 'EPP']];

// Porcentaje editable: se muestra 84 y se guarda 0,84.
function Pct({ valor, onChange }) {
  const [t, setT] = useState(valor ? String(Math.round(valor * 1e6) / 1e4).replace('.', ',') : '');
  useEffect(() => { const n = leerNumero(t); if ((n ?? 0) / 100 !== (valor ?? 0)) setT(valor ? String(Math.round(valor * 1e6) / 1e4).replace('.', ',') : ''); }, [valor]); // eslint-disable-line
  return <input className="num" style={{ width: 60 }} value={t} placeholder="0" onChange={(e) => { setT(e.target.value); onChange((leerNumero(e.target.value) ?? 0) / 100); }} />;
}
function Num({ valor, onChange, ancho = 52, placeholder = '0' }) {
  return <input className="num" style={{ width: ancho }} value={valor ?? ''} placeholder={placeholder}
    onChange={(e) => onChange(e.target.value === '' ? '' : leerNumero(e.target.value) ?? e.target.value)} />;
}

export default function Crewing({ ctx }) {
  const [estado, setEstado] = useCrewing();
  const { lineas, resumen } = useMemo(() => calcularCrewing(ctx, estado), [ctx, estado]);
  const porId = Object.fromEntries(lineas.map((l) => [l.linea.id, l]));
  const ayuda = ctx.valores.globales?.ayudaAdicionales;

  const setLinea = (id, cambio) => setEstado((e) => ({ ...e, lineas: e.lineas.map((l) => (l.id === id ? { ...l, ...cambio } : l)) }));
  const setAjuste = (reg, k, v) => setEstado((e) => ({ ...e, ajustes: { ...e.ajustes, [reg]: { ...(e.ajustes?.[reg] ?? {}), [k]: v } } }));
  const sinFx = !ctx.fx;
  const faltanBasicos = [...new Set(estado.lineas.filter((l) => !ctx.basicos[l.categoria]?.monto).map((l) => CATEGORIA[l.categoria]?.nombre))];

  return (
    <>
      <h1>Calculadora Crewing.</h1>
      <div className="filete" />
      <p className="aviso">Armá la tripulación: cada línea es un puesto con su régimen, adicionales, cantidad y días por situación. Los costos se calculan
        con la escala de {ctx.mes}, los parámetros vigentes y el tipo de cambio elegido. El borrador queda en este navegador; guardalo para compartirlo.</p>
      {sinFx && <p className="aviso error">Falta elegir el tipo de cambio (pestaña Tipo de cambio).</p>}
      {!ctx.parametros && <p className="aviso error">Faltan cargar los parámetros de cálculo.</p>}
      {faltanBasicos.length > 0 && <p className="aviso error">Sin básico cargado: {faltanBasicos.join(', ')}.</p>}

      <Guardadas ctx={ctx} estado={estado} setEstado={setEstado} />

      <section>
        <h2>Variables por régimen</h2>
        <p className="aviso">Vacío = valor de los parámetros vigentes. Lo que cambies acá vale solo para esta cotización.</p>
        <div className="tabla-marco"><table className="tabla">
          <thead><tr><th className="fijo">Variable</th>{REGIMENES.map((r) => <th key={r.clave}>{r.nombre}<div className="ayuda">{r.detalle}</div></th>)}</tr></thead>
          <tbody>
            {CAMPOS_REGIMEN.filter((c) => AJUSTABLES_CREWING.includes(c.k)).map((c) => (
              <tr key={c.k}>
                <td className="fijo">{c.label}</td>
                {REGIMENES.map((r) => {
                  const aj = estado.ajustes?.[r.clave]?.[c.k];
                  const base = ctx.valores?.[r.clave]?.[c.k];
                  const set = (v) => setAjuste(r.clave, c.k, v);
                  return (
                    <td key={r.clave}>
                      {c.tipo === 'opcion' && <select value={aj ?? ''} onChange={(e) => set(e.target.value || undefined)}>
                        <option value="">{base ? `(${c.nombres?.[base] ?? base})` : '—'}</option>
                        {c.opciones.map((o) => <option key={o} value={o}>{c.nombres?.[o] ?? o}</option>)}
                      </select>}
                      {c.tipo === 'si-no' && <select value={aj === undefined ? '' : aj ? 'Si' : 'No'} onChange={(e) => set(e.target.value === '' ? undefined : e.target.value === 'Si')}>
                        <option value="">{base === undefined ? '—' : `(${base ? 'Sí' : 'No'})`}</option><option>Si</option><option>No</option>
                      </select>}
                      {c.tipo === 'pct' && <span><Pct valor={aj} onChange={(v) => set(v || undefined)} /> % <span className="ayuda">({base != null ? fmt(base * 100) : '—'})</span></span>}
                      {c.tipo === 'num' && <span><Num valor={aj} placeholder={base != null ? String(base) : ''} onChange={(v) => set(v === '' ? undefined : v)} /> {c.unidad}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>

      <section>
        <h2>Tripulación</h2>
        {ayuda && <details><summary>Ayuda de adicionales</summary><p className="ayuda">{ayuda}</p></details>}
        <div className="tabla-marco"><table className="tabla">
          <thead>
            <tr>
              <th>Régimen</th><th className="fijo">Puesto</th><th>Nota</th>
              {ADIC.map(([k, n]) => <th key={k} className="n">{n} %</th>)}
              <th className="n">Cant.</th>
              {DIAS.map(([k, n]) => <th key={k} className="n">Días {n.toLowerCase()}</th>)}
              {EXTRAS.map(([k, n]) => <th key={k}>{n}</th>)}
              <th className="n">Antig. (años)</th><th className="n">Vacac. (días)</th>
              <th className="n">Básico</th><th className="n">Navegado ARS/día unit.</th><th className="n">Sueldos USD</th><th className="n">Extras USD</th><th className="n">Total USD</th><th />
            </tr>
          </thead>
          <tbody>
            {estado.lineas.map((l) => {
              const c = porId[l.id];
              const extras = c ? c.r.usd.total - c.r.usd.sueldos : 0;
              return (
                <tr key={l.id}>
                  <td><select value={l.regimen} onChange={(e) => setLinea(l.id, { regimen: e.target.value })}>
                    {REGIMENES.map((r) => <option key={r.clave} value={r.clave}>{r.nombre}</option>)}</select></td>
                  <td className="fijo"><select value={l.categoria} onChange={(e) => setLinea(l.id, { categoria: e.target.value })}>
                    {CATEGORIAS_LIQUIDACION.map((x) => <option key={x.clave} value={x.clave}>{x.nombre}</option>)}</select></td>
                  <td><input style={{ width: 120 }} value={l.nota} onChange={(e) => setLinea(l.id, { nota: e.target.value })} /></td>
                  {ADIC.map(([k]) => <td key={k}><Pct valor={l.a[k]} onChange={(v) => setLinea(l.id, { a: { ...l.a, [k]: v } })} /></td>)}
                  <td><Num valor={l.cantidad} onChange={(v) => setLinea(l.id, { cantidad: v })} /></td>
                  {DIAS.map(([k]) => <td key={k}><Num valor={l.dias[k]} onChange={(v) => setLinea(l.id, { dias: { ...l.dias, [k]: v } })} /></td>)}
                  {EXTRAS.map(([k]) => <td key={k} style={{ textAlign: 'center' }}><input type="checkbox" checked={!!l[k]} onChange={(e) => setLinea(l.id, { [k]: e.target.checked })} /></td>)}
                  <td><Num valor={l.antiguedadAnios} placeholder={String(c?.p.antiguedadAnios ?? '')} onChange={(v) => setLinea(l.id, { antiguedadAnios: v })} /></td>
                  <td><Num valor={l.vacacionesDias} placeholder={String(c?.p.vacacionesDias ?? '')} onChange={(v) => setLinea(l.id, { vacacionesDias: v })} /></td>
                  <td className="n">{c ? fmt(c.basico) : '—'}</td>
                  <td className="n">{c ? fmt(c.r.unitarioDia.navegado) : '—'}</td>
                  <td className="n">{c ? fmt(c.r.usd.sueldos) : '—'}</td>
                  <td className="n">{c ? fmt(extras) : '—'}</td>
                  <td className="n"><strong>{c ? fmt(c.r.usd.total) : '—'}</strong></td>
                  <td><button className="terciario" title="Quitar" onClick={() => setEstado((e) => ({ ...e, lineas: e.lineas.filter((x) => x.id !== l.id) }))}>×</button></td>
                </tr>
              );
            })}
            {!estado.lineas.length && <tr><td colSpan={30} className="aviso">Agregá el primer puesto.</td></tr>}
          </tbody>
        </table></div>
        <div className="fila-botones">
          {REGIMENES.map((r) => <button key={r.clave} className="secundario" onClick={() => setEstado((e) => ({ ...e, lineas: [...e.lineas, lineaNueva(r.clave)] }))}>+ Puesto {r.nombre}</button>)}
        </div>
      </section>

      <section>
        <h2>Resumen</h2>
        <div className="tarjetas">
          <div className="tarjeta"><div className="etiqueta">Personas</div><div className="grande">{fmt0(resumen.personas)}</div></div>
          <div className="tarjeta"><div className="etiqueta">Sueldos (USD)</div><div className="grande">{fmt(resumen.usd.sueldos ?? 0)}</div></div>
          <div className="tarjeta"><div className="etiqueta">Traslados, hospedaje, lavandería y EPP (USD)</div>
            <div className="grande">{fmt((resumen.usd.trasladoDomestico ?? 0) + (resumen.usd.trasladoPuerto ?? 0) + (resumen.usd.hospedaje ?? 0) + (resumen.usd.lavanderia ?? 0) + (resumen.usd.epp ?? 0))}</div></div>
          <div className="tarjeta"><div className="etiqueta">Divisas (USD)</div><div className="grande">{fmt(resumen.usd.divisas ?? 0)}</div></div>
          <div className="tarjeta elegida"><div className="etiqueta">Total tripulación (USD)</div><div className="grande">{fmt(resumen.usd.total ?? 0)}</div></div>
          <div className="tarjeta"><div className="etiqueta">Víveres (USD por día)</div><div className="grande">{fmt(resumen.viveresDia)}</div></div>
        </div>
        <h3>Por régimen</h3>
        <div className="tabla-marco"><table className="tabla">
          <thead><tr><th>Régimen</th><th className="n">Personas</th><th className="n">Sueldos USD</th><th className="n">Total USD</th></tr></thead>
          <tbody>{REGIMENES.map((r) => {
            const ls = lineas.filter((x) => x.linea.regimen === r.clave);
            if (!ls.length) return null;
            return <tr key={r.clave}><td>{REGIMEN[r.clave].nombre}</td><td className="n">{fmt0(ls.reduce((s, x) => s + (Number(x.linea.cantidad) || 0), 0))}</td>
              <td className="n">{fmt(ls.reduce((s, x) => s + x.r.usd.sueldos, 0))}</td><td className="n">{fmt(ls.reduce((s, x) => s + x.r.usd.total, 0))}</td></tr>;
          })}</tbody>
        </table></div>
      </section>
    </>
  );
}

function Guardadas({ ctx, estado, setEstado }) {
  const [lista, setLista] = useState([]);
  const [aviso, setAviso] = useState(null);
  const cargar = () => supabase.from('cs_crewing').select('id, nombre, updated_at, updated_by').order('updated_at', { ascending: false })
    .then(({ data }) => setLista(data ?? []));
  useEffect(() => { cargar(); }, []);

  async function guardar(comoNueva) {
    const nombre = (estado.nombre || '').trim() || prompt('Nombre de la tripulación (ej.: "Supply C - SESA")');
    if (!nombre) return;
    const datos = { ajustes: estado.ajustes, lineas: estado.lineas, managementFee: estado.managementFee };
    const r = estado.id && !comoNueva
      ? await supabase.from('cs_crewing').update({ nombre, datos }).eq('id', estado.id).select('id').single()
      : await supabase.from('cs_crewing').insert({ nombre, datos, created_by: ctx.email.toLowerCase() }).select('id').single();
    if (r.error) { setAviso({ error: true, texto: r.error.message }); return; }
    setEstado({ ...estado, id: r.data.id, nombre });
    setAviso({ texto: 'Guardada.' });
    cargar();
  }
  async function abrir(id) {
    if (!id) return;
    const { data, error } = await supabase.from('cs_crewing').select('*').eq('id', id).single();
    if (error) { setAviso({ error: true, texto: error.message }); return; }
    setEstado({ ...crewingVacio(), ...data.datos, id: data.id, nombre: data.nombre });
  }
  async function borrar() {
    if (!estado.id || !confirm(`¿Borrar "${estado.nombre}"?`)) return;
    const { error } = await supabase.from('cs_crewing').delete().eq('id', estado.id);
    if (error) { setAviso({ error: true, texto: error.message }); return; }
    setEstado(crewingVacio()); cargar();
  }
  const actual = lista.find((x) => x.id === estado.id);
  return (
    <div className="fila-botones">
      <label>Tripulaciones guardadas
        <select value={estado.id ?? ''} onChange={(e) => abrir(e.target.value)}>
          <option value="">— borrador —</option>
          {lista.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
        </select>
      </label>
      <label>Nombre<input value={estado.nombre ?? ''} onChange={(e) => setEstado({ ...estado, nombre: e.target.value })} /></label>
      <button onClick={() => guardar(false)}>{estado.id ? 'Guardar cambios' : 'Guardar'}</button>
      {estado.id && <button className="secundario" onClick={() => guardar(true)}>Guardar como nueva</button>}
      <button className="secundario" onClick={() => setEstado(crewingVacio())}>Nueva</button>
      {estado.id && <button className="terciario" onClick={borrar}>Borrar</button>}
      {actual && <span className="ayuda">Última modificación {fmtFechaHora(actual.updated_at)} · {actual.updated_by}</span>}
      {aviso && <span className={`aviso ${aviso.error ? 'error' : 'ok'}`}>{aviso.texto}</span>}
    </div>
  );
}

