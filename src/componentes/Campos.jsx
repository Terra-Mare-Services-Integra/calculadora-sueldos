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
