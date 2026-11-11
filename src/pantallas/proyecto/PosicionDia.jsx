import { CATEGORIA, REGIMEN } from '../../lib/categorias.js';
import { posicionDia } from '../../lib/calculo.js';
import { TIPOS_TC } from '../TipoCambio.jsx';
import { fmt, fmt0, fmtMes } from '../../lib/formato.js';
import { Num } from '../../componentes/Campos.jsx';

export default function PosicionDia({ p, set, calc }) {
  const pos = posicionDia(calc.lineas, calc.c.fx, Number(p.managementFee) || 0);
  const jdm = calc.c.basicos['jefe-maquina'];
  const tc = TIPOS_TC.find((t) => t[0] === p.tc?.tipo)?.[1] ?? '—';

  return (
    <>
      <h1>Posición por día.</h1>
      <div className="filete" />
      <p className="aviso">Costo por día de navegación de cada puesto, en pesos y en dólares, más el management fee: el formato para presentar al cliente.</p>
      {!calc.c.fx && <p className="aviso error">Falta elegir el tipo de cambio en Configuración.</p>}
      <div className="tabla-marco"><table className="tabla">
        <thead><tr><th>Crew personnel</th><th className="n">Unitary cost (ARS per day)</th><th className="n">Quantity</th>
          <th className="n">Total crew (ARS per day)</th><th className="n">Total crew (USD per day)</th></tr></thead>
        <tbody>
          {pos.filas.map((f) => (
            <tr key={f.linea.id}>
              <td>{CATEGORIA[f.linea.categoria]?.ingles} <span className="ayuda">· {CATEGORIA[f.linea.categoria]?.nombre}{f.linea.nota ? ` · ${f.linea.nota}` : ''}</span></td>
              <td className="n">{fmt(f.unitarioArs)}</td><td className="n">{fmt0(f.cantidad)}</td>
              <td className="n">{fmt(f.totalArs)}</td><td className="n">{fmt(f.totalUsd)}</td>
            </tr>
          ))}
          {!pos.filas.length && <tr><td colSpan={5} className="aviso">La tripulación está vacía.</td></tr>}
          <tr className="subtotal"><td colSpan={2}>Total crew</td><td className="n">{fmt0(pos.filas.reduce((s, f) => s + f.cantidad, 0))}</td>
            <td className="n">{fmt(pos.filas.reduce((s, f) => s + f.totalArs, 0))}</td><td className="n">{fmt(pos.crewUsd)}</td></tr>
          <tr><td colSpan={4}>Management fee (USD per day)</td>
            <td className="n"><Num valor={p.managementFee || undefined} onChange={(v) => set({ managementFee: v ?? 0 })} ancho={110} /></td></tr>
          <tr className="total"><td colSpan={4}>Total cost per day (USD)</td><td className="n">{fmt(pos.totalDia)}</td></tr>
        </tbody>
      </table></div>

      <section className="bloque">
        <h3>Cost structure</h3>
        <div className="tabla-marco"><table className="tabla">
          <thead><tr><th>Concepto</th><th className="n">%</th><th className="n">Valor base</th><th>Unidad</th><th>Comentario</th></tr></thead>
          <tbody>
            <tr><td>Crew</td><td className="n">100</td><td className="n">{fmt(jdm?.monto)}</td><td>Índice</td>
              <td>SBJm0: básico Jefe de Máquina vigente en {fmtMes(calc.c.mes)}{jdm?.acta ? ` (${jdm.acta})` : ''}</td></tr>
            <tr><td>Management fee</td><td className="n">100</td><td className="n">{fmt(Number(p.managementFee) || 0)}</td><td>USD/día</td><td>Fijo en USD</td></tr>
            <tr><td>Exchange rate</td><td className="n" /><td className="n">{fmt(calc.c.fx)}</td><td>ARS / USD</td><td>TC0: {tc}{p.tc?.fecha ? ` del ${p.tc.fecha}` : ''}</td></tr>
          </tbody>
        </table></div>
        <p className="ayuda">Régimen {REGIMEN[p.regimen]?.nombre}.</p>
      </section>
    </>
  );
}
