const ars = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ent = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

export const fmt = (n) => (n == null || Number.isNaN(n) ? '—' : ars.format(n));
export const fmt0 = (n) => (n == null || Number.isNaN(n) ? '—' : ent.format(n));
export const fmtPct = (n) => (n == null ? '—' : `${ars.format(n * 100)} %`);

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const fmtMes = (m) => (m ? `${MESES[Number(m.slice(5, 7)) - 1]}-${m.slice(2, 4)}` : '—');
export const fmtFecha = (f) => (f ? `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}` : '—');
export const fmtFechaHora = (t) => {
  if (!t) return '—';
  const d = new Date(t);
  return `${d.toLocaleDateString('es-AR')} ${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
};

/** Lee números escritos a la argentina ("6.151.966,62") o con punto decimal ("1537.50"). */
export function leerNumero(s) {
  if (typeof s === 'number') return s;
  const t = String(s ?? '').trim().replace(/\s|\$/g, '');
  if (!t) return null;
  const n = t.includes(',') ? Number(t.replace(/\./g, '').replace(',', '.')) : (t.match(/\./g)?.length > 1 ? Number(t.replace(/\./g, '')) : Number(t));
  return Number.isFinite(n) ? n : null;
}
