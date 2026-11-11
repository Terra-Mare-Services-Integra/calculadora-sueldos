// Resolución de básicos vigentes a partir de las actas cargadas.
// Regla: para un mes se usa, por categoría, el último monto con vigencia ≤ ese mes ("última vigente").
// Si el último monto es de un mes anterior (acta atrasada), el valor queda marcado como provisorio.
// Un override manual activo pisa el valor y queda registrado (cs_overrides + log).

export const mesDe = (fecha) => String(fecha).slice(0, 7); // 'YYYY-MM'
export const hoyMes = () => new Date().toISOString().slice(0, 7);

/**
 * @param {object} o
 * @param {Array} o.categorias filas de cs_categorias: { clave, forma: 'monto'|'coef', base, coef }
 * @param {Array} o.basicos   filas de cs_basicos: { categoria, mes: 'YYYY-MM-01', monto, acta_id }
 * @param {Array} o.actas     filas de cs_actas: { id, nombre, firmada_el }
 * @param {Array} o.overrides filas activas de cs_overrides: { categoria, monto, desde, hasta, motivo }
 * @param {string} o.mes      'YYYY-MM'
 */
export function basicosVigentes({ categorias = [], basicos = [], actas = [], overrides = [], mes = hoyMes() }) {
  const actaPorId = Object.fromEntries(actas.map((a) => [a.id, a]));
  const porCat = {};
  for (const b of basicos) {
    if (mesDe(b.mes) > mes) continue;
    const prev = porCat[b.categoria];
    const firma = (actaPorId[b.acta_id]?.firmada_el ?? '');
    if (!prev || mesDe(b.mes) > mesDe(prev.mes) || (mesDe(b.mes) === mesDe(prev.mes) && firma > prev._firma)) {
      porCat[b.categoria] = { ...b, _firma: firma };
    }
  }
  const out = {};
  const config = Object.fromEntries(categorias.map((c) => [c.clave, c]));
  const resolver = (clave, pila = []) => {
    if (out[clave]) return out[clave];
    if (pila.includes(clave)) throw new Error(`Ciclo de coeficientes en ${clave}`);
    const c = config[clave] ?? { clave, forma: 'monto' };
    let r;
    if (c.forma === 'coef' && c.base) {
      const base = resolver(c.base, [...pila, clave]);
      r = { monto: base.monto * Number(c.coef || 0), mes: base.mes, acta: base.acta, provisoria: base.provisoria,
            origen: `${Number(c.coef)} × ${c.base}` };
    } else {
      const b = porCat[clave];
      r = b
        ? { monto: Number(b.monto), mes: mesDe(b.mes), acta: actaPorId[b.acta_id]?.nombre ?? null, provisoria: mesDe(b.mes) < mes, origen: 'acta' }
        : { monto: 0, mes: null, acta: null, provisoria: true, origen: 'sin cargar' };
    }
    const ov = overrides.find((o) => o.categoria === clave && mesDe(o.desde) <= mes && (!o.hasta || mesDe(o.hasta) >= mes));
    if (ov) r = { ...r, montoActa: r.monto, monto: Number(ov.monto), override: ov, origen: 'override manual' };
    out[clave] = r;
    return r;
  };
  for (const c of categorias) resolver(c.clave);
  for (const k of Object.keys(porCat)) resolver(k);
  return out;
}

/** Versión vigente de una tabla versionada por fecha (parámetros, divisas): la última con vigente_desde ≤ fecha. */
export function vigente(filas, fecha) {
  const f = String(fecha).slice(0, 10);
  return [...filas].filter((x) => String(x.vigente_desde).slice(0, 10) <= f)
    .sort((a, b) => String(b.vigente_desde).localeCompare(String(a.vigente_desde)) || String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))[0] ?? null;
}

/** Meses entre dos 'YYYY-MM' inclusive. */
export function meses(desde, hasta) {
  const out = [];
  let [y, m] = desde.split('-').map(Number);
  const [yh, mh] = hasta.split('-').map(Number);
  while (y < yh || (y === yh && m <= mh)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    if (++m > 12) { m = 1; y++; }
  }
  return out;
}
