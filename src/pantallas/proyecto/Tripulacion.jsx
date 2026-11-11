import { useState } from 'react';
import { CATEGORIAS_LIQUIDACION, CATEGORIA, DEPARTAMENTOS } from '../../lib/categorias.js';
import { ADICIONALES, DIAS, EXTRAS, posicionNueva, adicionalesSugeridos } from '../../lib/proyecto.js';
import { fmt, fmt0, fmtMes } from '../../lib/formato.js';
import { Num, SiNo, SelectorAdicional } from '../../componentes/Campos.jsx';
import { opcionesDe, adicionalesPredefinidos } from '../../lib/parametros.js';

// Puestos que se ofrecen con un clic en cada bloque (el resto, en la lista).
const RAPIDOS = {
  cubierta: ['capitan-ultramar', '1-of-cubierta', '2-of-cubierta', '3-of-cubierta', 'contramaestre', '1-cabo', 'marinero'],
  maquinas: ['jefe-maquina', '1-of-maquina', '2-of-maquina', '3-of-maquina', 'electricista', 'mecanico', 'engrasador'],
  cocina: ['cocinero', '2-cocinero', 'ayudante-cocina', '1-mozo', '2-mozo', 'enfermero'],
};
const SUBGRUPOS = [['', 'Convenio general'], ['pilotaje', 'Pilotaje'], ['car', 'Escala CAR']];

function SelectorPuesto({ valor, onChange, depto }) {
  const cats = CATEGORIAS_LIQUIDACION.filter((c) => !depto || c.depto === depto);
  return (
    <select value={valor} onChange={(e) => onChange(e.target.value)}>
      {SUBGRUPOS.map(([g, n]) => {
        const xs = cats.filter((c) => (g ? c.grupo === g : c.grupo !== 'pilotaje' && c.grupo !== 'car'));
        return xs.length ? <optgroup key={g} label={n}>{xs.map((c) => <option key={c.clave} value={c.clave}>{c.nombre}</option>)}</optgroup> : null;
      })}
    </select>
  );
}

function Agregar({ depto, agregar }) {
  const [otro, setOtro] = useState('');
  const resto = CATEGORIAS_LIQUIDACION.filter((c) => c.depto === depto && !RAPIDOS[depto].includes(c.clave));
  return (
    <div className="agregar-bloque">
      {RAPIDOS[depto].map((k) => <button key={k} className="secundario chico" onClick={() => agregar(k)}>+ {CATEGORIA[k].nombre}</button>)}
      {resto.length > 0 && (
        <select value={otro} onChange={(e) => { if (e.target.value) agregar(e.target.value); setOtro(''); }}>
          <option value="">+ Otro puesto…</option>
          {resto.map((c) => <option key={c.clave} value={c.clave}>{c.nombre}</option>)}
        </select>
      )}
    </div>
  );
}

export default function Tripulacion({ p, set, calc }) {
  const porId = Object.fromEntries(calc.lineas.map((x) => [x.original.id, x]));
  const setLinea = (id, f) => set((q) => ({ lineas: q.lineas.map((l) => (l.id === id ? { ...l, ...f(l) } : l)) }));
  const g = calc.c.valores?.globales ?? {};
  // Una posición nueva copia los adicionales de la última del mismo puesto; si no hay, usa los predefinidos.
  const agregar = (categoria) => set((q) => {
    const previos = adicionalesSugeridos(q, categoria);
    const a = Object.keys(previos).length ? previos : adicionalesPredefinidos(g, categoria);
    return { lineas: [...q.lineas, { ...posicionNueva(categoria), a }] };
  });
  const quitar = (id) => set((q) => ({ lineas: q.lineas.filter((l) => l.id !== id) }));
  const duplicar = (l) => set((q) => {
    const i = q.lineas.findIndex((x) => x.id === l.id);
    const copia = { ...structuredClone(l), id: crypto.randomUUID() };
    return { lineas: [...q.lineas.slice(0, i + 1), copia, ...q.lineas.slice(i + 1)] };
  });
  // Sube o baja dentro del mismo bloque.
  const mover = (id, d) => set((q) => {
    const ls = [...q.lineas]; const i = ls.findIndex((x) => x.id === id);
    const dep = CATEGORIA[ls[i].categoria]?.depto;
    let j = i + d;
    while (j >= 0 && j < ls.length && CATEGORIA[ls[j].categoria]?.depto !== dep) j += d;
    if (j < 0 || j >= ls.length) return {};
    [ls[i], ls[j]] = [ls[j], ls[i]]; return { lineas: ls };
  });

  const resumenDias = (l) => {
    const dias = DIAS.map((d) => [d, l.dias?.[d.k] ?? p.defaults?.dias?.[d.k] ?? 0]).filter(([, v]) => v)
      .map(([d, v]) => `${v} días ${d.label.toLowerCase()}`);
    const ex = EXTRAS.filter((e) => (l.extras?.[e.k] ?? p.defaults?.extras?.[e.k])).map((e) => e.label.toLowerCase());
    const propio = Object.values(l.dias ?? {}).some((v) => v !== undefined) || Object.values(l.extras ?? {}).some((v) => v !== undefined);
    return `${[...dias, ...ex].join(' · ') || 'Sin días cargados'}${propio ? ' (propios de esta posición)' : ' (del proyecto)'}`;
  };

  const tarjeta = (l, i) => {
          const x = porId[l.id];
          const esc = x?.escala;
          const n = Number(l.cantidad) || 0;
          return (
            <article key={l.id} className="posicion">
              <header>
                <span className="numero">{i + 1}</span>
                <SelectorPuesto valor={l.categoria} depto={CATEGORIA[l.categoria]?.depto} onChange={(v) => setLinea(l.id, () => ({ categoria: v }))} />
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
                  <div className="adicionales-posicion">
                    {ADICIONALES.map((ad) => (
                      <label key={ad.k}>{ad.corto}
                        <SelectorAdicional valor={l.a?.[ad.k]} opciones={opcionesDe(g, ad.k)}
                          onChange={(v) => setLinea(l.id, (q) => ({ a: { ...q.a, [ad.k]: v } }))} />
                      </label>
                    ))}
                    <button className="terciario predef" title="Volver a los valores predefinidos"
                      onClick={() => setLinea(l.id, () => ({ a: adicionalesPredefinidos(g, l.categoria) }))}>Predefinidos</button>
                  </div>
                  <div className="grupo-campos">
                    <span className="etiqueta">Días y costos</span>
                    <span className="ayuda">{resumenDias(l)}</span>
                  </div>
                  <details>
                    <summary>Días, costos, antigüedad y vacaciones propios de esta posición</summary>
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
                    <span className="etiqueta">Antigüedad y vacaciones</span>
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
  };

  return (
    <>
      <div><h1>Tripulación.</h1><div className="filete" /></div>
      <p className="aviso">Armá la tripulación por bloque: puestos y cantidades. Los días y costos por persona salen de la configuración del proyecto (en gris);
        se pueden cambiar en una posición. Cada posición arranca con los adicionales predefinidos (o los de la anterior del mismo puesto):
        elegí otro de la lista o "Otro valor…" para escribirlo.</p>

      {DEPARTAMENTOS.map((d) => {
        const ls = p.lineas.filter((l) => CATEGORIA[l.categoria]?.depto === d.clave);
        const calcs = ls.map((l) => porId[l.id]).filter(Boolean);
        const personas = ls.reduce((s, l) => s + (Number(l.cantidad) || 0), 0);
        const diaUsd = calc.c.fx ? calcs.reduce((s, x) => s + x.r.unitarioDia.navegado * (Number(x.linea.cantidad) || 0), 0) / calc.c.fx : 0;
        const total = calcs.reduce((s, x) => s + x.r.usd.total, 0);
        return (
          <section key={d.clave} className={`depto depto-${d.clave}`}>
            <header className="depto-cabeza">
              <div><h2>{d.nombre}</h2><span className="ayuda">{d.detalle}</span></div>
              <div className="depto-cifras">
                <span><span className="etiqueta">Personas</span><span className="mono">{fmt0(personas)}</span></span>
                <span><span className="etiqueta">USD / día navegado</span><span className="mono">{calc.c.fx ? fmt(diaUsd) : '—'}</span></span>
                <span><span className="etiqueta">Total USD</span><span className="mono">{calc.c.fx ? fmt(total) : '—'}</span></span>
              </div>
            </header>
            <div className="posiciones">
              {ls.map((l, k) => tarjeta(l, k))}
              {!ls.length && <p className="aviso">Sin posiciones en {d.nombre.toLowerCase()}.</p>}
            </div>
            <Agregar depto={d.clave} agregar={agregar} />
          </section>
        );
      })}

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
