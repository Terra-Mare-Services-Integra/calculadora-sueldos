import { useEffect, useId, useState } from 'react';
import { leerNumero } from '../lib/formato.js';

const aPct = (v) => (v === undefined || v === null || v === '' ? '' : String(Math.round(Number(v) * 1e6) / 1e4).replace('.', ','));

/**
 * Porcentaje: se muestra 84 y se guarda 0,84. Vacío = hereda (se muestra el heredado como placeholder).
 * opciones: lista de fracciones sugeridas (datalist).
 */
export function Pct({ valor, onChange, heredado, opciones = [], ancho = 64, titulo }) {
  const id = useId();
  const [t, setT] = useState(aPct(valor));
  useEffect(() => {
    const n = leerNumero(t);
    const actual = n == null ? undefined : n / 100;
    if ((actual ?? '') !== (valor ?? '')) setT(aPct(valor));
  }, [valor]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span className="pct" title={titulo}>
      <input className="num" style={{ width: ancho }} list={opciones.length ? id : undefined} value={t}
        placeholder={heredado !== undefined ? aPct(heredado) || '0' : '0'}
        onChange={(e) => { setT(e.target.value); const n = leerNumero(e.target.value); onChange(e.target.value.trim() === '' ? undefined : n == null ? undefined : n / 100); }} />
      <span className="unidad">%</span>
      {opciones.length > 0 && <datalist id={id}>{opciones.map((o) => <option key={o} value={aPct(o)} />)}</datalist>}
    </span>
  );
}

/** Número entero o decimal. Vacío = hereda (placeholder). */
export function Num({ valor, onChange, heredado, ancho = 64, unidad, min = 0 }) {
  return (
    <span className="pct">
      <input className="num" type="number" min={min} step="any" style={{ width: ancho }} value={valor ?? ''}
        placeholder={heredado !== undefined && heredado !== null ? String(heredado) : ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
      {unidad && <span className="unidad">{unidad}</span>}
    </span>
  );
}

/** Interruptor Sí / No con estado heredado. valor undefined = hereda. */
export function SiNo({ valor, onChange, heredado, etiqueta }) {
  const efectivo = valor === undefined ? !!heredado : !!valor;
  return (
    <button type="button" className={`interruptor ${efectivo ? 'on' : ''} ${valor === undefined ? 'heredado' : ''}`}
      title={valor === undefined ? 'Igual que el proyecto (clic para cambiar solo en esta posición)' : 'Propio de esta posición'}
      onClick={() => onChange(!efectivo)}>{etiqueta}</button>
  );
}

/**
 * Adicional: lista desplegable con los valores predefinidos y "Otro…" para escribirlo a mano.
 * Un valor que no está en la lista se muestra como manual.
 */
export function SelectorAdicional({ valor, opciones = [], onChange }) {
  const v = Number(valor) || 0;
  const enLista = opciones.some((o) => Math.abs(o - v) < 1e-9);
  const [manual, setManual] = useState(!enLista);
  useEffect(() => { if (!enLista) setManual(true); }, [enLista]);
  if (manual || !opciones.length) {
    return (
      <span className="adicional manual">
        <Pct valor={v || undefined} onChange={(x) => onChange(x ?? 0)} ancho={58} />
        {opciones.length > 0 && <button type="button" className="terciario volver-lista" title="Elegir de la lista"
          onClick={() => { setManual(false); if (!enLista) onChange(opciones.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a), opciones[0])); }}>▾</button>}
      </span>
    );
  }
  return (
    <select className="adicional" value={String(opciones.find((o) => Math.abs(o - v) < 1e-9) ?? 0)}
      onChange={(e) => (e.target.value === 'otro' ? setManual(true) : onChange(Number(e.target.value)))}>
      {opciones.map((o) => <option key={o} value={String(o)}>{String(Math.round(o * 1e6) / 1e4).replace('.', ',')} %</option>)}
      <option value="otro">Otro valor…</option>
    </select>
  );
}

const pctTxt = (v) => `${String(Math.round(Number(v) * 1e6) / 1e4).replace('.', ',')} %`;

/**
 * Opción de un adicional del catálogo: lista con nombre y % ("Supply C · 50 %") y "Otro valor…" manual.
 * sel = { i: índice de la opción | null (manual), valor }.
 */
export function SelectorOpcion({ opciones = [], sel, onChange }) {
  const manual = sel?.i === null || sel?.i === undefined && sel?.valor;
  const [escribiendo, setEscribiendo] = useState(false);
  if (manual || escribiendo || !opciones.length) {
    return (
      <span className="adicional manual">
        <Pct valor={sel?.valor || undefined} onChange={(x) => onChange({ i: null, valor: x ?? 0 })} ancho={58} />
        {opciones.length > 0 && <button type="button" className="terciario volver-lista" title="Elegir de la lista"
          onClick={() => { setEscribiendo(false); onChange({ i: 0, valor: Number(opciones[0].valor) || 0 }); }}>▾</button>}
      </span>
    );
  }
  return (
    <select className="adicional" value={String(sel?.i ?? 0)}
      onChange={(e) => (e.target.value === 'otro' ? (setEscribiendo(true), onChange({ i: null, valor: sel?.valor ?? 0 }))
        : onChange({ i: Number(e.target.value), valor: Number(opciones[Number(e.target.value)].valor) || 0 }))}>
      {opciones.map((o, i) => <option key={i} value={String(i)}>{o.nombre ? `${pctTxt(o.valor)} · ${o.nombre}` : pctTxt(o.valor)}</option>)}
      <option value="otro">Otro valor…</option>
    </select>
  );
}
