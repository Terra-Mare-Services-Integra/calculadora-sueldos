import { REGIMENES } from '../../lib/categorias.js';
import { CAMPOS_REGIMEN, AJUSTABLES_CREWING } from '../../lib/parametros.js';
import { DIAS, EXTRAS } from '../../lib/proyecto.js';
import { hoyMes } from '../../lib/escalas.js';
import { fmt, fmtMes, fmtPct } from '../../lib/formato.js';
import { Pct, Num, SiNo } from '../../componentes/Campos.jsx';
import TipoCambio from '../TipoCambio.jsx';

export default function Configuracion({ ctx, p, set, calc }) {
  const base = calc.c.valores?.[p.regimen] ?? {};
  const g = calc.c.valores?.globales ?? {};
  const setAjuste = (k, v) => set((q) => ({ ajustes: { ...q.ajustes, [k]: v } }));
  const setDef = (grupo, k, v) => set((q) => ({ defaults: { ...q.defaults, [grupo]: { ...(q.defaults?.[grupo] ?? {}), [k]: v } } }));

  return (
    <>
      <h1>Configuración.</h1>
      <div className="filete" />

      <section className="bloque">
        <h3>Proyecto</h3>
        <div className="rejilla">
          <label>Nombre<input value={p.nombre} onChange={(e) => set({ nombre: e.target.value })} /></label>
          <label>Cliente / buque<input value={p.cliente ?? ''} onChange={(e) => set({ cliente: e.target.value })} /></label>
          <label>Forma de liquidar
            <select value={p.regimen} onChange={(e) => set({ regimen: e.target.value, ajustes: {} })}>
              {REGIMENES.map((r) => <option key={r.clave} value={r.clave}>{r.nombre} · {r.detalle}</option>)}
            </select>
          </label>
        </div>
        <label style={{ marginTop: 12 }}>Notas<textarea rows={2} value={p.notas ?? ''} onChange={(e) => set({ notas: e.target.value })} /></label>
      </section>

      <section className="bloque">
        <h3>Escala salarial</h3>
        <div className="fila-botones" style={{ marginTop: 0 }}>
          <label>Mes de la escala
            <select value={p.mes ? 'fijo' : 'actual'} onChange={(e) => set({ mes: e.target.value === 'actual' ? null : hoyMes() })}>
              <option value="actual">Actual: siempre la última vigente</option>
              <option value="fijo">Un mes en particular</option>
            </select>
          </label>
          {p.mes && <label>Mes<input type="month" value={p.mes} onChange={(e) => e.target.value && set({ mes: e.target.value })} /></label>}
          <span className="aviso">Se usa {fmtMes(calc.c.mes)}. Los parámetros de cálculo vigentes rigen desde {calc.c.parametros?.vigente_desde ?? '—'}.</span>
        </div>
      </section>

      <section className="bloque">
        <h3>Tipo de cambio</h3>
        <TipoCambio embebido ctx={{ tc: p.tc ?? {}, setTc: (tc) => set({ tc }) }} />
      </section>

      <section className="bloque">
        <h3>Condiciones del régimen</h3>
        <p className="aviso">Vacío = el valor de los parámetros vigentes (en gris). Lo que cambies vale solo para este proyecto.</p>
        <div className="rejilla">
          {CAMPOS_REGIMEN.filter((c) => AJUSTABLES_CREWING.includes(c.k)).map((c) => {
            const aj = p.ajustes?.[c.k];
            const b = base[c.k];
            return (
              <label key={c.k}>{c.label}
                {c.tipo === 'opcion' && <select value={aj ?? ''} onChange={(e) => setAjuste(c.k, e.target.value || undefined)}>
                  <option value="">{b ? `${c.nombres?.[b] ?? b} (parámetros)` : '—'}</option>
                  {c.opciones.map((o) => <option key={o} value={o}>{c.nombres?.[o] ?? o}</option>)}
                </select>}
                {c.tipo === 'si-no' && <select value={aj === undefined ? '' : aj ? 'Si' : 'No'} onChange={(e) => setAjuste(c.k, e.target.value === '' ? undefined : e.target.value === 'Si')}>
                  <option value="">{b === undefined ? '—' : `${b ? 'Sí' : 'No'} (parámetros)`}</option><option value="Si">Sí</option><option value="No">No</option>
                </select>}
                {c.tipo === 'pct' && <Pct valor={aj} heredado={b} onChange={(v) => setAjuste(c.k, v)} ancho={90} />}
                {c.tipo === 'num' && <Num valor={aj} heredado={b} unidad={c.unidad} onChange={(v) => setAjuste(c.k, v)} ancho={90} />}
              </label>
            );
          })}
        </div>
      </section>

      <section className="bloque">
        <h3>Días del proyecto</h3>
        <p className="aviso">Cuántos días de cada situación se cotizan por persona. Cada posición puede tener los suyos.</p>
        <div className="rejilla">
          {DIAS.map((d) => <label key={d.k}>{d.label}<Num valor={p.defaults?.dias?.[d.k]} onChange={(v) => setDef('dias', d.k, v)} unidad="días" ancho={90} /></label>)}
        </div>
      </section>

      <section className="bloque">
        <h3>Costos por persona</h3>
        <div className="fila-botones" style={{ marginTop: 0 }}>
          {EXTRAS.map((x) => <SiNo key={x.k} etiqueta={x.label} valor={p.defaults?.extras?.[x.k]} heredado={false} onChange={(v) => setDef('extras', x.k, v)} />)}
        </div>
        <p className="aviso">Montos vigentes (USD por persona): traslado a puerto {fmt(g.trasladoPuerto)} ×2 · traslado doméstico {fmt(g.trasladoDomestico)} ×2 ·
          hospedaje {fmt(g.hospedaje)} ×2 · lavandería {fmt(g.lavanderia)} · EPP {fmt(g.epp)} · víveres {fmt(g.viveresDia)} por día.</p>
        <label style={{ maxWidth: 260 }}>Management fee (USD por día)
          <Num valor={p.managementFee || undefined} onChange={(v) => set({ managementFee: v ?? 0 })} ancho={120} />
        </label>
      </section>

      <div className="fila-botones"><a className="boton" href={`#${window.location.hash.slice(1).replace(/configuracion$/, 'tripulacion')}`}>Seguir con la tripulación →</a></div>
      <p className="ayuda">ART vigente {fmtPct(base.art)} · antigüedad {base.antiguedadAnios ?? '—'} años · vacaciones {base.vacacionesDias ?? '—'} días.</p>
    </>
  );
}
