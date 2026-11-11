import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { fmtFechaHora } from '../../lib/formato.js';

const BUCKET = 'calculadora-documentos';
export const TIPOS_DOC = [
  ['msm', 'MSM (Minimum Safe Manning)'], ['mom', 'MoM / minuta de reunión'], ['mail', 'Mail'],
  ['contrato', 'Contrato / orden de compra'], ['oferta', 'Oferta enviada'], ['otro', 'Otro'],
];
const NOMBRE_TIPO = Object.fromEntries(TIPOS_DOC);
const tamano = (b) => (b == null ? '—' : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB`);
// Nombre seguro para la ruta en Storage (el original se guarda aparte).
const seguro = (n) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').slice(-120);
// Tipo sugerido por el nombre del archivo.
const adivinar = (n) => (/msm|safe\s*manning|manning/i.test(n) ? 'msm' : /\bmom\b|minut|meeting/i.test(n) ? 'mom'
  : /\.(eml|msg)$/i.test(n) ? 'mail' : /offer|oferta|cotiz/i.test(n) ? 'oferta' : /contrat|\bpo\b|orden/i.test(n) ? 'contrato' : 'otro');

export default function Documentos({ ctx, id }) {
  const [docs, setDocs] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [subiendo, setSubiendo] = useState([]);
  const [error, setError] = useState(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [tipoNuevo, setTipoNuevo] = useState('');
  const input = useRef(null);

  const cargar = () => supabase.from('cs_documentos').select('*').eq('proyecto_id', id).order('created_at', { ascending: false })
    .then(({ data, error: e }) => (e ? setError(e.message) : setDocs(data ?? [])));
  useEffect(() => { cargar(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function subir(archivos) {
    setError(null);
    const lista = [...archivos];
    setSubiendo(lista.map((f) => f.name));
    for (const f of lista) {
      const ruta = `${id}/${Date.now()}-${seguro(f.name)}`;
      const up = await supabase.storage.from(BUCKET).upload(ruta, f, { contentType: f.type || undefined });
      if (up.error) { setError(`${f.name}: ${up.error.message}`); continue; }
      const ins = await supabase.from('cs_documentos').insert({
        proyecto_id: id, ruta, nombre: f.name, tipo: tipoNuevo || adivinar(f.name), tamano: f.size, mime: f.type || null,
        created_by: ctx.email.toLowerCase(),
      });
      if (ins.error) { setError(`${f.name}: ${ins.error.message}`); await supabase.storage.from(BUCKET).remove([ruta]); }
    }
    setSubiendo([]);
    if (input.current) input.current.value = '';
    cargar();
  }
  async function abrir(d) {
    const { data, error: e } = await supabase.storage.from(BUCKET).createSignedUrl(d.ruta, 120, { download: d.nombre });
    if (e) setError(e.message); else window.open(data.signedUrl, '_blank', 'noopener');
  }
  async function ver(d) {
    const { data, error: e } = await supabase.storage.from(BUCKET).createSignedUrl(d.ruta, 300);
    if (e) setError(e.message); else window.open(data.signedUrl, '_blank', 'noopener');
  }
  async function cambiar(d, cambio) {
    const { error: e } = await supabase.from('cs_documentos').update(cambio).eq('id', d.id);
    if (e) setError(e.message); else setDocs((xs) => xs.map((x) => (x.id === d.id ? { ...x, ...cambio } : x)));
  }
  async function borrar(d) {
    if (!confirm(`¿Borrar "${d.nombre}"? No se puede recuperar.`)) return;
    const r = await supabase.storage.from(BUCKET).remove([d.ruta]);
    if (r.error) { setError(r.error.message); return; }
    const { error: e } = await supabase.from('cs_documentos').delete().eq('id', d.id);
    if (e) setError(e.message); else cargar();
  }

  const visibles = (docs ?? []).filter((d) => !filtro || d.tipo === filtro);
  const puedeBorrar = (d) => ctx.editor || d.created_by === ctx.email.toLowerCase();
  const conteo = Object.fromEntries(TIPOS_DOC.map(([k]) => [k, (docs ?? []).filter((d) => d.tipo === k).length]));

  return (
    <>
      <div className="encabezado-compacto">
        <h1>Documentos.</h1>
        <span className="aviso">Los archivos del proyecto: MSM, minutas de reunión, mails, contratos, la oferta enviada… Solo los ve quien tiene acceso a la calculadora.</span>
      </div>

      <div className={`zona-subida ${arrastrando ? 'activa' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }} onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastrando(false); if (e.dataTransfer.files.length) subir(e.dataTransfer.files); }}>
        <p>Arrastrá archivos acá o</p>
        <div className="fila-botones" style={{ marginTop: 0, justifyContent: 'center' }}>
          <button onClick={() => input.current?.click()} disabled={subiendo.length > 0}>{subiendo.length ? `Subiendo ${subiendo.length}…` : 'Elegir archivos'}</button>
          <label className="en-linea">como
            <select className="compacto" value={tipoNuevo} onChange={(e) => setTipoNuevo(e.target.value)}>
              <option value="">tipo según el nombre</option>
              {TIPOS_DOC.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
          </label>
        </div>
        <input ref={input} type="file" multiple hidden onChange={(e) => e.target.files.length && subir(e.target.files)} />
        <p className="ayuda">PDF, Word, Excel, mails (.msg / .eml), imágenes… hasta 25 MB por archivo. Para un mail de Outlook, arrastralo desde Outlook a una carpeta y de ahí acá.</p>
      </div>
      {error && <p className="aviso error">{error}</p>}

      <div className="fila-botones">
        <button className={filtro ? 'secundario mini' : 'mini'} onClick={() => setFiltro('')}>Todos ({docs?.length ?? 0})</button>
        {TIPOS_DOC.filter(([k]) => conteo[k]).map(([k, n]) => (
          <button key={k} className={filtro === k ? 'mini' : 'secundario mini'} onClick={() => setFiltro(k)}>{n.split(' (')[0]} ({conteo[k]})</button>
        ))}
      </div>

      {docs === null ? <p className="aviso">Cargando…</p> : !visibles.length ? <p className="aviso">Todavía no hay documentos{filtro ? ' de este tipo' : ''}.</p> : (
        <div className="tabla-marco"><table className="tabla documentos">
          <thead><tr><th>Archivo</th><th>Tipo</th><th>Nota</th><th className="n">Tamaño</th><th>Subido</th><th /></tr></thead>
          <tbody>
            {visibles.map((d) => (
              <tr key={d.id}>
                <td><button className="enlace" onClick={() => ver(d)} title="Abrir">{d.nombre}</button></td>
                <td>
                  <select className="compacto" value={d.tipo} onChange={(e) => cambiar(d, { tipo: e.target.value })} disabled={!puedeBorrar(d)}>
                    {TIPOS_DOC.map(([k, n]) => <option key={k} value={k}>{n.split(' (')[0]}</option>)}
                  </select>
                </td>
                <td><input className="compacto nota-doc-input" defaultValue={d.nota} placeholder="Agregar una nota…" disabled={!puedeBorrar(d)}
                  onBlur={(e) => e.target.value !== d.nota && cambiar(d, { nota: e.target.value })} /></td>
                <td className="n">{tamano(d.tamano)}</td>
                <td className="ayuda">{fmtFechaHora(d.created_at)}<br />{d.created_by}</td>
                <td className="acciones-linea">
                  <button className="mini secundario" onClick={() => abrir(d)}>Descargar</button>
                  {puedeBorrar(d) && <button className="mini terciario" onClick={() => borrar(d)}>Borrar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      <p className="ayuda">{NOMBRE_TIPO.msm}: certificado de dotación mínima del buque, base del alcance de la oferta.</p>
    </>
  );
}
