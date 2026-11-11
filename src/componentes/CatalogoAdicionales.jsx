import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { CASILLEROS } from '../lib/proyecto.js';
import { leerNumero, fmt } from '../lib/formato.js';

const GRUPOS = [['cubierta', 'Capitán y oficiales de cubierta'], ['maquinas', 'Jefe y oficiales de máquina'], ['subalterno', 'Subalternos (SOMU)'],
  ['pilotaje', 'Pilotaje'], ['car', 'Escala CAR']];
const pct = (v) => `${fmt(Number(v) * 100).replace(/,00$/, '')} %`;
const casilleroCorto = { rj: 'sobre el básico', supply: 'sobre básico + RJ', locacion: 'sobre básico + RJ + supply', acta: 'sobre el bruto' };

/**
 * Catálogo de adicionales: se tildan los que aplican al proyecto, se crean nuevos (quedan en el catálogo para todos)
 * y se editan los existentes. seleccion: ids tildados. onCambio(ids, nuevoId?).
 */
export default function CatalogoAdicionales({ ctx, seleccion, onCambio, alcance, onAlcance }) {
  const catalogo = (ctx.datos.adicionales ?? []).filter((c) => c.activo);
  const [editando, setEditando] = useState(null); // null | 'nuevo' | adicional
  const alternar = (id) => onCambio(seleccion.includes(id) ? seleccion.filter((x) => x !== id) : [...seleccion, id]);

  return (
    <div className="catalogo">
      <div className="catalogo-lista">
        {catalogo.map((c) => {
          const on = seleccion.includes(c.id);
          return (
            <div key={c.id} className={`catalogo-item ${on ? 'on' : ''}`}>
              <label className="catalogo-check">
                <input type="checkbox" checked={on} onChange={() => alternar(c.id)} />
                <span>
                  <strong>{c.nombre}</strong>
                  <span className="ayuda">{c.opciones.map((o) => (o.nombre ? `${o.nombre} ${pct(o.valor)}` : pct(o.valor))).join(' · ')}</span>
                  <span className="ayuda">Se calcula {casilleroCorto[c.casillero]}{c.descripcion ? ` · ${c.descripcion}` : ''}</span>
                  {on && onAlcance ? (
                    <select className="compacto alcance" value={alcance?.[c.id] ?? c.alcance ?? 'posicion'}
                      onChange={(e) => onAlcance(c.id, e.target.value)}>
                      <option value="proyecto">Uno para toda la tripulación</option>
                      <option value="posicion">Se elige en cada posición</option>
                    </select>
                  ) : <span className="ayuda">{(c.alcance ?? 'posicion') === 'proyecto' ? 'Uno para toda la tripulación' : 'Se elige en cada posición'}</span>}
                </span>
              </label>
              {ctx.editor && <button type="button" className="terciario" onClick={() => setEditando(c)}>Editar</button>}
            </div>
          );
        })}
        {!catalogo.length && <p className="aviso">El catálogo está vacío.</p>}
      </div>
      {ctx.editor && !editando && <button type="button" className="secundario" onClick={() => setEditando('nuevo')}>+ Crear adicional nuevo</button>}
      {editando && (
        <EditorAdicional ctx={ctx} adicional={editando === 'nuevo' ? null : editando}
          cerrar={(nuevoId) => { setEditando(null); if (nuevoId) onCambio([...seleccion, nuevoId], nuevoId); }} />
      )}
    </div>
  );
}

function EditorAdicional({ ctx, adicional, cerrar }) {
  const [f, setF] = useState(() => ({
    nombre: adicional?.nombre ?? '', descripcion: adicional?.descripcion ?? '', casillero: adicional?.casillero ?? 'supply',
    alcance: adicional?.alcance ?? 'proyecto',
    por_defecto: adicional?.por_defecto ?? false, predeterminada: adicional?.predeterminada ?? 0,
    opciones: (adicional?.opciones ?? [{ nombre: 'No', valor: 0 }, { nombre: '', valor: '' }])
      .map((o) => ({ ...o, valor: o.valor === '' ? '' : String(Math.round(Number(o.valor) * 1e6) / 1e4).replace('.', ','), grupos: o.grupos ?? [] })),
  }));
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const setOp = (i, cambio) => setF({ ...f, opciones: f.opciones.map((o, j) => (j === i ? { ...o, ...cambio } : o)) });

  async function guardar(desactivar = false) {
    const opciones = f.opciones.filter((o) => o.nombre.trim() || String(o.valor).trim())
      .map((o) => ({ nombre: o.nombre.trim(), valor: (leerNumero(o.valor) ?? NaN) / 100, ...(o.grupos.length ? { grupos: o.grupos } : {}) }));
    if (!f.nombre.trim()) { setError('Falta el nombre.'); return; }
    if (!opciones.length || opciones.some((o) => !Number.isFinite(o.valor))) { setError('Revisá los porcentajes de las opciones.'); return; }
    const fila = { nombre: f.nombre.trim(), descripcion: f.descripcion.trim(), casillero: f.casillero, alcance: f.alcance, por_defecto: f.por_defecto,
      predeterminada: Math.min(f.predeterminada, opciones.length - 1), opciones, ...(desactivar ? { activo: false } : {}) };
    setGuardando(true);
    const r = adicional
      ? await supabase.from('cs_adicionales').update(fila).eq('id', adicional.id).select('id').single()
      : await supabase.from('cs_adicionales').insert({ ...fila, orden: 100 + (ctx.datos.adicionales?.length ?? 0) }).select('id').single();
    setGuardando(false);
    if (r.error) { setError(r.error.message); return; }
    await ctx.recargar('adicionales', 'log');
    cerrar(adicional ? null : r.data?.id);
  }

  return (
    <div className="editor-adicional">
      <h3>{adicional ? `Editar: ${adicional.nombre}` : 'Adicional nuevo'}</h3>
      <div className="rejilla">
        <label>Nombre<input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej.: Adicional inflamable" /></label>
        <label>Cómo se calcula
          <select value={f.casillero} onChange={(e) => setF({ ...f, casillero: e.target.value })}>
            {CASILLEROS.map((c) => <option key={c.k} value={c.k}>{c.label}</option>)}
          </select>
        </label>
        <label>Se elige
          <select value={f.alcance} onChange={(e) => setF({ ...f, alcance: e.target.value })}>
            <option value="proyecto">Uno para toda la tripulación (ej.: Supply type, Acta)</option>
            <option value="posicion">En cada posición (ej.: RJ)</option>
          </select>
        </label>
        <label>Nota (opcional)<input value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} placeholder="Ej.: según acta 04-08-22" /></label>
      </div>
      <h3 style={{ marginTop: 16 }}>Opciones</h3>
      <div className="tabla-marco"><table className="tabla">
        <thead><tr><th>Preseleccionada</th><th>Nombre</th><th className="n">%</th><th>Preseleccionar para</th><th /></tr></thead>
        <tbody>
          {f.opciones.map((o, i) => (
            <tr key={i}>
              <td><input type="radio" name="predet" checked={f.predeterminada === i} onChange={() => setF({ ...f, predeterminada: i })} /></td>
              <td><input value={o.nombre} placeholder="Ej.: Supply C" onChange={(e) => setOp(i, { nombre: e.target.value })} /></td>
              <td className="n"><input className="num" style={{ width: 80 }} value={o.valor} onChange={(e) => setOp(i, { valor: e.target.value })} /></td>
              <td>
                <span className="grupos-opcion">
                  {GRUPOS.map(([g, n]) => (
                    <label key={g} title={n}><input type="checkbox" checked={o.grupos.includes(g)}
                      onChange={() => setOp(i, { grupos: o.grupos.includes(g) ? o.grupos.filter((x) => x !== g) : [...o.grupos, g] })} />{n.split(' ')[0]}</label>
                  ))}
                </span>
              </td>
              <td><button type="button" className="terciario" onClick={() => setF({ ...f, opciones: f.opciones.filter((_, j) => j !== i) })}>Quitar</button></td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <p className="ayuda">"Preseleccionada" es la que toma cada posición nueva. "Preseleccionar para" sirve cuando cambia según el puesto
        (ej.: un porcentaje para capitanes y otro para máquinas y SOMU).</p>
      <div className="fila-botones">
        <button type="button" className="secundario" onClick={() => setF({ ...f, opciones: [...f.opciones, { nombre: '', valor: '', grupos: [] }] })}>+ Opción</button>
        <label className="en-linea"><input type="checkbox" checked={f.por_defecto} onChange={(e) => setF({ ...f, por_defecto: e.target.checked })} />
          Tildado en los proyectos nuevos</label>
      </div>
      <div className="fila-botones">
        <button type="button" onClick={() => guardar(false)} disabled={guardando}>{guardando ? 'Guardando…' : adicional ? 'Guardar cambios' : 'Crear y agregar al proyecto'}</button>
        <button type="button" className="secundario" onClick={() => cerrar(null)}>Cancelar</button>
        {adicional && <button type="button" className="terciario" onClick={() => confirm(`¿Desactivar "${adicional.nombre}"? Deja de aparecer en el catálogo.`) && guardar(true)}>Desactivar</button>}
        {error && <span className="aviso error">{error}</span>}
      </div>
      <p className="ayuda">Queda en el catálogo para todos los proyectos y se registra en el log de cambios.</p>
    </div>
  );
}
