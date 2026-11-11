import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { fmt, fmtFecha, leerNumero } from '../lib/formato.js';

export const TIPOS_TC = [
  ['divisa_venta', 'BNA divisa venta'],
  ['divisa_compra', 'BNA divisa compra'],
  ['billete_venta', 'BNA billete venta'],
  ['billete_compra', 'BNA billete compra'],
  ['manual', 'Manual'],
];

export default function TipoCambio({ ctx }) {
  const hoy = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const [fecha, setFecha] = useState(ctx.tc.fecha ?? hoy);
  const [res, setRes] = useState(ctx.tc.valores ? ctx.tc.valores : null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [manual, setManual] = useState(ctx.tc.manual ?? '');

  async function consultar(refrescar = false) {
    setCargando(true); setError(null);
    const { data, error: e } = await supabase.functions.invoke(`tipo-cambio?fecha=${fecha}${refrescar ? '&refrescar=1' : ''}`, { method: 'GET' });
    setCargando(false);
    if (e) {
      let msg = e.message;
      try { msg = (await e.context.json()).error ?? msg; } catch { /* sin cuerpo */ }
      setError(msg); return;
    }
    setRes(data);
    ctx.setTc({ ...ctx.tc, fecha, valores: data });
  }
  const usar = (tipo) => ctx.setTc({ ...ctx.tc, tipo, fecha, valores: res ?? ctx.tc.valores, manual });

  return (
    <>
      <h1>Tipo de cambio USD.</h1>
      <div className="filete" />
      <p className="aviso">
        Elegí la fecha y la cotización que se usa para pasar los costos a dólares. Fuente: Banco Nación (histórico de divisa y billete, compra y venta);
        el BCRA (divisa vendedor) se muestra como control. Si la fecha no es hábil se toma el último día hábil anterior.
        Comercialmente se puede elegir una cotización más alta (o un valor manual) para bajar el precio en dólares de una propuesta.
      </p>
      <div className="fila-botones">
        <label>Fecha<input type="date" max={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
        <button onClick={() => consultar(false)} disabled={cargando}>{cargando ? 'Consultando…' : 'Consultar'}</button>
        {res && <button className="secundario" onClick={() => consultar(true)} disabled={cargando}>Volver a consultar</button>}
      </div>
      {error && <p className="aviso error">{error}</p>}
      {res && (
        <>
          <p className="aviso">Cotización BNA del {fmtFecha(res.fecha_bna)}{res.cache ? ' (guardada)' : ''}.
            {res.avisos?.length ? ` Avisos: ${res.avisos.join(' · ')}` : ''}</p>
          <div className="tarjetas">
            {TIPOS_TC.filter(([k]) => k !== 'manual').map(([k, n]) => (
              <div key={k} className={`tarjeta ${ctx.tc.tipo === k ? 'elegida' : ''}`}>
                <div className="etiqueta">{n}</div>
                <div className="grande">{fmt(res[k])}</div>
                <button className={ctx.tc.tipo === k ? '' : 'secundario'} disabled={!res[k]} onClick={() => usar(k)}>{ctx.tc.tipo === k ? 'En uso' : 'Usar'}</button>
              </div>
            ))}
            <div className="tarjeta">
              <div className="etiqueta">BCRA divisa vendedor (control)</div>
              <div className="grande">{fmt(res.bcra_divisa_venta)}</div>
              <div className="ayuda">{fmtFecha(res.fecha_bcra)}</div>
            </div>
          </div>
        </>
      )}
      <section>
        <h3>Valor manual</h3>
        <div className="fila-botones">
          <label>ARS por USD<input className="num" value={manual} onChange={(e) => setManual(e.target.value)} /></label>
          <button className={ctx.tc.tipo === 'manual' ? '' : 'secundario'} disabled={leerNumero(manual) == null}
            onClick={() => ctx.setTc({ ...ctx.tc, tipo: 'manual', manual: leerNumero(manual) })}>{ctx.tc.tipo === 'manual' ? 'En uso' : 'Usar valor manual'}</button>
        </div>
      </section>
    </>
  );
}
