import { useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { CATEGORIAS, CATEGORIA } from '../lib/categorias.js';
import { mesDe, meses as rangoMeses } from '../lib/escalas.js';
import { fmt, fmtFecha, fmtMes, leerNumero } from '../lib/formato.js';

const nombre = (k) => CATEGORIA[k]?.nombre ?? k;

export default function Basicos({ ctx }) {
  const [editando, setEditando] = useState(null); // null | 'nueva' | acta
  return (
    <>
      <h1>Básicos y divisas.</h1>
      <div className="filete" />
      <p className="aviso">
        Las escalas se cargan por acta (FENA/FESIMAF suelen ser trimestrales y salir con atraso): cada monto tiene el mes desde el que rige.
        Para cada mes se usa la última escala vigente de cada categoría; si el acta del mes todavía no salió, el valor queda marcado como provisorio.
      </p>
      <EscalaVigente ctx={ctx} />
      {editando
        ? <ActaEditor ctx={ctx} acta={editando === 'nueva' ? null : editando} cerrar={() => setEditando(null)} />
        : <Actas ctx={ctx} editar={setEditando} />}
      <Overrides ctx={ctx} />
      <Divisas ctx={ctx} />
      <Reglas ctx={ctx} />
    </>
  );
}

function EscalaVigente({ ctx }) {
  return (
    <section>
      <h2>Escala vigente en {fmtMes(ctx.mes)}</h2>
      <div className="tabla-marco"><table className="tabla">
        <thead><tr><th className="fijo">Categoría</th><th className="n">Básico mensual</th><th>Origen</th><th>Acta</th><th>Mes del valor</th></tr></thead>
        <tbody>
          {CATEGORIAS.map((c) => {
            const b = ctx.basicos[c.clave] ?? { monto: 0, origen: 'sin cargar', provisoria: true };
            return (
              <tr key={c.clave}>
                <td className="fijo">{c.nombre}</td>
                <td className="n">{b.monto ? fmt(b.monto) : '—'}</td>
                <td>
                  {b.override ? <span className="chip critico" title={b.override.motivo}>override manual (acta: {fmt(b.montoActa)})</span>
                    : b.origen === 'sin cargar' ? <span className="chip alerta">sin cargar</span>
                    : <span className="chip">{b.origen === 'acta' ? 'acta' : b.origen}</span>}
                  {' '}{b.provisoria && b.monto > 0 && !b.override && <span className="chip alerta">provisorio</span>}
                </td>
                <td>{b.acta ?? '—'}</td>
                <td>{fmtMes(b.mes)}</td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
    </section>
  );
}

function Actas({ ctx, editar }) {
  const { actas, basicos } = ctx.datos;
  const [aviso, setAviso] = useState(null);
  async function borrar(a) {
    if (!confirm(`¿Borrar el acta "${a.nombre}" y todos sus valores? Queda registrado en el log.`)) return;
    const { error } = await supabase.rpc('cs_borrar_acta', { p_id: a.id });
    if (error) setAviso(error.message); else ctx.recargar('actas', 'basicos', 'log');
  }
  return (
    <section>
      <h2>Actas cargadas</h2>
      {ctx.editor && <div className="fila-botones"><button onClick={() => editar('nueva')}>Cargar acta nueva</button></div>}
      <div className="tabla-marco"><table className="tabla">
        <thead><tr><th>Acta</th><th>Firmada</th><th>Meses que fija</th><th className="n">Valores</th><th>Notas</th><th /></tr></thead>
        <tbody>
          {actas.map((a) => {
            const propios = basicos.filter((b) => b.acta_id === a.id);
            const ms = [...new Set(propios.map((b) => mesDe(b.mes)))].sort();
            const retro = a.firmada_el && ms.length && ms.some((m) => m < mesDe(a.firmada_el));
            return (
              <tr key={a.id}>
                <td>{a.nombre}</td>
                <td className="n">{fmtFecha(a.firmada_el)}</td>
                <td>{ms.map(fmtMes).join(', ')} {retro && <span className="chip alerta" title="Fija meses anteriores a su firma">retroactiva</span>}</td>
                <td className="n">{propios.length}</td>
                <td className="aviso">{a.notas}</td>
                <td>{ctx.editor && <span className="fila-botones" style={{ marginTop: 0 }}>
                  <button className="secundario" onClick={() => editar(a)}>Editar</button>
                  <button className="terciario" onClick={() => borrar(a)}>Borrar</button>
                </span>}</td>
              </tr>
            );
          })}
          {!actas.length && <tr><td colSpan={6} className="aviso">Todavía no hay actas cargadas.</td></tr>}
        </tbody>
      </table></div>
      {aviso && <p className="aviso error">{aviso}</p>}
    </section>
  );
}

function ActaEditor({ ctx, acta, cerrar }) {
  const cargables = CATEGORIAS.filter((c) => (ctx.datos.categorias.find((x) => x.clave === c.clave)?.forma ?? 'monto') === 'monto');
  const inicial = useMemo(() => {
    const propios = acta ? ctx.datos.basicos.filter((b) => b.acta_id === acta.id) : [];
    const ms = [...new Set(propios.map((b) => mesDe(b.mes)))].sort();
    const val = {};
    for (const b of propios) val[`${b.categoria}|${mesDe(b.mes)}`] = fmt(Number(b.monto));
    return { ms, val };
  }, [acta, ctx.datos.basicos]);
  const [cab, setCab] = useState({ nombre: acta?.nombre ?? '', firmada_el: acta?.firmada_el ?? '', notas: acta?.notas ?? '' });
  const [ms, setMs] = useState(inicial.ms.length ? inicial.ms : [ctx.mes]);
  const [val, setVal] = useState(inicial.val);
  const [nuevoMes, setNuevoMes] = useState('');
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const agregarMes = (m) => m && !ms.includes(m) && setMs([...ms, m].sort());
  const agregarTrimestre = () => {
    const ultimo = ms.at(-1) ?? ctx.mes;
    const [y, m] = ultimo.split('-').map(Number);
    const fin = new Date(Date.UTC(y, m - 1 + 3, 1)).toISOString().slice(0, 7);
    setMs([...new Set([...ms, ...rangoMeses(ultimo, fin).slice(1)])].sort());
  };
  // Pegar una columna desde Excel/PDF: un valor por renglón, en el orden de la tabla.
  function pegarColumna(m, texto) {
    const nums = texto.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const v = { ...val };
    cargables.forEach((c, i) => { if (nums[i] !== undefined) v[`${c.clave}|${m}`] = nums[i]; });
    setVal(v);
  }

  async function guardar() {
    setAviso(null);
    const errores = [];
    const filas = [];
    for (const c of cargables) for (const m of ms) {
      const t = val[`${c.clave}|${m}`];
      if (t === undefined || String(t).trim() === '') continue;
      const n = leerNumero(t);
      if (n == null || n < 0) errores.push(`${c.nombre} ${fmtMes(m)}`);
      else filas.push({ categoria: c.clave, mes: `${m}-01`, monto: Math.round(n * 100) / 100 });
    }
    if (!cab.nombre.trim()) errores.unshift('falta el nombre del acta');
    if (errores.length) { setAviso(`Revisá: ${errores.join(', ')}`); return; }
    setGuardando(true);
    const { error } = await supabase.rpc('cs_guardar_acta', { p_acta: { id: acta?.id ?? '', ...cab }, p_basicos: filas });
    setGuardando(false);
    if (error) { setAviso(error.message); return; }
    await ctx.recargar('actas', 'basicos', 'log');
    cerrar();
  }

  return (
    <section>
      <h2>{acta ? `Editar acta: ${acta.nombre}` : 'Cargar acta nueva'}</h2>
      <p className="aviso">Un monto por categoría y por mes (Anexo del acta). Podés pegar una columna entera copiada del PDF o del Excel en el cuadro de cada mes.
        Las categorías por coeficiente (Enfermero, Aux. de Máquina, CAR…) no se cargan acá: se calculan solas.</p>
      <div className="fila-botones">
        <label style={{ flex: '1 1 280px' }}>Nombre<input value={cab.nombre} placeholder="Acta FENA/FESIMAF jul-sep 2026" onChange={(e) => setCab({ ...cab, nombre: e.target.value })} /></label>
        <label>Firmada el<input type="date" value={cab.firmada_el ?? ''} onChange={(e) => setCab({ ...cab, firmada_el: e.target.value })} /></label>
        <label style={{ flex: '1 1 280px' }}>Notas<input value={cab.notas} placeholder="Retroactivos pagados el…" onChange={(e) => setCab({ ...cab, notas: e.target.value })} /></label>
      </div>
      <div className="fila-botones">
        <label>Agregar mes<input type="month" value={nuevoMes} onChange={(e) => setNuevoMes(e.target.value)} /></label>
        <button className="secundario" onClick={() => { agregarMes(nuevoMes); setNuevoMes(''); }}>Agregar</button>
        <button className="secundario" onClick={agregarTrimestre}>+3 meses</button>
      </div>
      <div className="tabla-marco"><table className="tabla">
        <thead>
          <tr><th className="fijo">Categoría</th>{ms.map((m) => (
            <th key={m} className="n">{fmtMes(m)} <button className="terciario" title="Quitar mes" onClick={() => setMs(ms.filter((x) => x !== m))}>×</button></th>
          ))}</tr>
          <tr><th className="fijo ayuda">Pegar columna</th>{ms.map((m) => (
            <th key={m}><textarea rows={1} placeholder="pegar…" style={{ width: 120 }} onChange={(e) => { pegarColumna(m, e.target.value); e.target.value = ''; }} /></th>
          ))}</tr>
        </thead>
        <tbody>
          {cargables.map((c) => (
            <tr key={c.clave}>
              <td className="fijo">{c.nombre}</td>
              {ms.map((m) => {
                const k = `${c.clave}|${m}`;
                const ok = val[k] === undefined || val[k] === '' || leerNumero(val[k]) != null;
                return <td key={m}><input className="monto" style={ok ? null : { outline: '2px solid var(--tm-critical)' }} value={val[k] ?? ''}
                  onChange={(e) => setVal({ ...val, [k]: e.target.value })} /></td>;
              })}
            </tr>
          ))}
        </tbody>
      </table></div>
      <div className="fila-botones">
        <button onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar acta'}</button>
        <button className="secundario" onClick={cerrar}>Cancelar</button>
        {aviso && <span className="aviso error">{aviso}</span>}
      </div>
    </section>
  );
}

function Overrides({ ctx }) {
  const [f, setF] = useState({ categoria: 'jefe-maquina', monto: '', desde: ctx.mes, hasta: '', motivo: '' });
  const [aviso, setAviso] = useState(null);
  async function agregar(e) {
    e.preventDefault();
    const monto = leerNumero(f.monto);
    if (monto == null) { setAviso('Monto inválido'); return; }
    const { error } = await supabase.from('cs_overrides').insert({
      categoria: f.categoria, monto, desde: `${f.desde}-01`, hasta: f.hasta ? `${f.hasta}-01` : null, motivo: f.motivo.trim(),
    });
    if (error) { setAviso(error.message); return; }
    setF({ ...f, monto: '', motivo: '' }); setAviso(null);
    ctx.recargar('overrides', 'log');
  }
  async function anular(o) {
    if (!confirm(`¿Anular el override de ${nombre(o.categoria)}?`)) return;
    const { error } = await supabase.from('cs_overrides').update({ activo: false }).eq('id', o.id);
    if (error) setAviso(error.message); else ctx.recargar('overrides', 'log');
  }
  return (
    <section>
      <h2>Overrides manuales</h2>
      <p className="aviso">Para usar un básico distinto al del acta (por ejemplo, un acuerdo particular o un aumento anticipado). Rige desde el mes indicado
        (y hasta el mes "hasta", si se carga), pisa la escala y queda registrado en el log con su motivo.</p>
      <div className="tabla-marco"><table className="tabla">
        <thead><tr><th>Categoría</th><th className="n">Monto</th><th>Desde</th><th>Hasta</th><th>Motivo</th><th>Cargado por</th><th>Estado</th><th /></tr></thead>
        <tbody>
          {ctx.datos.overrides.map((o) => (
            <tr key={o.id}>
              <td>{nombre(o.categoria)}</td><td className="n">{fmt(Number(o.monto))}</td>
              <td>{fmtMes(mesDe(o.desde))}</td><td>{o.hasta ? fmtMes(mesDe(o.hasta)) : '—'}</td>
              <td>{o.motivo}</td><td>{o.created_by}</td>
              <td>{o.activo ? <span className="chip critico">activo</span> : <span className="chip" title={`${o.anulado_por} ${o.anulado_el}`}>anulado</span>}</td>
              <td>{ctx.editor && o.activo && <button className="terciario" onClick={() => anular(o)}>Anular</button>}</td>
            </tr>
          ))}
          {!ctx.datos.overrides.length && <tr><td colSpan={8} className="aviso">Sin overrides.</td></tr>}
        </tbody>
      </table></div>
      {ctx.editor && (
        <form onSubmit={agregar} className="fila-botones">
          <label>Categoría<select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
            {CATEGORIAS.map((c) => <option key={c.clave} value={c.clave}>{c.nombre}</option>)}
          </select></label>
          <label>Monto mensual<input className="monto" required value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} /></label>
          <label>Desde<input type="month" required value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} /></label>
          <label>Hasta (opcional)<input type="month" value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} /></label>
          <label style={{ flex: '1 1 260px' }}>Motivo<input required value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} /></label>
          <button>Agregar override</button>
        </form>
      )}
      {aviso && <p className="aviso error">{aviso}</p>}
    </section>
  );
}

function Divisas({ ctx }) {
  const actual = ctx.divisas ?? {};
  const [val, setVal] = useState(null);
  const [desde, setDesde] = useState(`${ctx.mes}-01`);
  const [nota, setNota] = useState('');
  const [aviso, setAviso] = useState(null);
  const editando = val !== null;
  const empezar = () => setVal(Object.fromEntries(CATEGORIAS.map((c) => [c.clave, {
    limitrofe: actual[c.clave]?.limitrofe ?? '', no_limitrofe: actual[c.clave]?.no_limitrofe ?? '' }])));
  async function guardar() {
    const valores = {};
    for (const [k, v] of Object.entries(val)) {
      const l = leerNumero(v.limitrofe), n = leerNumero(v.no_limitrofe);
      if (l != null || n != null) valores[k] = { limitrofe: l ?? 0, no_limitrofe: n ?? 0 };
    }
    const { error } = await supabase.from('cs_divisas').insert({ vigente_desde: desde, valores, nota });
    if (error) { setAviso(error.message); return; }
    setVal(null); setNota(''); setAviso(null);
    ctx.recargar('divisas', 'log');
  }
  return (
    <section>
      <h2>Divisas (USD por día)</h2>
      <p className="aviso">Monto en dólares por día que cobra cada cargo navegando a puertos limítrofes o no limítrofes.
        {ctx.divisasFila ? ` Vigente desde ${fmtFecha(ctx.divisasFila.vigente_desde)}.` : ' Sin cargar.'}</p>
      <div className="tabla-marco"><table className="tabla">
        <thead><tr><th className="fijo">Cargo</th><th className="n">Limítrofe</th><th className="n">No limítrofe</th></tr></thead>
        <tbody>
          {CATEGORIAS.filter((c) => !c.extra).map((c) => (
            <tr key={c.clave}>
              <td className="fijo">{c.nombre}</td>
              {['limitrofe', 'no_limitrofe'].map((t) => (
                <td key={t} className="n">{editando
                  ? <input className="num" value={val[c.clave][t]} onChange={(e) => setVal({ ...val, [c.clave]: { ...val[c.clave], [t]: e.target.value } })} />
                  : actual[c.clave]?.[t] != null ? fmt(actual[c.clave][t]) : '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table></div>
      {ctx.editor && (editando ? (
        <div className="fila-botones">
          <label>Rige desde<input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
          <label style={{ flex: '1 1 260px' }}>Nota<input value={nota} onChange={(e) => setNota(e.target.value)} /></label>
          <button onClick={guardar}>Guardar nueva versión</button>
          <button className="secundario" onClick={() => setVal(null)}>Cancelar</button>
        </div>
      ) : <div className="fila-botones"><button className="secundario" onClick={empezar}>Actualizar divisas</button></div>)}
      {aviso && <p className="aviso error">{aviso}</p>}
    </section>
  );
}

function Reglas({ ctx }) {
  const config = Object.fromEntries(ctx.datos.categorias.map((c) => [c.clave, c]));
  const [aviso, setAviso] = useState(null);
  async function cambiar(clave, cambio) {
    const fila = { clave, forma: 'monto', base: null, coef: null, ...(config[clave] ?? {}), ...cambio };
    delete fila.updated_at; delete fila.updated_by;
    if (fila.forma === 'monto') { fila.base = null; fila.coef = null; }
    else if (!fila.base || fila.coef == null) { fila.base = fila.base ?? 'jefe-maquina'; fila.coef = fila.coef ?? 1; }
    const { error } = await supabase.from('cs_categorias').upsert(fila);
    if (error) setAviso(error.message); else { setAviso(null); ctx.recargar('categorias', 'log'); }
  }
  return (
    <section>
      <details>
        <summary>Reglas por categoría (de dónde sale el básico)</summary>
        <p className="aviso">"Acta": el monto se carga en cada acta. "Coeficiente": básico = coeficiente × básico vigente de otra categoría
          (se usa para las que el acta no trae). Cada cambio queda en el log.</p>
        <div className="tabla-marco"><table className="tabla">
          <thead><tr><th className="fijo">Categoría</th><th>Origen</th><th>Base</th><th className="n">Coeficiente</th></tr></thead>
          <tbody>
            {CATEGORIAS.map((c) => {
              const r = config[c.clave] ?? { forma: 'monto' };
              return (
                <tr key={c.clave}>
                  <td className="fijo">{c.nombre}</td>
                  <td>{ctx.editor
                    ? <select value={r.forma} onChange={(e) => cambiar(c.clave, { forma: e.target.value })}><option value="monto">Acta</option><option value="coef">Coeficiente</option></select>
                    : r.forma === 'coef' ? 'Coeficiente' : 'Acta'}</td>
                  <td>{r.forma === 'coef' && (ctx.editor
                    ? <select value={r.base} onChange={(e) => cambiar(c.clave, { base: e.target.value })}>
                        {CATEGORIAS.filter((x) => x.clave !== c.clave).map((x) => <option key={x.clave} value={x.clave}>{x.nombre}</option>)}
                      </select>
                    : nombre(r.base))}</td>
                  <td className="n">{r.forma === 'coef' && (ctx.editor
                    ? <input className="num" defaultValue={r.coef} onBlur={(e) => { const n = leerNumero(e.target.value); if (n != null && n !== Number(r.coef)) cambiar(c.clave, { coef: n }); }} />
                    : r.coef)}</td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
        {aviso && <p className="aviso error">{aviso}</p>}
      </details>
    </section>
  );
}
