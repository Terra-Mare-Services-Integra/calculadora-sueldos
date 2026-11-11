// Proyecto (cotización de una tripulación): régimen, configuración, adicionales y días comunes, y posiciones
// que heredan lo común salvo que se cambie en la posición. Se guarda en cs_crewing.datos.
import { basicosVigentes, vigente, hoyMes } from './escalas.js';
import { lineaCrewing, resumenCrewing } from './calculo.js';
import { paramsCalculo } from './parametros.js';
import { CATEGORIA, DEPARTAMENTOS } from './categorias.js';

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
  { k: 'ordenes15', label: 'A las órdenes 0-15' }, { k: 'ordenes90', label: 'A las órdenes 16-90' },
];
export const EXTRAS = [
  { k: 'lavanderia', label: 'Lavandería' }, { k: 'trasladoPuerto', label: 'Traslado a puerto' },
  { k: 'trasladoDomestico', label: 'Traslado doméstico' }, { k: 'hospedaje', label: 'Hospedaje' }, { k: 'epp', label: 'EPP' },
];

export const CASILLEROS = [
  { k: 'rj', label: 'Como la RJ: % sobre el básico' },
  { k: 'supply', label: 'Como el supply: % sobre básico + RJ' },
  { k: 'locacion', label: 'Como la locación: % sobre básico + RJ + supply' },
  { k: 'acta', label: 'Como el Acta 04-08-22: % sobre el bruto' },
];
// Régimen y precio del franco no son adicionales del catálogo: se eligen en cada posición.
export const FRANCOS = [
  { k: 'regimenFranco', label: 'Régimen de franco' },
  { k: 'precioFranco', label: 'Precio del franco' },
];

export const proyectoNuevo = ({ nombre, cliente = '', regimen, adicionales = [] }) => ({
  nombre, cliente, regimen, notas: '', adicionales,
  mes: null,                                   // null = mes actual (última escala vigente)
  tc: { tipo: 'divisa_venta', fecha: null, valores: null, manual: null },
  ajustes: {},                                 // contrato, decreto633, divisas, art, antigüedad, vacaciones (vacío = parámetros)
  defaults: { dias: { navegado: 30 }, extras: {} },
  lineas: [],
  managementFee: 0,
});

export const posicionNueva = (categoria = 'capitan-ultramar') => ({
  id: crypto.randomUUID(), categoria, nota: '', cantidad: 1, a: {}, dias: {}, extras: {}, antiguedadAnios: '', vacacionesDias: '',
});

const definido = (v) => v !== undefined && v !== null && v !== '';

/** Adicionales para una posición nueva: los de la última posición del mismo puesto, si hay (si no, van los predefinidos). */
export function adicionalesSugeridos(p, categoria) {
  const previa = [...p.lineas].reverse().find((l) => l.categoria === categoria);
  return previa ? { ...previa.a } : {};
}

/** Opción con que arranca un adicional en una posición: la marcada para su grupo o la predeterminada. */
export function opcionInicial(adicional, categoria, grupoDe) {
  const g = grupoDe(categoria);
  const ops = adicional.opciones ?? [];
  let i = ops.findIndex((o) => (o.grupos ?? []).includes(g));
  if (i < 0) i = Math.min(Math.max(adicional.predeterminada ?? 0, 0), ops.length - 1);
  return i >= 0 ? { i, valor: Number(ops[i].valor) || 0 } : { i: null, valor: 0 };
}

/** Valores iniciales de todos los adicionales del proyecto para una posición nueva. */
export function adicionalesIniciales(catalogo, ids, categoria, grupoDe) {
  return Object.fromEntries(ids.map((id) => catalogo.find((c) => c.id === id)).filter(Boolean)
    .map((c) => [c.id, opcionInicial(c, categoria, grupoDe)]));
}

/** Pasa un proyecto de la versión con 6 adicionales fijos (l.a.rj, supply…) al catálogo. */
export function migrarACatalogo(p, catalogo) {
  if (Array.isArray(p.adicionales) || !catalogo?.length) return p;
  const principal = Object.fromEntries(['rj', 'supply', 'locacion', 'acta'].map((k) => [k,
    [...catalogo].filter((c) => c.activo && c.casillero === k).sort((a, b) => (b.por_defecto - a.por_defecto) || (a.orden - b.orden))[0]]));
  const ids = new Set(catalogo.filter((c) => c.activo && c.por_defecto).map((c) => c.id));
  const lineas = p.lineas.map((l) => {
    const ad = {};
    for (const k of ['rj', 'supply', 'locacion', 'acta']) {
      const c = principal[k];
      const v = Number(l.a?.[k]) || 0;
      if (!c) continue;
      if (v) ids.add(c.id);
      const i = (c.opciones ?? []).findIndex((o) => Math.abs(Number(o.valor) - v) < 1e-9);
      ad[c.id] = { i: i >= 0 ? i : null, valor: v };
    }
    return { ...l, ad, a: { regimenFranco: l.a?.regimenFranco, precioFranco: l.a?.precioFranco } };
  });
  return { ...p, adicionales: [...ids], lineas };
}

/** Proyectos guardados con adicionales comunes (versión anterior): se pasan a cada posición. */
export function migrarProyecto(p) {
  const comunes = p.defaults?.a;
  if (!comunes || !Object.keys(comunes).length) return p;
  const lineas = p.lineas.map((l) => {
    const a = { ...l.a };
    for (const [k, v] of Object.entries(comunes)) if (a[k] === undefined && v !== undefined) a[k] = v;
    return { ...l, a };
  });
  const { a, ...defaults } = p.defaults;
  return { ...p, lineas, defaults };
}

/** Línea efectiva: lo propio de la posición o, si no tiene, lo común del proyecto. */
export function lineaEfectiva(p, linea, catalogo = []) {
  const a = { rj: 0, supply: 0, locacion: 0, acta: 0 }, dias = {};
  if (Array.isArray(p.adicionales)) {
    // Suma por casillero de los adicionales elegidos en el proyecto.
    for (const id of p.adicionales) {
      const c = catalogo.find((x) => x.id === id);
      if (!c || a[c.casillero] === undefined) continue;
      // Sin elección todavía: vale la opción preseleccionada.
      const sel = linea.ad?.[id] ?? opcionInicial(c, linea.categoria, (k) => CATEGORIA[k]?.grupo);
      a[c.casillero] += Number(sel.valor) || 0;
    }
  } else {
    for (const k of Object.keys(a)) a[k] = Number(linea.a?.[k] ?? 0) || 0;
  }
  for (const { k } of FRANCOS) a[k] = Number(linea.a?.[k] ?? 0) || 0;
  for (const { k } of DIAS) dias[k] = Number(definido(linea.dias?.[k]) ? linea.dias[k] : p.defaults?.dias?.[k] ?? 0) || 0;
  dias.divisas = 0; // las divisas no se usan en los proyectos
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
    const linea = lineaEfectiva(p, linea0, datos.adicionales ?? []);
    const pl = paramsCalculo(c.valores, p.regimen, p.ajustes);
    const div = c.divisas?.[linea.categoria]?.[pl.divisas === 'no_limitrofe' ? 'no_limitrofe' : 'limitrofe'] ?? 0;
    const basico = c.basicos[linea.categoria]?.monto ?? 0;
    let r = null;
    try { r = lineaCrewing({ linea, basico, p: pl, g, fx: c.fx, divisaDia: Number(div) || 0 }); } catch { /* datos incompletos */ }
    return { linea, original: linea0, r, basico, escala: c.basicos[linea.categoria], divisaDia: Number(div) || 0 };
  }).filter((x) => x.r);
  // Cubierta, máquinas y cocina, respetando el orden dentro de cada bloque.
  const orden = (x) => DEPARTAMENTOS.findIndex((d) => d.clave === CATEGORIA[x.linea.categoria]?.depto);
  lineas.sort((a, b) => orden(a) - orden(b));
  const resumen = resumenCrewing(lineas, g);
  const navegadoDiaArs = lineas.reduce((s, x) => s + x.r.unitarioDia.navegado * (Number(x.linea.cantidad) || 0), 0);
  return { c, params, g, lineas, resumen, catalogo: datos.adicionales ?? [], navegadoDiaArs, navegadoDiaUsd: c.fx ? navegadoDiaArs / c.fx : 0 };
}
