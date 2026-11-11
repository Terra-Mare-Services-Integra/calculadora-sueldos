import { useMemo } from 'react';
import { CATEGORIA, REGIMEN } from '../lib/categorias.js';
import { posicionDia } from '../lib/calculo.js';
import { useCrewing, calcularCrewing } from '../lib/crewingEstado.js';
import { fmt, fmt0, fmtMes } from '../lib/formato.js';
import { leerNumero } from '../lib/formato.js';

export default function PosicionDia({ ctx }) {
  const [estado, setEstado] = useCrewing();
  const { lineas } = useMemo(() => calcularCrewing(ctx, estado), [ctx, estado]);
  const pos = posicionDia(lineas, ctx.fx, Number(estado.managementFee) || 0);
  const jdm = ctx.basicos['jefe-maquina'];

  return (
    <>
      <h1>Posición diaria.</h1>
      <div className="filete" />
      <p className="aviso">Costo por día de navegación de cada puesto de la tripulación de Crewing{estado.nombre ? ` ("${estado.nombre}")` : ''},
        en pesos y en dólares, más el management fee. Es el formato de la hoja "Posición Día_Ext" para presentar al cliente.</p>
      {!ctx.fx && <p className="aviso error">Falta elegir el tipo de cambio.</p>}
      <div className="tabla-marco"><table className="tabla">
        <thead><tr><th>Crew personnel</th><th>Régimen</th><th className="n">Unitary cost (ARS per day)</th><th className="n">Quantity</th>
          <th className="n">Total crew (ARS per day)</th><th className="n">Total crew (USD per day)</th></tr></thead>
        <tbody>
          {pos.filas.map((f) => (
            <tr key={f.linea.id}>
              <td>{CATEGORIA[f.linea.categoria]?.ingles} <span className="ayuda">· {CATEGORIA[f.linea.categoria]?.nombre}{f.linea.nota ? ` · ${f.linea.nota}` : ''}</span></td>
              <td>{REGIMEN[f.linea.regimen]?.nombre}</td>
              <td className="n">{fmt(f.unitarioArs)}</td><td className="n">{fmt0(f.cantidad)}</td>
              <td className="n">{fmt(f.totalArs)}</td><td className="n">{fmt(f.totalUsd)}</td>
            </tr>
          ))}
          {!pos.filas.length && <tr><td colSpan={6} className="aviso">La tripulación de Crewing está vacía.</td></tr>}
          <tr className="subtotal"><td colSpan={3}>Total crew</td><td className="n">{fmt0(pos.filas.reduce((s, f) => s + f.cantidad, 0))}</td>
            <td className="n">{fmt(pos.filas.reduce((s, f) => s + f.totalArs, 0))}</td><td className="n">{fmt(pos.crewUsd)}</td></tr>
          <tr><td colSpan={5}>Management fee (USD per day)</td>
            <td className="n"><input className="num" style={{ width: 100 }} value={estado.managementFee ?? ''}
              onChange={(e) => setEstado({ ...estado, managementFee: leerNumero(e.target.value) ?? '' })} /></td></tr>
          <tr className="total"><td colSpan={5}>Total cost per day (USD)</td><td className="n">{fmt(pos.totalDia)}</td></tr>
        </tbody>
      </table></div>

      <section>
        <h2>Cost structure</h2>
        <div className="tabla-marco"><table className="tabla">
          <thead><tr><th>Concepto</th><th className="n">%</th><th className="n">Valor base</th><th>Unidad</th><th>Comentario</th></tr></thead>
          <tbody>
            <tr><td>Crew</td><td className="n">100</td><td className="n">{fmt(jdm?.monto)}</td><td>Índice</td>
              <td>SBJm0: básico Jefe de Máquina vigente en {fmtMes(ctx.mes)}{jdm?.acta ? ` (${jdm.acta})` : ''}</td></tr>
            <tr><td>Management fee</td><td className="n">100</td><td className="n">{fmt(Number(estado.managementFee) || 0)}</td><td>USD/día</td><td>Fijo en USD</td></tr>
            <tr><td>Exchange rate</td><td className="n" /><td className="n">{fmt(ctx.fx)}</td><td>ARS / USD</td><td>TC0: {ctx.tc.tipo}{ctx.tc.fecha ? ` del ${ctx.tc.fecha}` : ''}</td></tr>
          </tbody>
        </table></div>
      </section>
    </>
  );
}
