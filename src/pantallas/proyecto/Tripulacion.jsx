import { useState } from 'react';
import { CATEGORIAS_LIQUIDACION, CATEGORIA } from '../../lib/categorias.js';
import { ADICIONALES, DIAS, EXTRAS, posicionNueva, adicionalesSugeridos } from '../../lib/proyecto.js';
import { fmt, fmt0, fmtMes, fmtPct } from '../../lib/formato.js';
import { Num, SiNo } from '../../componentes/Campos.jsx';

const GRUPOS = [['cubierta', 'Cubierta'], ['maquinas', 'Máquinas'], ['subalterno', 'Subalternos'], ['pilotaje', 'Pilotaje'], ['car', 'Escala CAR']];

function SelectorPuesto({ valor, onChange, autoFocus }) {
  return (
    <select value={valor} onChange={(e) => onChange(e.target.value)} autoFocus={autoFocus}>
      {GRUPOS.map(([g, n]) => (
        <optgroup key={g} label={n}>
          {CATEGORIAS_LIQUIDACION.filter((c) => c.grupo === g).map((c) => <option key={c.clave} value={c.clave}>{c.nombre}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

export default function Tripulacion({ p, set, calc }) {
  const [nuevo, setNuevo] = useState('capitan-ultramar');
  const porId = Object.fromEntries(calc.lineas.map((x) => [x.original.id, x]));
  const setLinea = (id, f) => set((q) => ({ lineas: q.lineas.map((l) => (l.id === id ? { ...l, ...f(l) } : l)) }));
  const agregar = (categoria) => set((q) => ({
    lineas: [...q.lineas, { ...posicionNueva(categoria), a: adicionalesSugeridos(q, categoria, (k) => CATEGORIA[k]?.grupo) }],
  }));
  const rutaAdicionales = `#${window.location.hash.slice(1).replace(/tripulacion$/, 'adicionales')}`;
  const quitar = (id) => set((q) => ({ lineas: q.lineas.filter((l) => l.id !== id) }));
  const duplicar = (l) => set((q) => {
    const i = q.lineas.findIndex((x) => x.id === l.id);
    const copia = { ...structuredClone(l), id: crypto.randomUUID() };
    return { lineas: [...q.lineas.slice(0, i + 1), copia, ...q.lineas.slice(i + 1)] };
  });
  const mover = (id, d) => set((q) => {
    const ls = [...q.lineas]; const i = ls.findIndex((x) => x.id === id); const j = i + d;
    if (j < 0 || j >= ls.length) return {};
    [ls[i], ls[j]] = [ls[j], ls[i]]; return { lineas: ls };
  });

  return (
    <>
      <div className="encabezado">
        <div><h1>Tripulación.</h1><div className="filete" /></div>
        <div className="agregar">
          <SelectorPuesto valor={nuevo} onChange={setNuevo} />
          <button onClick={() => agregar(nuevo)}>+ Agregar posición</button>
        </div>
      </div>
      <p className="aviso">Primero armá la tripulación: puestos y cantidades. Los días y costos por persona salen de la configuración del proyecto (en gris);
        se pueden cambiar en una posición. Los adicionales de cada posición se cargan en <a href={rutaAdicionales}>Adicionales</a>.</p>

      {!p.lineas.length && (
        <div className="vacio">
          <p>Todavía no hay posiciones. Elegí un puesto arriba o empezá por los más comunes:</p>
          <div className="fila-botones">
            {['capitan-ultramar', '1-of-cubierta', 'jefe-maquina', '1-of-maquina', 'contramaestre', 'marinero', 'cocinero'].map((k) => (
              <button key={k} className="secundario" onClick={() => agregar(k)}>+ {CATEGORIA[k].nombre}</button>
            ))}
          </div>
        </div>
      )}

      <div className="posiciones">
        {p.lineas.map((l, i) => {
          const x = porId[l.id];
          const esc = x?.escala;
          const n = Number(l.cantidad) || 0;
          return (
            <article key={l.id} className="posicion">
              <header>
                <span className="numero">{i + 1}</span>
                <SelectorPuesto valor={l.categoria} onChange={(v) => setLinea(l.id, () => ({ categoria: v }))} />
                <span className="cantidad">
                  <button className="secundario" onClick={() => setLinea(l.id, (q) => ({ cantidad: Math.max(0, (Number(q.cantidad) || 0) - 1) }))}>−</button>
                  <input className="num" type="number" min="0" value={l.cantidad} onChange={(e) => setLinea(l.id, () => ({ cantidad: Number(e.target.value) || 0 }))} />
                  <button className="secundario" onClick={() => setLinea(l.id, (q) => ({ cantidad: (Number(q.cantidad) || 0) + 1 }))}>+</button>
                  <span className="ayuda">{n === 1 ? 'persona' : 'personas'}</span>
                </span>
                <input className="nota" placeholder="Nota (ej.: relevo, guardia nocturna)" value={l.nota} onChange={(e) => setLinea(l.id, () => ({ nota: e.target.value }))} />
                <span className="acciones">
                  <button className="terciario" title="Subir" onClick={() => mover(l.id, -1)}>↑</button>
                  <button className="terciario" title="Bajar" onClick={() => mover(l.id, 1)}>↓</button>
                  <button className="terciario" onClick={() => duplicar(l)}>Duplicar</button>
                  <button className="terciario" onClick={() => quitar(l.id)}>Quitar</button>
                </span>
              </header>

              <div className="posicion-cuerpo">
                <div className="campos-posicion">
                  <div className="grupo-campos">
                    <span className="etiqueta">Adicionales</span>
                    <div className="fila-chips">
                      {ADICIONALES.filter((a) => l.a?.[a.k]).map((a) => <span key={a.k} className="chip">{a.corto} {fmtPct(l.a[a.k])}</span>)}
                      {!ADICIONALES.some((a) => l.a?.[a.k]) && <span className="chip alerta">sin adicionales</span>}
                      <a href={rutaAdicionales} className="ayuda">Editar</a>
                    </div>
                  </div>
                  <div className="grupo-campos">
                    <span className="etiqueta">Días por persona</span>
                    <div className="mini-rejilla">
                      {DIAS.map((d) => (
                        <label key={d.k} className={l.dias?.[d.k] !== undefined ? 'propio' : ''}>{d.label}
                          <Num valor={l.dias?.[d.k]} heredado={p.defaults?.dias?.[d.k] ?? 0} onChange={(v) => setLinea(l.id, (q) => ({ dias: { ...q.dias, [d.k]: v } }))} />
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grupo-campos">
                    <span className="etiqueta">Costos por persona</span>
                    <div className="fila-botones" style={{ marginTop: 4 }}>
                      {EXTRAS.map((e) => (
                        <SiNo key={e.k} etiqueta={e.label} valor={l.extras?.[e.k]} heredado={p.defaults?.extras?.[e.k]}
                          onChange={(v) => setLinea(l.id, (q) => ({ extras: { ...q.extras, [e.k]: v } }))} />
                      ))}
                    </div>
                  </div>
                  <details>
                    <summary>Antigüedad y vacaciones propias</summary>
                    <div className="mini-rejilla">
                      <label className={l.antiguedadAnios !== '' && l.antiguedadAnios !== undefined ? 'propio' : ''}>Antigüedad
                        <Num valor={l.antiguedadAnios === '' ? undefined : l.antiguedadAnios} heredado={calc.params.antiguedadAnios} unidad="años"
                          onChange={(v) => setLinea(l.id, () => ({ antiguedadAnios: v ?? '' }))} /></label>
                      <label className={l.vacacionesDias !== '' && l.vacacionesDias !== undefined ? 'propio' : ''}>Vacaciones
                        <Num valor={l.vacacionesDias === '' ? undefined : l.vacacionesDias} heredado={calc.params.vacacionesDias} unidad="días"
                          onChange={(v) => setLinea(l.id, () => ({ vacacionesDias: v ?? '' }))} /></label>
                    </div>
                  </details>
                </div>

                <div className="resultado-posicion">
                  {x ? (
                    <>
                      <div><span className="etiqueta">Básico</span><span className="mono">{esc?.monto ? fmt(x.basico) : <span className="chip critico">sin cargar</span>}</span>
                        {esc?.monto > 0 && <span className="ayuda">{esc.override ? 'override manual' : `${esc.acta ?? esc.origen} · ${fmtMes(esc.mes)}`}{esc.provisoria ? ' · provisorio' : ''}</span>}</div>
                      <div><span className="etiqueta">Costo mensual navegado (ARS)</span><span className="mono">{fmt(x.r.liq.navegado.mensual)}</span></div>
                      <div><span className="etiqueta">Por día navegado</span><span className="mono">ARS {fmt(x.r.unitarioDia.navegado)}</span>
                        <span className="mono">USD {calc.c.fx ? fmt(x.r.unitarioDia.navegado / calc.c.fx) : '—'}</span></div>
                      <div className="total-posicion"><span className="etiqueta">Total de la posición ({fmt0(n)} × días)</span>
                        <span className="mono grande">USD {calc.c.fx ? fmt(x.r.usd.total) : '—'}</span>
                        {calc.c.fx > 0 && x.r.usd.total - x.r.usd.sueldos > 0 && <span className="ayuda">sueldos {fmt(x.r.usd.sueldos)} + otros {fmt(x.r.usd.total - x.r.usd.sueldos)}</span>}</div>
                    </>
                  ) : <span className="aviso">Faltan datos para calcular.</span>}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {p.lineas.length > 0 && <div className="fila-botones"><a className="boton" href={rutaAdicionales}>Seguir con los adicionales →</a></div>}
      {p.lineas.length > 0 && (
        <section className="bloque">
          <h3>Resumen de la tripulación</h3>
          <div className="tarjetas">
            <div className="tarjeta"><div className="etiqueta">Personas</div><div className="grande">{fmt0(calc.resumen.personas)}</div></div>
            <div className="tarjeta"><div className="etiqueta">Costo por día navegado (USD)</div><div className="grande">{calc.c.fx ? fmt(calc.navegadoDiaUsd) : '—'}</div></div>
            <div className="tarjeta"><div className="etiqueta">Sueldos (USD)</div><div className="grande">{fmt(calc.resumen.usd.sueldos ?? 0)}</div></div>
            <div className="tarjeta"><div className="etiqueta">Traslados, hospedaje, lavandería y EPP (USD)</div>
              <div className="grande">{fmt(['trasladoDomestico', 'trasladoPuerto', 'hospedaje', 'lavanderia', 'epp'].reduce((s, k) => s + (calc.resumen.usd[k] ?? 0), 0))}</div></div>
            <div className="tarjeta elegida"><div className="etiqueta">Total del proyecto (USD)</div><div className="grande">{calc.c.fx ? fmt(calc.resumen.usd.total ?? 0) : '—'}</div></div>
            <div className="tarjeta"><div className="etiqueta">Víveres (USD por día)</div><div className="grande">{fmt(calc.resumen.viveresDia)}</div></div>
          </div>
        </section>
      )}
    </>
  );
}
