// Proyecto (cotización de una tripulación): régimen, configuración, adicionales y días comunes, y posiciones
// que heredan lo común salvo que se cambie en la posición. Se guarda en cs_crewing.datos.
import { basicosVigentes, vigente, hoyMes } from './escalas.js';
import { lineaCrewing, resumenCrewing } from './calculo.js';
import { paramsCalculo } from './parametros.js';

export const ADICIONALES = [
  { k: 'rj', label: 'Resp. jerárquica / plus operativo', corto: 'RJ / Plus op.' },
  { k: 'supply', label: 'Supply type / buque mayor', corto: 'Supply' },
  { k: 'locacion', label: 'Locación costa afuera / buque gasero', corto: 'Locación' },
  { k: 'acta', label: 'Adicional Acta 04-08-22', corto: 'Acta 04-08-22' },
  { k: 'regimenFranco', label: 'Régimen de franco', corto: 'Rég. franco' },
  { k: 'precioFranco', label: 'Precio del franco', corto: 'Precio franco' },
];
export const DIAS = [
  { k: 'navegado', label: 'Navegado' }, { k: 'integracion', label: 'Integración de contrato' },
  { k: 'ordenes15', label: 'A las órdenes 0-15' }, { k: 'ordenes90', label: 'A las órdenes 16-90' }, { k: 'divisas', label: 'Con divisas' },
];
export const EXTRAS = [
  { k: 'lavanderia', label: 'Lavandería' }, { k: 'trasladoPuerto', label: 'Traslado a puerto' },
  { k: 'trasladoDomestico', label: 'Traslado doméstico' }, { k: 'hospedaje', label: 'Hospedaje' }, { k: 'epp', label: 'EPP' },
];

export const proyectoNuevo = ({ nombre, cliente = '', regimen }) => ({
  nombre, cliente, regimen, notas: '',
  mes: null,                                   // null = mes actual (última escala vigente)
  tc: { tipo: 'divisa_venta', fecha: null, valores: null, manual: null },
  ajustes: {},                                 // contrato, decreto633, divisas, art, antigüedad, vacaciones (vacío = parámetros)
  defaults: { a: {}, dias: { navegado: 30 }, extras: {} },
  lineas: [],
  managementFee: 0,
});

export const posicionNueva = (categoria = 'capitan-ultramar') => ({
  id: crypto.randomUUID(), categoria, nota: '', cantidad: 1, a: {}, dias: {}, extras: {}, antiguedadAnios: '', vacacionesDias: '',
});

const definido = (v) => v !== undefined && v !== null && v !== '';

/** Línea efectiva: lo propio de la posición o, si no tiene, lo común del proyecto. */
export function lineaEfectiva(p, linea) {
  const a = {}, dias = {};
  for (const { k } of ADICIONALES) a[k] = Number(definido(linea.a?.[k]) ? linea.a[k] : p.defaults?.a?.[k] ?? 0) || 0;
  for (const { k } of DIAS) dias[k] = Number(definido(linea.dias?.[k]) ? linea.dias[k] : p.defaults?.dias?.[k] ?? 0) || 0;
  const ex = {};
  for (const { k } of EXTRAS) ex[k] = definido(linea.extras?.[k]) ? !!linea.extras[k] : !!p.defaults?.extras?.[k];
  return { ...linea, ...ex, regimen: p.regimen, a, dias };
}

/** Escala, parámetros, divisas y tipo de cambio que corresponden a un mes y una elección de TC. */
export function contextoCalculo(datos, mes = hoyMes(), tc = {}) {
  const finMes = `${mes}-31`;
  const parametros = vigente(datos.parametros, finMes);
  const divisasFila = vigente(datos.divisas, finMes);
  const activos = datos.overrides.filter((o) => o.activo);
  const basicos = basicosVigentes({ categorias: datos.categorias, basicos: datos.basicos, actas: datos.actas, overrides: activos, mes });
  const fx = tc.tipo === 'manual' ? Number(tc.manual) || 0 : Number(tc.valores?.[tc.tipo]) || 0;
  return { mes, parametros, valores: parametros?.valores ?? {}, divisasFila, divisas: divisasFila?.valores ?? {}, basicos, fx, tc };
}

/** Calcula todas las posiciones del proyecto. */
export function calcularProyecto(datos, p) {
  const c = contextoCalculo(datos, p.mes || hoyMes(), p.tc);
  const g = c.valores.globales ?? {};
  const params = paramsCalculo(c.valores, p.regimen, p.ajustes);
  const lineas = p.lineas.map((linea0) => {
    const linea = lineaEfectiva(p, linea0);
    const pl = paramsCalculo(c.valores, p.regimen, p.ajustes);
    const div = c.divisas?.[linea.categoria]?.[pl.divisas === 'no_limitrofe' ? 'no_limitrofe' : 'limitrofe'] ?? 0;
    const basico = c.basicos[linea.categoria]?.monto ?? 0;
    let r = null;
    try { r = lineaCrewing({ linea, basico, p: pl, g, fx: c.fx, divisaDia: Number(div) || 0 }); } catch { /* datos incompletos */ }
    return { linea, original: linea0, r, basico, escala: c.basicos[linea.categoria], divisaDia: Number(div) || 0 };
  }).filter((x) => x.r);
  const resumen = resumenCrewing(lineas, g);
  const navegadoDiaArs = lineas.reduce((s, x) => s + x.r.unitarioDia.navegado * (Number(x.linea.cantidad) || 0), 0);
  return { c, params, g, lineas, resumen, navegadoDiaArs, navegadoDiaUsd: c.fx ? navegadoDiaArs / c.fx : 0 };
}
