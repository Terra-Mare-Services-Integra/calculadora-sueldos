import { useState } from 'react';
import { CATEGORIA, DEPARTAMENTOS } from '../../lib/categorias.js';
import { ADICIONALES } from '../../lib/proyecto.js';
import { opcionesDe } from '../../lib/parametros.js';
import { fmt } from '../../lib/formato.js';
import { Pct } from '../../componentes/Campos.jsx';


export default function Adicionales({ p, set, calc }) {
  const g = calc.c.valores?.globales ?? {};
  const porId = Object.fromEntries(calc.lineas.map((x) => [x.original.id, x]));
  const [masivo, setMasivo] = useState({});
  const [grupoMasivo, setGrupoMasivo] = useState('');

  const setA = (id, k, v) => set((q) => ({ lineas: q.lineas.map((l) => (l.id === id ? { ...l, a: { ...l.a, [k]: v } } : l)) }));
  const aplicar = (k) => set((q) => ({
    lineas: q.lineas.map((l) => (!grupoMasivo || CATEGORIA[l.categoria]?.depto === grupoMasivo ? { ...l, a: { ...l.a, [k]: masivo[k] } } : l)),
  }));
  const copiarDe = (id, desdeId) => set((q) => {
    const origen = q.lineas.find((l) => l.id === desdeId);
    return { lineas: q.lineas.map((l) => (l.id === id ? { ...l, a: { ...origen.a } } : l)) };
  });
  const bloques = DEPARTAMENTOS.map((d) => ({ ...d, ls: p.lineas.filter((l) => CATEGORIA[l.categoria]?.depto === d.clave) })).filter((d) => d.ls.length);

  return (
    <>
      <h1>Adicionales.</h1>
      <div className="filete" />
      <p className="aviso">Cada posición lleva sus propios adicionales. Por ejemplo: capitán con RJ 84 % y franco pagado al 80 %; oficiales con 140 %
        si hay faltante; el resto con franco al 80 % pagado al 95 %. Elegí de la lista o escribí otro valor. Una posición nueva arranca con los adicionales
        de la última del mismo puesto o del mismo grupo.</p>

      {!p.lineas.length ? (
        <div className="vacio"><p>Primero armá la tripulación.</p>
          <a className="boton" href={`#${window.location.hash.slice(1).replace(/adicionales$/, 'tripulacion')}`}>Ir a Tripulación</a></div>
      ) : (
        <>
          <div className="tabla-marco"><table className="tabla tabla-adicionales">
            <thead>
              <tr>
                <th className="fijo">Posición</th>
                {ADICIONALES.map((a) => <th key={a.k}>{a.corto}</th>)}
                <th className="n">USD / día</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr className="masivo">
                <td className="fijo">
                  <span className="etiqueta">Cargar a varias</span>
                  <select value={grupoMasivo} onChange={(e) => setGrupoMasivo(e.target.value)}>
                    <option value="">Todas las posiciones</option>
                    {bloques.map((d) => <option key={d.clave} value={d.clave}>Solo {d.nombre}</option>)}
                  </select>
                </td>
                {ADICIONALES.map((a) => (
                  <td key={a.k}>
                    <Pct valor={masivo[a.k]} onChange={(v) => setMasivo({ ...masivo, [a.k]: v })} opciones={opcionesDe(g, a.k)} />
                    <button className="terciario aplicar" disabled={masivo[a.k] === undefined} onClick={() => aplicar(a.k)}>Aplicar</button>
                  </td>
                ))}
                <td /><td />
              </tr>
              {bloques.map((d) => [
                <tr key={d.clave} className="seccion"><td className="fijo">{d.nombre}</td><td colSpan={ADICIONALES.length + 2} /></tr>,
                ...d.ls.map((l, i) => {
                  const x = porId[l.id];
                  return (
                    <tr key={l.id}>
                      <td className="fijo">
                        <strong>{CATEGORIA[l.categoria]?.nombre}</strong>
                        <div className="ayuda">{l.cantidad} {Number(l.cantidad) === 1 ? 'persona' : 'personas'}{l.nota ? ` · ${l.nota}` : ''}</div>
                      </td>
                      {ADICIONALES.map((a) => (
                        <td key={a.k}><Pct valor={l.a?.[a.k]} onChange={(v) => setA(l.id, a.k, v)} opciones={opcionesDe(g, a.k)} /></td>
                      ))}
                      <td className="n">{x && calc.c.fx ? fmt(x.r.unitarioDia.navegado / calc.c.fx) : '—'}</td>
                      <td>{i > 0 && <button className="terciario" title="Copiar los adicionales de la fila de arriba" onClick={() => copiarDe(l.id, d.ls[i - 1].id)}>↑ Igual a la de arriba</button>}</td>
                    </tr>
                  );
                }),
              ])}
            </tbody>
          </table></div>
          {g.ayudaAdicionales && <details open><summary>Guía de adicionales</summary><p className="ayuda">{g.ayudaAdicionales}</p></details>}
        </>
      )}
    </>
  );
}
