import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { CATEGORIA } from '../lib/categorias.js';
import { fmt, fmtFecha, fmtFechaHora, fmtMes } from '../lib/formato.js';

const TIPOS = {
  escala: 'Básicos (paritarias)', divisas: 'Divisas', parametros: 'Parámetros', override: 'Override manual',
  categorias: 'Reglas de categorías', logica: 'Lógica de cálculo', nota: 'Nota',
};
const nombreCat = (k) => CATEGORIA[k]?.nombre ?? k;
const valor = (v) => (v == null ? '—' : typeof v === 'number' ? fmt(v) : typeof v === 'object' ? JSON.stringify(v) : String(v));

function Detalle({ fila }) {
  const d = fila.detalle ?? {};
  if (fila.tipo === 'escala' && Array.isArray(d.cambios) && d.cambios.length) {
    return (
      <div className="tabla-marco"><table className="tabla">
        <thead><tr><th>Categoría</th><th>Mes</th><th className="n">Antes</th><th className="n">Después</th></tr></thead>
        <tbody>{d.cambios.map((c, i) => (
          <tr key={i}><td>{nombreCat(c.categoria)}</td><td>{fmtMes(String(c.mes))}</td><td className="n">{valor(c.antes)}</td><td className="n">{valor(c.despues)}</td></tr>
        ))}</tbody>
      </table></div>
    );
  }
  if (Array.isArray(d.cambios) && d.cambios.length && typeof d.cambios[0] === 'object') {
    return (
      <div className="tabla-marco"><table className="tabla">
        <thead><tr><th>Dato</th><th className="n">Antes</th><th className="n">Después</th></tr></thead>
        <tbody>{d.cambios.map((c, i) => <tr key={i}><td>{c.clave}</td><td className="n">{valor(c.antes)}</td><td className="n">{valor(c.despues)}</td></tr>)}</tbody>
      </table></div>
    );
  }
  if (Array.isArray(d.cambios)) return <ul className="aviso">{d.cambios.map((c, i) => <li key={i}>{c}</li>)}</ul>;
  if (fila.tipo === 'override') return <p className="aviso">{nombreCat(d.categoria)}: {fmt(Number(d.monto))} desde {fmtFecha(d.desde)}{d.hasta ? ` hasta ${fmtFecha(d.hasta)}` : ''}. Motivo: {d.motivo}</p>;
  return Object.keys(d).length ? <pre className="detalle">{JSON.stringify(d, null, 2)}</pre> : null;
}

export default function LogCambios({ ctx }) {
  const [filtro, setFiltro] = useState('');
  const [nota, setNota] = useState({ tipo: 'nota', descripcion: '', vigente_desde: '' });
  const [aviso, setAviso] = useState(null);
  const filas = ctx.datos.log.filter((l) => !filtro || l.tipo === filtro);

  async function agregar(e) {
    e.preventDefault();
    const { error } = await supabase.from('cs_log').insert({
      tipo: nota.tipo, descripcion: nota.descripcion.trim(), vigente_desde: nota.vigente_desde || null,
      version: nota.tipo === 'logica' ? `manual-${Date.now()}` : null, email: ctx.email.toLowerCase(),
    });
    if (error) { setAviso({ error: true, texto: error.message }); return; }
    setNota({ tipo: 'nota', descripcion: '', vigente_desde: '' });
    setAviso({ texto: 'Registrado.' });
    ctx.recargar('log');
  }

  return (
    <>
      <h1>Log de cambios.</h1>
      <div className="filete" />
      <p className="aviso">
        Cada actualización de básicos por paritarias, divisas, parámetros, overrides y lógica de cálculo queda acá: qué cambió (antes y después),
        quién, cuándo se cargó y desde qué fecha rige. Se agrega solo y no se puede editar ni borrar.
      </p>
      <div className="fila-botones">
        <label>Tipo
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(TIPOS).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
          </select>
        </label>
      </div>
      <div className="tabla-marco">
        <table className="tabla">
          <thead><tr><th>Cargado</th><th>Quién</th><th>Tipo</th><th>Rige desde</th><th>Cambio</th></tr></thead>
          <tbody>
            {filas.map((l) => (
              <tr key={l.id}>
                <td className="n">{fmtFechaHora(l.at)}</td>
                <td>{l.email}</td>
                <td><span className="chip">{TIPOS[l.tipo] ?? l.tipo}</span></td>
                <td className="n">{fmtFecha(l.vigente_desde)}</td>
                <td>
                  <div>{l.descripcion}{l.version && l.tipo === 'logica' && !l.version.startsWith('manual') ? ` (${l.version})` : ''}</div>
                  {Object.keys(l.detalle ?? {}).length > 0 && <details><summary>Ver detalle</summary><Detalle fila={l} /></details>}
                </td>
              </tr>
            ))}
            {!filas.length && <tr><td colSpan={5} className="aviso">Sin registros.</td></tr>}
          </tbody>
        </table>
      </div>

      {ctx.editor && (
        <section>
          <h2>Registrar un cambio a mano</h2>
          <p className="aviso">Para dejar constancia de algo que no pasa por la app (por ejemplo, un criterio acordado o un cambio de lógica pedido al desarrollo).</p>
          <form onSubmit={agregar} className="fila-botones">
            <label>Tipo
              <select value={nota.tipo} onChange={(e) => setNota({ ...nota, tipo: e.target.value })}>
                <option value="nota">Nota</option><option value="logica">Lógica de cálculo</option>
              </select>
            </label>
            <label>Rige desde<input type="date" value={nota.vigente_desde} onChange={(e) => setNota({ ...nota, vigente_desde: e.target.value })} /></label>
            <label style={{ flex: '1 1 400px' }}>Descripción
              <input required value={nota.descripcion} onChange={(e) => setNota({ ...nota, descripcion: e.target.value })} />
            </label>
            <button>Registrar</button>
          </form>
          {aviso && <p className={`aviso ${aviso.error ? 'error' : 'ok'}`}>{aviso.texto}</p>}
        </section>
      )}
    </>
  );
}
