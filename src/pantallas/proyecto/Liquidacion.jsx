import { useState } from 'react';
import { CATEGORIA, REGIMEN } from '../../lib/categorias.js';
import { FRANCOS, opcionInicial } from '../../lib/proyecto.js';
import { fmt, fmtPct } from '../../lib/formato.js';

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

export default function Liquidacion({ p, calc }) {
  const efectivos = p.regimen === 'efectivos';
  const secciones = efectivos
    ? [['navegado', 'Navegado', NAVEGADO], ['ordenes15', 'A las órdenes', ORD_EF]]
    : [['navegado', 'Navegado', NAVEGADO], ['integracion', 'Integración de contrato', CORTO], ['ordenes15', 'A las órdenes (1 a 15 días)', CORTO], ['ordenes90', 'A las órdenes (16 a 90 días)', CORTO]];
  const [abiertas, setAbiertas] = useState(() => Object.fromEntries(secciones.map(([k], i) => [k, i === 0])));
  const cols = calc.lineas;
  const pr = calc.params;

  return (
    <>
      <h1>Cálculo de liquidación.</h1>
      <div className="filete" />
      <p className="aviso">Liquidación {REGIMEN[p.regimen]?.nombre} de cada posición del proyecto, concepto por concepto, con sus adicionales.
        {efectivos && ' Efectivos no tiene integración de contrato; "a las órdenes" es una liquidación completa sobre el básico reducido.'}</p>
      <p className="ayuda">Contrato {pr.contrato ?? '—'} · Decreto 633 {pr.decreto633 ? 'sí' : 'no'} · ART {fmtPct(pr.art)} · antigüedad {pr.antiguedadAnios} años ·
        vacaciones {pr.vacacionesDias} días · TC {calc.c.fx ? fmt(calc.c.fx) : '—'}</p>
      {!cols.length && <p className="aviso">La tripulación está vacía.</p>}

      {cols.length > 0 && (
        <>
          <div className="fila-botones">
            {secciones.map(([k, n]) => (
              <button key={k} className={abiertas[k] ? '' : 'secundario'} onClick={() => setAbiertas({ ...abiertas, [k]: !abiertas[k] })}>{n}</button>
            ))}
          </div>
          <div className="tabla-marco" style={{ maxHeight: '78vh' }}><table className="tabla">
            <thead><tr><th className="fijo">Concepto</th>{cols.map((x) => (
              <th key={x.original.id} className="n" style={{ minWidth: 130 }}>{CATEGORIA[x.linea.categoria]?.nombre}
                <div className="ayuda">{x.linea.cantidad} pers.{x.linea.nota ? ` · ${x.linea.nota}` : ''}</div></th>
            ))}</tr></thead>
            <tbody>
              <tr className="seccion"><td className="fijo">Adicionales</td>{cols.map((x) => <td key={x.original.id} />)}</tr>
              {(p.adicionales ?? []).map((id) => calc.catalogo.find((c) => c.id === id)).filter(Boolean).map((c) => (
                <tr key={c.id}><td className="fijo">{c.nombre}</td>{cols.map((x) => {
                  const sel = x.original.ad?.[c.id] ?? opcionInicial(c, x.linea.categoria, (k) => CATEGORIA[k]?.grupo);
                  const op = sel.i != null ? c.opciones[sel.i] : null;
                  return <td key={x.original.id} className="n">{sel.valor ? fmtPct(sel.valor) : '—'}{op?.nombre ? <div className="ayuda">{op.nombre}</div> : sel.i == null && sel.valor ? <div className="ayuda">manual</div> : null}</td>;
                })}</tr>
              ))}
              {FRANCOS.map((f) => (
                <tr key={f.k}><td className="fijo">{f.label}</td>{cols.map((x) => <td key={x.original.id} className="n">{x.linea.a[f.k] ? fmtPct(x.linea.a[f.k]) : '—'}</td>)}</tr>
              ))}
              {secciones.filter(([k]) => abiertas[k]).map(([k, n, filas]) => (
                <Bloque key={k} titulo={n} filas={filas} clave={k} cols={cols} />
              ))}
            </tbody>
          </table></div>
        </>
      )}
    </>
  );
}

function Bloque({ titulo, filas, clave, cols }) {
  return (
    <>
      <tr className="seccion"><td className="fijo">{titulo}</td>{cols.map((x) => <td key={x.original.id} />)}</tr>
      {filas.map(([k, n, estilo]) => (
        <tr key={`${clave}-${k}`} className={estilo === 's' ? 'subtotal' : estilo === 't' ? 'total' : ''}>
          <td className="fijo">{n}</td>
          {cols.map((x) => <td key={x.original.id} className="n">{x.r.liq[clave][k] ? fmt(x.r.liq[clave][k]) : '—'}</td>)}
        </tr>
      ))}
    </>
  );
}
