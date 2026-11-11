import { useMemo, useState } from 'react';
import { CATEGORIAS_LIQUIDACION, REGIMENES } from '../lib/categorias.js';
import { liquidar, ADICIONALES_VACIOS } from '../lib/calculo.js';
import { paramsCalculo } from '../lib/parametros.js';
import { useCrewing } from '../lib/crewingEstado.js';
import { fmt, fmtPct } from '../lib/formato.js';

const NAVEGADO = [
  ['basico', 'Básico (escala)'], ['rj', 'Resp. jerárquica / plus operativo'], ['supply', 'Adicional supply'], ['locacion', 'Adicional costa afuera'],
  ['feriados', 'Feriados'], ['acta', 'Adicional Acta 04-08-22'], ['antiguedad', 'Antigüedad'], ['subtotalA', 'Subtotal A: bruto', 's'],
  ['licencia', 'Licencia anual'], ['francos', 'Francos'], ['sac', 'SAC'], ['subtotalB', 'Subtotal B: antes de estabilidad', 's'],
  ['estabilidad', 'Estabilidad laboral / previsión despido'], ['final', 'Subtotal C: sueldo final', 's'],
  ['cargas', 'Cargas sociales + ART + seguro + fondo'], ['cuotaSindical', 'Cuota sindical'], ['decreto633', 'Decreto 633/2018'],
  ['costoBruto', 'Subtotal D: costo laboral', 's'], ['iibb', 'Ingresos Brutos'], ['creditoDebito', 'Impuesto créd. y déb.'],
  ['mensual', 'Costo mensual por persona (ARS)', 't'], ['diario', 'Costo diario (ARS)'], ['diarioUsd', 'Costo diario (USD)'],
];
const CORTO = [
  ['basico', 'Básico'], ['sac', 'SAC'], ['subtotalA', 'Subtotal A', 's'], ['cargas', 'Cargas sociales + ART + seguro + fondo'],
  ['cuotaSindical', 'Cuota sindical'], ['decreto633', 'Decreto 633/2018'], ['costoBruto', 'Subtotal B', 's'],
  ['iibb', 'Ingresos Brutos'], ['creditoDebito', 'Impuesto créd. y déb.'], ['mensual', 'Costo mensual por persona (ARS)', 't'],
  ['diario', 'Costo diario (ARS)'], ['diarioUsd', 'Costo diario (USD)'],
];
const ORD_EF = [
  ['basico', 'Básico × factor'], ['rj', 'Resp. jerárquica / plus operativo'], ['supply', 'Adicional supply'], ['locacion', 'Adicional costa afuera'],
  ['antiguedad', 'Antigüedad'], ['subtotalA', 'Subtotal A: bruto', 's'], ['licencia', 'Licencia anual'], ['sac', 'SAC'],
  ['subtotalB', 'Subtotal B', 's'], ['estabilidad', 'Estabilidad laboral'], ['final', 'Subtotal C: sueldo final', 's'],
  ['cargas', 'Cargas sociales + ART + seguro + fondo'], ['cuotaSindical', 'Cuota sindical'], ['decreto633', 'Decreto 633/2018'],
  ['costoBruto', 'Subtotal D', 's'], ['iibb', 'Ingresos Brutos'], ['creditoDebito', 'Impuesto créd. y déb.'],
  ['mensual', 'Costo mensual por persona (ARS)', 't'], ['diario', 'Costo diario (ARS)'], ['diarioUsd', 'Costo diario (USD)'],
];
const ADIC = [['rj', 'RJ / plus operativo'], ['supply', 'Supply type'], ['locacion', 'Locación'], ['acta', 'Adicional Acta 04-08-22'], ['regimenFranco', 'Régimen de franco'], ['precioFranco', 'Precio del franco']];

export default function Liquidacion({ ctx }) {
  const [regimen, setRegimen] = useState('terramare');
  const [fuente, setFuente] = useState('crewing'); // 'crewing' | 'ninguno'
  const [soloCrewing, setSoloCrewing] = useState(false);
  const [crewing] = useCrewing();
  const p = paramsCalculo(ctx.valores, regimen, crewing.ajustes?.[regimen]);

  const columnas = useMemo(() => {
    const lineas = crewing.lineas.filter((l) => l.regimen === regimen);
    const cats = soloCrewing ? CATEGORIAS_LIQUIDACION.filter((c) => lineas.some((l) => l.categoria === c.clave)) : CATEGORIAS_LIQUIDACION;
    return cats.map((c) => {
      const linea = lineas.find((l) => l.categoria === c.clave);
      const a = fuente === 'crewing' && linea ? { ...ADICIONALES_VACIOS, ...linea.a } : ADICIONALES_VACIOS;
      const basico = ctx.basicos[c.clave]?.monto ?? 0;
      return { c, a, basico, liq: liquidar({ regimen, categoria: c.clave, basico, p, a, fx: ctx.fx }) };
    });
  }, [crewing, regimen, fuente, soloCrewing, ctx, p]);

  const bloque = (titulo, filas, clave) => (
    <>
      <tr className="seccion"><td className="fijo">{titulo}</td>{columnas.map((x) => <td key={x.c.clave} />)}</tr>
      {filas.map(([k, n, estilo]) => (
        <tr key={`${clave}-${k}`} className={estilo === 's' ? 'subtotal' : estilo === 't' ? 'total' : ''}>
          <td className="fijo">{n}</td>
          {columnas.map((x) => <td key={x.c.clave} className="n">{x.liq[clave][k] ? fmt(x.liq[clave][k]) : '—'}</td>)}
        </tr>
      ))}
    </>
  );

  return (
    <>
      <h1>Liquidación de sueldos.</h1>
      <div className="filete" />
      <p className="aviso">Costo mensual por categoría en las tres formas de liquidar: <strong>Terra Mare</strong> (personal para un tercero), <strong>Eventuales</strong>
        (internos no efectivos) y <strong>Efectivos</strong>. Navegado, integración de contrato y a las órdenes. Efectivos no tiene integración y "a las órdenes"
        es una liquidación completa sobre el básico reducido.</p>
      <div className="fila-botones">
        {REGIMENES.map((r) => <button key={r.clave} className={regimen === r.clave ? '' : 'secundario'} onClick={() => setRegimen(r.clave)}>{r.nombre}</button>)}
        <label>Adicionales<select value={fuente} onChange={(e) => setFuente(e.target.value)}>
          <option value="crewing">Los de la tripulación de Crewing</option><option value="ninguno">Sin adicionales</option>
        </select></label>
        <label style={{ flexDirection: 'row', alignItems: 'center' }}><input type="checkbox" checked={soloCrewing} onChange={(e) => setSoloCrewing(e.target.checked)} /> Solo los puestos de Crewing</label>
      </div>
      {!ctx.fx && <p className="aviso error">Sin tipo de cambio: los valores en USD quedan vacíos.</p>}
      <p className="aviso">Contrato {p.contrato ?? '—'} · Decreto 633 {p.decreto633 ? 'sí' : 'no'} · ART {fmtPct(p.art)} · antigüedad {p.antiguedadAnios} años · vacaciones {p.vacacionesDias} días.</p>
      <div className="tabla-marco" style={{ maxHeight: '75vh' }}><table className="tabla">
        <thead><tr><th className="fijo">Concepto</th>{columnas.map((x) => <th key={x.c.clave} className="n" style={{ minWidth: 120 }}>{x.c.nombre}</th>)}</tr></thead>
        <tbody>
          <tr className="seccion"><td className="fijo">Adicionales</td>{columnas.map((x) => <td key={x.c.clave} />)}</tr>
          {ADIC.map(([k, n]) => <tr key={k}><td className="fijo">{n}</td>{columnas.map((x) => <td key={x.c.clave} className="n">{x.a[k] ? fmtPct(x.a[k]) : '—'}</td>)}</tr>)}
          {bloque('Navegado', NAVEGADO, 'navegado')}
          {regimen !== 'efectivos' && bloque('Integración de contrato', CORTO, 'integracion')}
          {regimen !== 'efectivos' && bloque('A las órdenes (1 a 15 días)', CORTO, 'ordenes15')}
          {regimen !== 'efectivos' && bloque('A las órdenes (16 a 90 días)', CORTO, 'ordenes90')}
          {regimen === 'efectivos' && bloque('A las órdenes', ORD_EF, 'ordenes15')}
        </tbody>
      </table></div>
    </>
  );
}
