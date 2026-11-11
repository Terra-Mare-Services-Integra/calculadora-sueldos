// Definición de los parámetros (nombres, unidades y tipo). Los VALORES viven en cs_parametros.
export const CAMPOS_REGIMEN = [
  { k: 'contrato', label: 'Contrato', tipo: 'opcion', opciones: ['TERCERO', 'BARCO PROPIO'], ayuda: 'Con TERCERO se suman Ingresos Brutos e impuesto al crédito y débito.' },
  { k: 'decreto633', label: 'Decreto 633/2018', tipo: 'si-no' },
  { k: 'divisas', label: 'Divisas', tipo: 'opcion', opciones: ['limitrofe', 'no_limitrofe'], nombres: { limitrofe: 'Limítrofe', no_limitrofe: 'No limítrofe' } },
  { k: 'art', label: 'Prima ART', tipo: 'pct' },
  { k: 'antiguedadAnios', label: 'Antigüedad promedio', tipo: 'num', unidad: 'años' },
  { k: 'vacacionesDias', label: 'Vacaciones promedio', tipo: 'num', unidad: 'días' },
  { k: 'diasMes', label: 'Días del mes', tipo: 'num', unidad: 'días' },
  { k: 'feriados', label: 'Feriados por año', tipo: 'num', unidad: 'días' },
  { k: 'estabilidad', label: 'Estabilidad laboral / previsión por despido', tipo: 'pct' },
  { k: 'cargas', label: 'Contribuciones de cargas sociales', tipo: 'pct' },
  { k: 'seguroVida', label: 'Seguro de vida obligatorio', tipo: 'monto', unidad: 'ARS/mes' },
  { k: 'fondoEnfermedades', label: 'Fondo fiduciario de enfermedades profesionales', tipo: 'monto', unidad: 'ARS/mes' },
  { k: 'sac', label: 'SAC', tipo: 'pct' },
  { k: 'cuotaCubierta', label: 'Cuota sindical capitanes y oficiales de cubierta', tipo: 'pct' },
  { k: 'cuotaGeneral', label: 'Cuota sindical resto', tipo: 'pct' },
  { k: 'iibb', label: 'Ingresos Brutos (solo TERCERO)', tipo: 'pct' },
  { k: 'creditoDebito', label: 'Impuesto créd. y déb. (solo TERCERO)', tipo: 'pct' },
  { k: 'tasaDecreto633', label: 'Tasa Decreto 633/2018', tipo: 'pct' },
  { k: 'divisorVacaciones', label: 'Divisor de vacaciones', tipo: 'num' },
  { k: 'divisorFeriados', label: 'Divisor de feriados', tipo: 'num' },
  { k: 'divisorFeriadosSubalterno', label: 'Divisor de feriados subalternos (Eventuales)', tipo: 'num' },
  { k: 'factorOrdenes', label: 'Factor a las órdenes 16-90 días / efectivos', tipo: 'pct' },
  { k: 'antiguedad', label: 'Antigüedad: % por año según tramo', tipo: 'tramos' },
];

// Lo que se puede ajustar por cotización desde Crewing (el resto sale de los parámetros vigentes).
export const AJUSTABLES_CREWING = ['contrato', 'decreto633', 'divisas', 'art', 'antiguedadAnios', 'vacacionesDias'];

export const CAMPOS_GLOBALES = [
  { k: 'viveresDia', label: 'Víveres', tipo: 'monto', unidad: 'USD/día/persona' },
  { k: 'trasladoPuerto', label: 'Traslado a puerto de salida', tipo: 'monto', unidad: 'USD/persona (ida y vuelta = ×2)' },
  { k: 'trasladoDomestico', label: 'Traslado doméstico', tipo: 'monto', unidad: 'USD/persona (ida y vuelta = ×2)' },
  { k: 'hospedaje', label: 'Hospedaje doméstico', tipo: 'monto', unidad: 'USD/persona (ida y vuelta = ×2)' },
  { k: 'lavanderia', label: 'Adicional lavandería', tipo: 'monto', unidad: 'USD/persona' },
  { k: 'epp', label: 'EPP', tipo: 'monto', unidad: 'USD/persona' },
  { k: 'ayudaAdicionales', label: 'Ayuda de adicionales (texto que se muestra en Crewing)', tipo: 'texto' },
];

/** Parámetros para el motor: los vigentes del régimen + los ajustes de la cotización. */
export function paramsCalculo(valores, regimen, ajustes = {}) {
  const base = valores?.[regimen] ?? {};
  const out = { ...base };
  for (const k of AJUSTABLES_CREWING) if (ajustes[k] !== undefined && ajustes[k] !== '') out[k] = ajustes[k];
  for (const k of ['antiguedadAnios', 'vacacionesDias', 'art']) out[k] = Number(out[k] ?? 0);
  return out;
}

/** Campos numéricos que faltan cargar (para avisar en pantalla). */
export function faltantes(valores) {
  const f = [];
  for (const r of ['terramare', 'eventuales', 'efectivos']) {
    for (const c of CAMPOS_REGIMEN) if (valores?.[r]?.[c.k] === undefined || valores?.[r]?.[c.k] === null) f.push(`${r}.${c.k}`);
  }
  return f;
}
