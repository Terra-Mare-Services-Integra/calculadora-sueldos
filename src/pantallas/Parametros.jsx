import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { REGIMENES } from '../lib/categorias.js';
import { CAMPOS_REGIMEN, CAMPOS_GLOBALES } from '../lib/parametros.js';
import { fmt, fmtFecha, leerNumero } from '../lib/formato.js';

// Valor guardado → texto del formulario (porcentajes en %).
const aTexto = (c, v) => {
  if (v == null) return '';
  if (c.tipo === 'pct') return fmt(v * 100).replace(/,00$/, '');
  if (c.tipo === 'tramos') return (v ?? []).map((t) => `${t.hasta ?? '+'}:${String(t.pct * 100).replace('.', ',')}`).join('; ');
  if (c.tipo === 'si-no') return v ? 'Si' : 'No';
  if (c.tipo === 'lista') return (v ?? []).map((x) => fmt(x * 100).replace(/,00$/, '')).join('; ');
  return String(v);
};
const deTexto = (c, t) => {
  if (c.tipo === 'opcion' || c.tipo === 'texto') return t;
  if (c.tipo === 'si-no') return t === 'Si';
  if (c.tipo === 'lista') {
    const xs = String(t ?? '').split(';').map((s) => s.trim()).filter(Boolean).map(leerNumero);
    return xs.some((x) => x == null) ? undefined : xs.map((x) => x / 100);
  }
  if (c.tipo === 'tramos') {
    return String(t).split(';').map((s) => s.trim()).filter(Boolean).map((s) => {
      const [h, p] = s.split(':');
      return h.trim() === '+' || h.trim() === '' ? { pct: leerNumero(p) / 100 } : { hasta: leerNumero(h), pct: leerNumero(p) / 100 };
    });
  }
  const n = leerNumero(t);
  if (n == null) return undefined;
  return c.tipo === 'pct' ? n / 100 : n;
};
const mostrar = (c, v) => {
  if (v == null) return <span className="chip alerta">falta</span>;
  if (c.tipo === 'pct') return `${fmt(v * 100)} %`;
  if (c.tipo === 'si-no') return v ? 'Sí' : 'No';
  if (c.tipo === 'tramos') return v.map((t) => `${t.hasta != null ? `≤ ${t.hasta} años` : 'más'}: ${fmt(t.pct * 100)} %`).join(' · ');
  if (c.tipo === 'opcion') return c.nombres?.[v] ?? v;
  if (c.tipo === 'texto') return <span className="ayuda">{v}</span>;
  if (c.tipo === 'lista') return v.map((x) => `${fmt(x * 100).replace(/,00$/, '')} %`).join(' · ');
  return fmt(v);
};

export default function Parametros({ ctx }) {
  const v = ctx.valores;
  const [form, setForm] = useState(null);
  const [desde, setDesde] = useState(new Date().toISOString().slice(0, 10));
  const [nota, setNota] = useState('');
  const [aviso, setAviso] = useState(null);

  const empezar = () => {
    const f = {};
    for (const r of REGIMENES) for (const c of CAMPOS_REGIMEN) f[`${r.clave}.${c.k}`] = aTexto(c, v?.[r.clave]?.[c.k]);
    for (const c of CAMPOS_GLOBALES) f[`globales.${c.k}`] = aTexto(c, v?.globales?.[c.k]);
    setForm(f);
  };
  async function guardar() {
    const valores = { globales: {} };
    const errores = [];
    for (const r of REGIMENES) {
      valores[r.clave] = {};
      for (const c of CAMPOS_REGIMEN) {
        const x = deTexto(c, form[`${r.clave}.${c.k}`]);
        if (x === undefined || (Array.isArray(x) && x.some((t) => !Number.isFinite(t.pct)))) errores.push(`${r.nombre}: ${c.label}`);
        else valores[r.clave][c.k] = x;
      }
    }
    for (const c of CAMPOS_GLOBALES) {
      const x = deTexto(c, form[`globales.${c.k}`]);
      if (x === undefined) errores.push(c.label); else valores.globales[c.k] = x;
    }
    if (errores.length) { setAviso(`Revisá: ${errores.join(', ')}`); return; }
    const { error } = await supabase.from('cs_parametros').insert({ vigente_desde: desde, valores, nota });
    if (error) { setAviso(error.message); return; }
    setForm(null); setNota(''); setAviso(null);
    ctx.recargar('parametros', 'log');
  }

  const campo = (clave, c) => {
    const val = form[clave] ?? '';
    const set = (x) => setForm({ ...form, [clave]: x });
    if (c.tipo === 'opcion') return <select value={val} onChange={(e) => set(e.target.value)}><option value="" />{c.opciones.map((o) => <option key={o} value={o}>{c.nombres?.[o] ?? o}</option>)}</select>;
    if (c.tipo === 'si-no') return <select value={val} onChange={(e) => set(e.target.value)}><option>Si</option><option>No</option></select>;
    if (c.tipo === 'texto') return <textarea rows={4} style={{ width: '100%' }} value={val} onChange={(e) => set(e.target.value)} />;
    return <input className={c.tipo === 'tramos' || c.tipo === 'lista' ? '' : 'num'} style={c.tipo === 'tramos' || c.tipo === 'lista' ? { width: 260 } : null} value={val} onChange={(e) => set(e.target.value)} />;
  };

  return (
    <>
      <h1>Parámetros de cálculo.</h1>
      <div className="filete" />
      <p className="aviso">
        Tasas y montos que usa cada forma de liquidar. Se versionan por fecha: guardar crea una versión nueva que rige desde la fecha indicada,
        y el log registra qué cambió. {ctx.parametros ? `Vigente para ${ctx.mes}: desde ${fmtFecha(ctx.parametros.vigente_desde)}${ctx.parametros.nota ? ` (${ctx.parametros.nota})` : ''}.` : 'Todavía no hay parámetros cargados.'}
        {form && ' Porcentajes en %; antigüedad como "años:%" separados por ";" (el último con "+").'}
      </p>
      <div className="tabla-marco"><table className="tabla">
        <thead><tr><th className="fijo">Parámetro</th>{REGIMENES.map((r) => <th key={r.clave} className="n">{r.nombre}</th>)}<th>Unidad</th></tr></thead>
        <tbody>
          {CAMPOS_REGIMEN.map((c) => (
            <tr key={c.k}>
              <td className="fijo">{c.label}{c.ayuda && <div className="ayuda">{c.ayuda}</div>}</td>
              {REGIMENES.map((r) => <td key={r.clave} className="n">{form ? campo(`${r.clave}.${c.k}`, c) : mostrar(c, v?.[r.clave]?.[c.k])}</td>)}
              <td className="ayuda">{c.tipo === 'pct' ? '%' : c.unidad ?? ''}</td>
            </tr>
          ))}
          <tr className="seccion"><td colSpan={5}>Costos adicionales de Crewing (todos los regímenes)</td></tr>
          {CAMPOS_GLOBALES.map((c) => (
            <tr key={c.k}>
              <td className="fijo">{c.label}</td>
              <td colSpan={3} className={c.tipo === 'texto' ? '' : 'n'}>{form ? campo(`globales.${c.k}`, c) : mostrar(c, v?.globales?.[c.k])}</td>
              <td className="ayuda">{c.unidad ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {ctx.editor && (form ? (
        <div className="fila-botones">
          <label>Rige desde<input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
          <label style={{ flex: '1 1 300px' }}>Nota (qué cambió y por qué)<input value={nota} onChange={(e) => setNota(e.target.value)} /></label>
          <button onClick={guardar}>Guardar nueva versión</button>
          <button className="secundario" onClick={() => { setForm(null); setAviso(null); }}>Cancelar</button>
        </div>
      ) : <div className="fila-botones"><button className="secundario" onClick={empezar}>Modificar parámetros</button></div>)}
      {aviso && <p className="aviso error">{aviso}</p>}
      <section>
        <h3>Versiones</h3>
        <ul className="aviso">{ctx.datos.parametros.map((p) => <li key={p.id}>Desde {fmtFecha(p.vigente_desde)} · cargada por {p.created_by}{p.nota ? ` · ${p.nota}` : ''}</li>)}</ul>
      </section>
    </>
  );
}
