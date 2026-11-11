import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CATEGORIA } from '../../lib/categorias.js';
import { calcularProyecto, posicionNueva, adicionalesIniciales, alcanceDe } from '../../lib/proyecto.js';
import { adicionalesPredefinidos } from '../../lib/parametros.js';
import { PUESTOS_OFERTA, ofertaPorDefecto, fechaEn, mesEn, enLetras } from '../../lib/oferta.js';
import { fmt0 } from '../../lib/formato.js';

const nombrePuesto = (clave) => {
  const x = PUESTOS_OFERTA[clave];
  return x ? `${x.es}-${x.en}` : CATEGORIA[clave]?.nombre ?? clave;
};

export default function Oferta({ ctx, p, set, calc }) {
  const o = { ...ofertaPorDefecto(p, ctx.email), ...(p.oferta ?? {}) };
  const setO = (k, v) => set((q) => ({ oferta: { ...ofertaPorDefecto(q, ctx.email), ...(q.oferta ?? {}), [k]: v } }));
  const [viendo, setViendo] = useState(false);
  const [desbordan, setDesbordan] = useState([]);
  // Avisa si el contenido de alguna hoja no entra en el A4.
  useEffect(() => {
    if (!viendo) return undefined;
    const t = setTimeout(() => {
      const hojas = [...document.querySelectorAll('.oferta-documento .hoja')];
      const malas = [];
      hojas.forEach((h, i) => { const c = h.querySelector('.hoja-cuerpo'); const mal = c.scrollHeight > c.clientHeight + 1; h.classList.toggle('desborda', mal); if (mal) malas.push(i + 1); });
      setDesbordan(malas);
    }, 400);
    return () => clearTimeout(t);
  });

  // Enfermero opcional: se calcula con las mismas condiciones del proyecto.
  const enfermero = useMemo(() => {
    if (!o.enfermeroOpcional) return null;
    const g = calc.c.valores?.globales ?? {};
    const pre = adicionalesPredefinidos(g, 'enfermero');
    const linea = { ...posicionNueva('enfermero'), ad: adicionalesIniciales(calc.catalogo, p.adicionales ?? [], 'enfermero', (k) => CATEGORIA[k]?.grupo),
      a: { regimenFranco: pre.regimenFranco, precioFranco: pre.precioFranco } };
    const r = calcularProyecto(ctx.datos, { ...p, lineas: [linea] }).lineas[0];
    return r ? { ars: r.r.unitarioDia.navegado, usd: calc.c.fx ? r.r.unitarioDia.navegado / calc.c.fx : 0 } : null;
  }, [o.enfermeroOpcional, calc, ctx.datos, p]);

  // Tipo de supply elegido para toda la tripulación (para el comentario del management fee).
  const supply = (() => {
    const c = calc.catalogo.find((x) => (p.adicionales ?? []).includes(x.id) && x.casillero === 'supply' && alcanceDe(p, x) === 'proyecto' && /supply/i.test(x.nombre));
    const sel = c && p.adProyecto?.[c.id];
    return sel?.i != null ? c.opciones[sel.i]?.nombre : null;
  })();

  const campo = (k, label, props = {}) => (
    <label key={k}>{label}<input value={o[k] ?? ''} onChange={(e) => setO(k, e.target.value)} {...props} /></label>
  );
  const texto = (k, label, filas = 3) => (
    <label key={k}>{label}<textarea rows={filas} value={o[k] ?? ''} onChange={(e) => setO(k, e.target.value)} /></label>
  );

  return (
    <>
      <div className="encabezado-compacto">
        <h1>Oferta.</h1>
        <span className="aviso">Budgetary Offer · Crewing Services con los números del proyecto. Completá los datos y abrí la vista para imprimir o guardar en PDF.</span>
      </div>
      {!calc.c.fx && <p className="aviso error">Falta el tipo de cambio (Configuración).</p>}
      {!p.lineas.length && <p className="aviso error">La tripulación está vacía.</p>}

      <div className="fila-botones"><button onClick={() => setViendo(true)} disabled={!p.lineas.length}>Ver oferta / imprimir PDF</button></div>

      <section className="bloque">
        <h3>Destinatario</h3>
        <div className="rejilla">
          {campo('cliente', 'Cliente (TO)')}
          {campo('attn', 'Atención (ATTN.)', { placeholder: 'Contact name(s)' })}
          {campo('fecha', 'Fecha', { type: 'date' })}
          {campo('lugar', 'Lugar')}
          <label>Validez (días hábiles)<input type="number" min="1" value={o.validez} onChange={(e) => setO('validez', Number(e.target.value) || 15)} /></label>
        </div>
      </section>
      <section className="bloque">
        <h3>Buque</h3>
        <div className="rejilla">
          {campo('buque', 'Nombre', { placeholder: 'MV …' })}
          {campo('tipoBuque', 'Tipo')}
          {campo('imo', 'IMO')}
          {campo('bandera', 'Bandera · puerto')}
          {campo('gt', 'Gross tonnage')}
          {campo('propulsion', 'Propulsión')}
        </div>
      </section>
      <section className="bloque">
        <h3>Textos</h3>
        <div className="rejilla-textos">
          {campo('titulo', 'Título')}
          {texto('alcanceRequerido', 'Scope of services required')}
          {texto('notaTripulacion', 'Nota bajo la tripulación', 2)}
          {campo('condicion', 'Condición (título de la tabla de precios)')}
          <label className="en-linea"><input type="checkbox" checked={!!o.enfermeroOpcional} onChange={(e) => setO('enfermeroOpcional', e.target.checked)} />
            Incluir enfermero opcional{enfermero ? ` (ARS ${fmt0(enfermero.ars)} / USD ${fmt0(enfermero.usd)} por día)` : ''}</label>
          {texto('inicioFin', 'Service and salary commencement and ending', 5)}
          {texto('notaConvenio', 'Nota de convenios', 2)}
        </div>
      </section>
      <section className="bloque">
        <h3>Firma</h3>
        <div className="rejilla">
          {campo('firmaNombre', 'Nombre')}
          {campo('firmaCargo', 'Cargo')}
          {campo('firmaEmail', 'Email')}
        </div>
      </section>

      {viendo && createPortal(
        <div className="oferta-vista">
          <div className="oferta-barra">
            <button onClick={() => window.print()}>Imprimir / guardar PDF</button>
            <button className="secundario" onClick={() => setViendo(false)}>Cerrar</button>
            {desbordan.length > 0
              ? <span className="aviso error">La hoja {desbordan.join(' y ')} no entra en un A4: acortá los textos o la tripulación.</span>
              : <span className="ayuda">En la ventana de impresión elegí "Guardar como PDF", tamaño A4 y sin encabezados ni pies del navegador.</span>}
          </div>
          <Documento o={o} p={p} calc={calc} enfermero={enfermero} supply={supply} />
        </div>, document.body,
      )}
    </>
  );
}

function Hoja({ o, n, total, encabezado, children }) {
  return (
    <section className="hoja">
      <header className="hoja-cabeza">
        <img src="/terramare-azul.png" alt="TERRAMARE" />
        {encabezado ?? <div className="hoja-direccion"><b>Terra-Mare Services S.A.</b><br />Alvear 653, San Fernando,<br />Buenos Aires, Argentina</div>}
      </header>
      <div className="hoja-cuerpo">{children}</div>
      <footer className="hoja-pie"><span>TERRAMARE · Budgetary offer · {o.buque || 'Vessel'}</span><span>{n} / {total}</span></footer>
    </section>
  );
}

function Documento({ o, p, calc, enfermero, supply }) {
  const fx = calc.c.fx || 0;
  const filas = calc.lineas.map((x) => {
    const n = Number(x.linea.cantidad) || 0;
    const unit = x.r.unitarioDia.navegado;
    return { clave: x.linea.categoria, nombre: nombrePuesto(x.linea.categoria), stcw: PUESTOS_OFERTA[x.linea.categoria]?.stcw ?? '—', n, unit, ars: unit * n, usd: fx ? (unit * n) / fx : 0 };
  });
  const personas = filas.reduce((s, f) => s + f.n, 0);
  const totalArs = filas.reduce((s, f) => s + f.ars, 0);
  const totalUsd = fx ? totalArs / fx : 0;
  const fee = Number(p.managementFee) || 0;
  const jdm = calc.c.basicos['jefe-maquina'];
  const enc = <div className="hoja-encabezado-corto">{[o.cliente, o.buque].filter(Boolean).join(' · ').toUpperCase()}</div>;
  const cliente = o.cliente || '[Client]';
  const buque = o.buque || '[Vessel]';

  return (
    <div className="oferta-documento">
      <Hoja o={o} n={1} total={3}>
        <div className="overline">{o.titulo}</div>
        <div className="hoja-titulo"><h1>{buque}</h1><span className="hoja-fecha">{o.lugar}, {fechaEn(o.fecha)}</span></div>
        <div className="filete" />
        <div className="destinatario">
          <span className="etiqueta-doc">TO</span><b>{cliente}</b>
          <span className="etiqueta-doc">ATTN.</span><span className="gris">{o.attn || '[Contact name(s) – to be confirmed]'}</span>
        </div>
        <p>TERRA-MARE SERVICES S.A. (hereinafter referred to as the "CONTRACTOR"), headquartered at Alvear 653, 1646 San Fernando, Buenos Aires, Argentina,
          hereby submits the following Budgetary Offer (the "Offer") to {cliente.toUpperCase()} (the "COMPANY") for the provision of Crewing Services Management
          for the {o.tipoBuque} {buque.replace(/^MV\s+/i, '').toUpperCase()}, as detailed herein.</p>
        <p>This Offer shall remain valid for a period of {enLetras(o.validez)} ({o.validez}) business days from the date of issuance.</p>
        <div className="datos-buque">
          {[['IMO NUMBER', o.imo], ['FLAG · PORT', o.bandera], ['GROSS TONNAGE', o.gt], ['PROPULSION', o.propulsion]].map(([k, v]) => (
            <div key={k}><span className="etiqueta-doc">{k}</span><span className="mono">{v || '—'}</span></div>
          ))}
        </div>
        <h4>SCOPE OF SERVICES REQUIRED</h4>
        <p>{o.alcanceRequerido}</p>
        <h4>SCOPE OF SERVICES PROPOSAL</h4>
        <table className="tabla-doc">
          <thead><tr><th>Grade / Capacity</th><th className="c">STCW</th><th className="n">MSM</th></tr></thead>
          <tbody>
            {filas.map((f, i) => <tr key={i}><td>{f.nombre}</td><td className="c mono">{f.stcw}</td><td className="n">{f.n}</td></tr>)}
          </tbody>
          <tfoot><tr><td colSpan={2}>Total Crew</td><td className="n">{personas}</td></tr></tfoot>
        </table>
        {o.notaTripulacion && <p className="nota-doc">{o.notaTripulacion}</p>}
        <div className="firma">
          <p>Sincerely,</p>
          <b>{o.firmaNombre || '[Name]'}</b><br />{o.firmaCargo}<br /><span className="mono azul">{o.firmaEmail}</span>
        </div>
      </Hoja>

      <Hoja o={o} n={2} total={3} encabezado={enc}>
        <div className="numero-seccion">01</div>
        <h2 className="titulo-seccion">Pricing</h2>
        <div className="filete" />
        <p>This proposal is based on the specific request from the COMPANY. Should market conditions or Union demands result in changes to the requested
          crew composition and/or Supply Type denomination, the COMPANY and CONTRACTOR will jointly review such changes and discuss possible alternatives.</p>
        <p>The CONTRACTOR undertakes to keep the COMPANY duly informed of any ongoing or forthcoming Union negotiations that may affect the crew costs herein.
          All calculations contained in this proposal have been performed based on the latest applicable Salary Scale dated {mesEn(calc.escala.mes)}.</p>
        <h3 className="subtitulo-doc">1.1 Condition – {o.condicion}</h3>
        <table className="tabla-doc">
          <thead><tr><th>Crew Personnel</th><th className="n">Unitary Cost (ARS per day)</th><th className="n">Qty</th><th className="n">Total Crew (ARS per day)</th><th className="n">Total Crew (USD per day)</th></tr></thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i}><td>{f.nombre}</td><td className="n mono">{fmt0(f.unit)}</td><td className="n mono">{f.n}</td><td className="n mono">{fmt0(f.ars)}</td><td className="n mono">{fmt0(f.usd)}</td></tr>
            ))}
          </tbody>
          <tfoot><tr><td>Total Crew</td><td /><td className="n mono">{personas}</td><td className="n mono">ARS {fmt0(totalArs)}</td><td className="n mono">USD {fmt0(totalUsd)}</td></tr></tfoot>
        </table>
        <div className="fx-doc"><span>Fx Rate</span><span className="mono">{fmt0(fx)}</span></div>
        <div className="precio-doc">
          <div className="total-dia">
            <span className="etiqueta-doc">TOTAL COST (USD PER DAY)</span>
            <div><span>Total Crew</span><span className="mono">USD {fmt0(totalUsd)}</span></div>
            <div><span>Management Fee</span><span className="mono">USD {fmt0(fee)}</span></div>
            <div className="total-dia-final"><span>Total Cost Per Day</span><span className="mono">USD {fmt0(totalUsd + fee)}</span></div>
          </div>
          <table className="tabla-doc estructura">
            <thead><tr><th>Cost Structure</th><th className="n">%</th><th className="n">Base Value</th><th>Unit</th><th>Comment</th></tr></thead>
            <tbody>
              <tr><td>Crew</td><td className="n mono">100%</td><td className="n mono">{fmt0(jdm?.monto)}</td><td>Index</td><td className="gris">SBJm0 – See (1)</td></tr>
              <tr><td>Management Fee</td><td className="n mono">100%</td><td className="n mono">{fmt0(fee)}</td><td>USD/Day</td><td className="gris">{supply ? `${supply} – ` : ''}Fix in USD</td></tr>
              <tr><td>Exchange Rate</td><td /><td className="n mono">{fmt0(fx)}</td><td>ARS / USD</td><td className="gris">TC0 – See (2)</td></tr>
            </tbody>
          </table>
        </div>
        {enfermero && (
          <div className="opcional-doc">
            <span className="etiqueta-doc">OPTIONAL · NURSE</span>
            <p>Should the COMPANY require a Nurse on board (e.g. depending on the total number of persons embarked), an ENFERMERO-Nurse can be added to the crew
              at ARS {fmt0(enfermero.ars)} per day (USD {fmt0(enfermero.usd)} per day), in addition to the Total Cost Per Day above.</p>
          </div>
        )}
        <p className="nota-doc">{o.notaConvenio}</p>
        <p className="nota-doc">(1) SBJm0: Basic salary of the Chief Engineer, Salary Scale {mesEn(calc.escala.mes)}. (2) TC0: Banco de la Nación Argentina exchange rate used for this Offer.</p>
      </Hoja>

      <Hoja o={o} n={3} total={3} encabezado={enc}>
        <div className="numero-seccion">02</div>
        <h2 className="titulo-seccion">Service and Salary Commencement and Ending</h2>
        <div className="filete" />
        {String(o.inicioFin).split(/\n\s*\n/).map((t, i) => <p key={i}>{t}</p>)}
      </Hoja>
    </div>
  );
}
