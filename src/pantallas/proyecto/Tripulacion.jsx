import { Fragment, useState } from 'react';
import { CATEGORIAS_LIQUIDACION, CATEGORIA, DEPARTAMENTOS } from '../../lib/categorias.js';
import { DIAS, EXTRAS, FRANCOS, posicionNueva, adicionalesIniciales, opcionInicial, alcanceDe, mesesConActa } from '../../lib/proyecto.js';
import { fmt, fmt0, fmtMes } from '../../lib/formato.js';
import { Num, SiNo, SelectorOpcion } from '../../componentes/Campos.jsx';
import { opcionesDe, adicionalesPredefinidos } from '../../lib/parametros.js';

// Puestos que se ofrecen con un clic en cada bloque (el resto, en "Otro…").
const RAPIDOS = {
  cubierta: ['capitan-ultramar', '1-of-cubierta', '2-of-cubierta', '3-of-cubierta', 'contramaestre', 'marinero'],
  maquinas: ['jefe-maquina', '1-of-maquina', '2-of-maquina', '3-of-maquina', 'electricista', 'mecanico', '1-cabo', 'engrasador'],
  cocina: ['cocinero', '2-cocinero', 'ayudante-cocina', '1-mozo', '2-mozo', 'enfermero'],
};
const CORTOS = {
  'capitan-ultramar': 'Capitán', '1-of-cubierta': '1er Oficial', '2-of-cubierta': '2do Oficial', '3-of-cubierta': '3er Oficial',
  contramaestre: 'Contramaestre', '1-cabo': '1er Cabo', marinero: 'Marinero', 'jefe-maquina': 'Jefe de Máquina', '1-of-maquina': '1er Of. Máq.',
  '2-of-maquina': '2do Of. Máq.', '3-of-maquina': '3er Of. Máq.', electricista: 'Electricista', mecanico: 'Mecánico', engrasador: 'Engrasador',
  cocinero: 'Cocinero', '2-cocinero': '2do Cocinero', 'ayudante-cocina': 'Ayudante', '1-mozo': '1er Mozo', '2-mozo': '2do Mozo', enfermero: 'Enfermero',
};
const SUBGRUPOS = [['', 'Convenio general'], ['pilotaje', 'Pilotaje'], ['car', 'Escala CAR']];
const nombreCorto = (n) => n.replace(/^Adicional /, '').replace('Responsabilidad jerárquica / plus operativo', 'RJ / plus op.');

function SelectorPuesto({ valor, onChange, depto }) {
  const cats = CATEGORIAS_LIQUIDACION.filter((c) => !depto || c.depto === depto);
  return (
    <select className="compacto puesto" value={valor} onChange={(e) => onChange(e.target.value)}>
      {SUBGRUPOS.map(([g, n]) => {
        const xs = cats.filter((c) => (g ? c.grupo === g : c.grupo !== 'pilotaje' && c.grupo !== 'car'));
        return xs.length ? <optgroup key={g} label={n}>{xs.map((c) => <option key={c.clave} value={c.clave}>{c.nombre}</option>)}</optgroup> : null;
      })}
    </select>
  );
}

export default function Tripulacion({ ctx, p, set, calc }) {
  const [abierta, setAbierta] = useState(null);
  const g = calc.c.valores?.globales ?? {};
  const catalogo = calc.catalogo;
  const grupoDe = (k) => CATEGORIA[k]?.grupo;
  const delProyecto = (p.adicionales ?? []).map((id) => catalogo.find((c) => c.id === id)).filter(Boolean);
  const comunes = delProyecto.filter((c) => alcanceDe(p, c) === 'proyecto');
  const porPosicion = delProyecto.filter((c) => alcanceDe(p, c) !== 'proyecto');
  const porId = Object.fromEntries(calc.lineas.map((x) => [x.original.id, x]));
  const fx = calc.c.fx;

  const setLinea = (id, f) => set((q) => ({ lineas: q.lineas.map((l) => (l.id === id ? { ...l, ...f(l) } : l)) }));
  const francosPredef = (categoria) => {
    const pre = adicionalesPredefinidos(g, categoria);
    return { regimenFranco: pre.regimenFranco, precioFranco: pre.precioFranco };
  };
  // Una posición nueva copia lo de la última del mismo puesto; si no hay, toma los preseleccionados.
  const agregar = (categoria) => set((q) => {
    const previa = [...q.lineas].reverse().find((l) => l.categoria === categoria);
    const ad = previa ? structuredClone(previa.ad ?? {}) : adicionalesIniciales(catalogo, q.adicionales ?? [], categoria, grupoDe);
    const a = previa ? { ...previa.a } : francosPredef(categoria);
    return { lineas: [...q.lineas, { ...posicionNueva(categoria), ad, a }] };
  });
  const quitar = (id) => set((q) => ({ lineas: q.lineas.filter((l) => l.id !== id) }));
  const duplicar = (l) => set((q) => {
    const i = q.lineas.findIndex((x) => x.id === l.id);
    return { lineas: [...q.lineas.slice(0, i + 1), { ...structuredClone(l), id: crypto.randomUUID() }, ...q.lineas.slice(i + 1)] };
  });
  const mover = (id, d) => set((q) => {
    const ls = [...q.lineas]; const i = ls.findIndex((x) => x.id === id);
    const dep = CATEGORIA[ls[i].categoria]?.depto;
    let j = i + d;
    while (j >= 0 && j < ls.length && CATEGORIA[ls[j].categoria]?.depto !== dep) j += d;
    if (j < 0 || j >= ls.length) return {};
    [ls[i], ls[j]] = [ls[j], ls[i]]; return { lineas: ls };
  });
  const opcionesFranco = (k) => opcionesDe(g, k).map((v) => ({ nombre: '', valor: v }));
  const selFranco = (l, k) => {
    const ops = opcionesDe(g, k); const v = Number(l.a?.[k]) || 0;
    const i = ops.findIndex((o) => Math.abs(o - v) < 1e-9);
    return { i: i >= 0 ? i : null, valor: v };
  };
  const columnas = 2 + porPosicion.length + FRANCOS.length + 4;

  return (
    <>
      <div className="encabezado-compacto">
        <h1>Tripulación.</h1>
        <span className="aviso">Una línea por puesto. Lo que es igual para todos se elige arriba; en cada línea, lo que cambia por puesto.</span>
      </div>

      <div className="barra-comunes">
        <span className="etiqueta">Para toda la tripulación</span>
        <label>Escala salarial
          <select className="adicional" value={p.mes ?? ''} onChange={(e) => set({ mes: e.target.value || null })}>
            <option value="">{`Última publicada${calc.escala.mes && !p.mes ? ` · ${fmtMes(calc.escala.mes)}` : ''}`}</option>
            {mesesConActa(ctx.datos).map((m) => <option key={m} value={m}>{fmtMes(m)}</option>)}
          </select>
        </label>
        <label>Decreto 633/2018
          <select className="adicional" value={p.ajustes?.decreto633 === undefined ? '' : p.ajustes.decreto633 ? 'si' : 'no'}
            onChange={(e) => set((q) => ({ ajustes: { ...q.ajustes, decreto633: e.target.value === '' ? undefined : e.target.value === 'si' } }))}>
            <option value="">{`${calc.c.valores?.[p.regimen]?.decreto633 ? 'Sí' : 'No'} (según el régimen)`}</option>
            <option value="si">Sí</option><option value="no">No</option>
          </select>
        </label>
        {comunes.length > 0 && <span className="separador-vertical" />}
          {comunes.map((c) => (
            <label key={c.id}>{nombreCorto(c.nombre)}
              <SelectorOpcion opciones={c.opciones} sel={p.adProyecto?.[c.id] ?? opcionInicial(c, '', grupoDe)}
                onChange={(sel) => set((q) => ({ adProyecto: { ...q.adProyecto, [c.id]: sel } }))} />
            </label>
          ))}
      </div>
      {calc.escala.mes && (
        <p className="ayuda" style={{ marginTop: 4 }}>
          Básicos de {fmtMes(calc.escala.mes)}{calc.escala.acta ? ` (${calc.escala.acta})` : ''}
          {!p.mes && calc.escala.mes < calc.c.mes ? `: todavía no hay acta para ${fmtMes(calc.c.mes)}, se usa la última publicada.` : '.'}
          {calc.escala.overrides ? ` ${calc.escala.overrides} con override manual.` : ''}
        </p>
      )}

      {DEPARTAMENTOS.map((d) => {
        const ls = p.lineas.filter((l) => CATEGORIA[l.categoria]?.depto === d.clave);
        const calcs = ls.map((l) => porId[l.id]).filter(Boolean);
        const personas = ls.reduce((s, l) => s + (Number(l.cantidad) || 0), 0);
        const diaUsd = fx ? calcs.reduce((s, x) => s + x.r.unitarioDia.navegado * (Number(x.linea.cantidad) || 0), 0) / fx : 0;
        const total = calcs.reduce((s, x) => s + x.r.usd.total, 0);
        return (
          <section key={d.clave} className={`depto depto-${d.clave}`}>
            <div className="depto-linea">
              <h2>{d.nombre}</h2>
              <span className="depto-cifras"><b>{fmt0(personas)}</b> pers. · USD/día <b>{fx ? fmt(diaUsd) : '—'}</b> · Total USD <b>{fx ? fmt(total) : '—'}</b></span>
              <span className="agregar-rapido">
                {RAPIDOS[d.clave].map((k) => <button key={k} className="mini secundario" onClick={() => agregar(k)}>+ {CORTOS[k] ?? CATEGORIA[k].nombre}</button>)}
                <select className="compacto" value="" onChange={(e) => e.target.value && agregar(e.target.value)}>
                  <option value="">+ Otro…</option>
                  {CATEGORIAS_LIQUIDACION.filter((c) => c.depto === d.clave && !RAPIDOS[d.clave].includes(c.clave))
                    .map((c) => <option key={c.clave} value={c.clave}>{c.nombre}</option>)}
                </select>
              </span>
            </div>
            {ls.length > 0 && (
              <div className="tabla-marco sin-borde"><table className="tabla tripulacion">
                <thead>
                  <tr>
                    <th>Puesto</th><th className="n">Cant.</th>
                    {porPosicion.map((c) => <th key={c.id} title={c.nombre}>{nombreCorto(c.nombre)}</th>)}
                    <th>Rég. franco</th><th>Precio franco</th>
                    <th className="n">Básico</th><th className="n">USD / día</th><th className="n">Total USD</th><th />
                  </tr>
                </thead>
                <tbody>
                  {ls.map((l) => {
                    const x = porId[l.id];
                    const esc = x?.escala;
                    const abiertaEsta = abierta === l.id;
                    return (
                      <Fragment key={l.id}>
                        <tr className={abiertaEsta ? 'abierta' : ''}>
                          <td><SelectorPuesto valor={l.categoria} depto={d.clave} onChange={(v) => setLinea(l.id, () => ({ categoria: v }))} />
                            {l.nota && <div className="ayuda">{l.nota}</div>}</td>
                          <td className="n"><input className="compacto cant" type="number" min="0" value={l.cantidad}
                            onChange={(e) => setLinea(l.id, () => ({ cantidad: Number(e.target.value) || 0 }))} /></td>
                          {porPosicion.map((c) => (
                            <td key={c.id}><SelectorOpcion opciones={c.opciones} sel={l.ad?.[c.id] ?? opcionInicial(c, l.categoria, grupoDe)}
                              onChange={(sel) => setLinea(l.id, (q) => ({ ad: { ...q.ad, [c.id]: sel } }))} /></td>
                          ))}
                          {FRANCOS.map((f) => (
                            <td key={f.k}><SelectorOpcion opciones={opcionesFranco(f.k)} sel={selFranco(l, f.k)}
                              onChange={(sel) => setLinea(l.id, (q) => ({ a: { ...q.a, [f.k]: sel.valor } }))} /></td>
                          ))}
                          <td className="n" title={esc?.acta ? `${esc.acta} · ${fmtMes(esc.mes)}${esc.provisoria ? ' · provisorio' : ''}` : ''}>
                            {esc?.monto ? fmt(x.basico) : <span className="chip critico">sin cargar</span>}</td>
                          <td className="n">{x && fx ? fmt(x.r.unitarioDia.navegado / fx) : '—'}</td>
                          <td className="n fuerte">{x && fx ? fmt(x.r.usd.total) : '—'}</td>
                          <td className="acciones-linea">
                            <button className="mini terciario" title="Más opciones de esta línea" onClick={() => setAbierta(abiertaEsta ? null : l.id)}>{abiertaEsta ? '▴' : '⋯'}</button>
                            <button className="mini terciario" title="Quitar" onClick={() => quitar(l.id)}>×</button>
                          </td>
                        </tr>
                        {abiertaEsta && (
                          <tr className="detalle-linea">
                            <td colSpan={columnas}>
                              <div className="detalle-grilla">
                                <label>Nota<input className="compacto" value={l.nota} placeholder="Ej.: relevo, guardia nocturna"
                                  onChange={(e) => setLinea(l.id, () => ({ nota: e.target.value }))} /></label>
                                {DIAS.map((dd) => (
                                  <label key={dd.k} className={l.dias?.[dd.k] !== undefined ? 'propio' : ''}>Días {dd.label.toLowerCase()}
                                    <Num valor={l.dias?.[dd.k]} heredado={p.defaults?.dias?.[dd.k] ?? 0} ancho={60}
                                      onChange={(v) => setLinea(l.id, (q) => ({ dias: { ...q.dias, [dd.k]: v } }))} /></label>
                                ))}
                                <label className={l.antiguedadAnios !== '' && l.antiguedadAnios !== undefined ? 'propio' : ''}>Antigüedad
                                  <Num valor={l.antiguedadAnios === '' ? undefined : l.antiguedadAnios} heredado={calc.params.antiguedadAnios} unidad="años" ancho={60}
                                    onChange={(v) => setLinea(l.id, () => ({ antiguedadAnios: v ?? '' }))} /></label>
                                <label className={l.vacacionesDias !== '' && l.vacacionesDias !== undefined ? 'propio' : ''}>Vacaciones
                                  <Num valor={l.vacacionesDias === '' ? undefined : l.vacacionesDias} heredado={calc.params.vacacionesDias} unidad="días" ancho={60}
                                    onChange={(v) => setLinea(l.id, () => ({ vacacionesDias: v ?? '' }))} /></label>
                              </div>
                              <div className="fila-botones" style={{ marginTop: 8 }}>
                                {EXTRAS.map((e) => (
                                  <SiNo key={e.k} etiqueta={e.label} valor={l.extras?.[e.k]} heredado={p.defaults?.extras?.[e.k]}
                                    onChange={(v) => setLinea(l.id, (q) => ({ extras: { ...q.extras, [e.k]: v } }))} />
                                ))}
                                <span className="separador" />
                                <button className="mini secundario" onClick={() => mover(l.id, -1)}>↑ Subir</button>
                                <button className="mini secundario" onClick={() => mover(l.id, 1)}>↓ Bajar</button>
                                <button className="mini secundario" onClick={() => duplicar(l)}>Duplicar</button>
                                <button className="mini secundario" onClick={() => setLinea(l.id, () => ({
                                  ad: adicionalesIniciales(catalogo, p.adicionales ?? [], l.categoria, grupoDe), a: francosPredef(l.categoria) }))}>Preseleccionados</button>
                              </div>
                              {x && <p className="ayuda">Básico {fmt(x.basico)} ({esc?.override ? 'override manual' : `${esc?.acta ?? esc?.origen ?? ''} · ${fmtMes(esc?.mes)}`}{esc?.provisoria ? ' · provisorio' : ''})
                                · costo mensual navegado ARS {fmt(x.r.liq.navegado.mensual)} · por día ARS {fmt(x.r.unitarioDia.navegado)}
                                {x.r.usd.total - x.r.usd.sueldos > 0 ? ` · sueldos USD ${fmt(x.r.usd.sueldos)} + otros ${fmt(x.r.usd.total - x.r.usd.sueldos)}` : ''}</p>}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table></div>
            )}
          </section>
        );
      })}

      {p.lineas.length > 0 && (
        <div className="totales-tripulacion">
          <span><span className="etiqueta">Personas</span><b>{fmt0(calc.resumen.personas)}</b></span>
          <span><span className="etiqueta">USD por día navegado</span><b>{fx ? fmt(calc.navegadoDiaUsd) : '—'}</b></span>
          <span><span className="etiqueta">Sueldos USD</span><b>{fmt(calc.resumen.usd.sueldos ?? 0)}</b></span>
          <span><span className="etiqueta">Traslados, hospedaje, lavandería y EPP USD</span>
            <b>{fmt(['trasladoDomestico', 'trasladoPuerto', 'hospedaje', 'lavanderia', 'epp'].reduce((s, k) => s + (calc.resumen.usd[k] ?? 0), 0))}</b></span>
          <span><span className="etiqueta">Víveres USD/día</span><b>{fmt(calc.resumen.viveresDia)}</b></span>
          <span className="total"><span className="etiqueta">Total del proyecto USD</span><b>{fx ? fmt(calc.resumen.usd.total ?? 0) : '—'}</b></span>
        </div>
      )}
    </>
  );
}
