// Motor de liquidación: replica las planillas TERRAMARE, EVENTUALES y EFECTIVOS del Cotizador V22.
// Funciones puras y sin valores: básicos, tasas y montos llegan por parámetro (viven en la base).
import { CATEGORIA } from './categorias.js';

/*
 Parámetros por régimen (p):
  contrato 'TERCERO' | 'BARCO PROPIO'  → con TERCERO se cobran Ingresos Brutos y créd./déb.
  decreto633 boolean                   → aporte del Decreto 633/2018
  art, cargas, estabilidad, sac, seguroVida, fondoEnfermedades, cuotaCubierta, cuotaGeneral,
  iibb, creditoDebito, tasaDecreto633, divisorVacaciones, divisorFeriados, divisorFeriadosSubalterno,
  feriados (días/año), diasMes, factorOrdenes (16 a 90 días y efectivos a las órdenes),
  antiguedad: [{ hasta: años, pct }] (el último sin 'hasta'), antiguedadAnios, vacacionesDias.
 Adicionales del puesto (a): rj (Resp. jerárquica / plus operativo), supply, locacion, acta (Acta 04-08-22),
  regimenFranco, precioFranco. Todos como fracción (0,84 = 84 %).
*/

export const ADICIONALES_VACIOS = { rj: 0, supply: 0, locacion: 0, acta: 0, regimenFranco: 0, precioFranco: 0 };

export function pctAntiguedad(anios, tramos = []) {
  if (!anios) return 0;
  for (const t of tramos) if (t.hasta == null || anios <= t.hasta) return t.pct;
  return 0;
}

const suma = (...xs) => xs.reduce((s, x) => s + (x || 0), 0);

// Impuestos sobre el costo laboral y pase a mensual / diario / USD.
function cierre(base, p, fx) {
  const tercero = p.contrato === 'TERCERO';
  const iibb = tercero ? p.iibb * base : 0;
  const creditoDebito = tercero ? p.creditoDebito * base : 0;
  const mensual = base + iibb + creditoDebito;
  const diario = mensual / p.diasMes;
  return { iibb, creditoDebito, mensual, diario, diarioUsd: fx ? diario / fx : null };
}

const cuotaDe = (grupo, p) => (grupo === 'cubierta' ? p.cuotaCubierta : p.cuotaGeneral);
const tasa633 = (p) => (p.decreto633 ? p.tasaDecreto633 : 0);

/**
 * Navegado (costo mensual a bordo) de una categoría.
 * @param {string} regimen 'terramare' | 'eventuales' | 'efectivos'
 */
export function navegado({ regimen, categoria, basico, p, a = ADICIONALES_VACIOS, fx }) {
  const grupo = CATEGORIA[categoria].grupo;
  const pil = grupo === 'pilotaje';
  const sub = grupo === 'subalterno';
  const B = basico;
  const anios = p.antiguedadAnios, vac = p.vacacionesDias;

  const conformado = B * (1 + a.rj) * (1 + a.supply) * (1 + a.locacion);
  // Pilotaje: el básico es un mensual cerrado (sin adicionales, SAC, vacaciones ni estabilidad).
  const rj = pil ? 0 : a.rj * B;
  const supply = pil ? 0 : a.supply * (B + rj);
  const locacion = pil ? 0 : a.locacion * (B + rj + supply);
  // Capitanes y oficiales de cubierta no cobran feriados (tampoco pilotaje).
  const divFer = regimen === 'eventuales' && (sub || pil) ? p.divisorFeriadosSubalterno : p.divisorFeriados;
  const feriados = grupo === 'cubierta' || pil ? 0 : (conformado / divFer) * p.feriados / 12;
  // En Eventuales y Efectivos el adicional del acta de los subalternos no se calcula sobre feriados.
  const baseActa = regimen !== 'terramare' && (sub || pil) ? B + rj + supply + locacion : B + rj + supply + locacion + feriados;
  const acta = pil ? 0 : baseActa * a.acta;
  const antiguedad = pil ? 0 : (B + rj) * anios * pctAntiguedad(anios, p.antiguedad);
  const subtotalA = suma(B, rj, supply, locacion, feriados, acta, antiguedad);

  const licencia = pil ? 0 : (conformado / p.divisorVacaciones) * vac / 12;
  const francosMes = p.diasMes + p.feriados / 12;
  const francos = pil ? 0 : (conformado / p.diasMes) * francosMes * a.precioFranco * a.regimenFranco;
  // Eventuales: el SAC de capitanes y oficiales de cubierta no incluye francos.
  const baseSac = regimen === 'eventuales' && grupo === 'cubierta' ? subtotalA + licencia : subtotalA + licencia + francos;
  const sac = pil ? 0 : baseSac * p.sac;
  const subtotalB = subtotalA + licencia + francos + sac;
  const estabilidad = pil ? 0 : p.estabilidad * (regimen === 'efectivos' ? subtotalA : subtotalB);
  const final = subtotalB + estabilidad;

  // Eventuales: cargas sociales sin licencia anual ni francos.
  const baseCargas = regimen === 'eventuales' ? final - licencia - francos : final;
  const cargas = baseCargas * (p.cargas + p.art) + p.seguroVida + p.fondoEnfermedades;
  const cuotaSindical = (regimen === 'efectivos' ? final : subtotalA + sac) * cuotaDe(grupo, p);
  const decreto633 = final * tasa633(p);
  const costoBruto = final + cargas + cuotaSindical + decreto633;

  return {
    conformado, basico: B, rj, supply, locacion, feriados, acta, antiguedad, subtotalA,
    licencia, francos, sac, subtotalB, estabilidad, final,
    cargas, cuotaSindical, decreto633, costoBruto, ...cierre(costoBruto, p, fx),
  };
}

// Integración de contrato y "a las órdenes" de Terra Mare y Eventuales: básico + SAC con cargas.
function corto(base, grupo, p, fx) {
  const sac = base * p.sac;
  const subtotalA = base + sac;
  const cargas = subtotalA * (p.cargas + p.art) + p.seguroVida + p.fondoEnfermedades;
  const cuotaSindical = subtotalA * cuotaDe(grupo, p);
  const decreto633 = subtotalA * tasa633(p);
  const costoBruto = subtotalA + cargas + cuotaSindical + decreto633;
  return { basico: base, sac, subtotalA, cargas, cuotaSindical, decreto633, costoBruto, ...cierre(costoBruto, p, fx) };
}

const CERO = { basico: 0, mensual: 0, diario: 0, diarioUsd: 0 };

export function integracion({ regimen, categoria, basico, p, a = ADICIONALES_VACIOS, fx }) {
  const grupo = CATEGORIA[categoria].grupo;
  // Efectivos no tiene integración de contrato; pilotaje no se liquida fuera de navegación.
  if (regimen === 'efectivos' || grupo === 'pilotaje') return { ...CERO };
  return corto(basico * (1 + a.rj) * (1 + a.supply) * (1 + a.locacion), grupo, p, fx);
}

export function ordenesHasta15({ regimen, categoria, basico, p, a = ADICIONALES_VACIOS, fx }) {
  const grupo = CATEGORIA[categoria].grupo;
  if (grupo === 'pilotaje') return { ...CERO };
  if (regimen === 'efectivos') return ordenesEfectivos({ categoria, basico, p, a, fx });
  return corto(basico * (1 + a.supply) * (1 + a.locacion), grupo, p, fx);
}

export function ordenes16a90({ regimen, categoria, basico, p, a = ADICIONALES_VACIOS, fx }) {
  const grupo = CATEGORIA[categoria].grupo;
  if (grupo === 'pilotaje') return { ...CERO };
  if (regimen === 'efectivos') return ordenesEfectivos({ categoria, basico, p, a, fx });
  // Eventuales: en subalternos y CAR supply y locación se suman en vez de multiplicarse.
  const aditivo = regimen === 'eventuales' && (grupo === 'subalterno' || grupo === 'car');
  const recargo = aditivo ? 1 + a.supply + a.locacion : (1 + a.supply) * (1 + a.locacion);
  return corto(basico * (1 + a.rj) * recargo * p.factorOrdenes, grupo, p, fx);
}

// Efectivos a las órdenes: liquidación completa sobre el básico reducido (factorOrdenes).
export function ordenesEfectivos({ categoria, basico, p, a = ADICIONALES_VACIOS, fx }) {
  const grupo = CATEGORIA[categoria].grupo;
  if (grupo === 'pilotaje') return { ...CERO };
  const sub = grupo === 'subalterno';
  const B = basico * p.factorOrdenes;
  const anios = p.antiguedadAnios;
  const conformado = sub ? B * (1 + a.rj) * (1 + a.supply + a.locacion) : B * (1 + a.rj) * (1 + a.supply) * (1 + a.locacion);
  const rj = a.rj * B;
  const supply = a.supply * (B + rj);
  const locacion = a.locacion * (sub ? B + rj : B + rj + supply);
  const antiguedad = ((B + rj) * anios * pctAntiguedad(anios, p.antiguedad)) / p.factorOrdenes;
  const subtotalA = suma(B, rj, supply, locacion, antiguedad);
  const licencia = (conformado / p.divisorVacaciones) * p.vacacionesDias / 12;
  const sac = (subtotalA + licencia) * p.sac;
  const subtotalB = subtotalA + licencia + sac;
  const estabilidad = p.estabilidad * subtotalA;
  const final = subtotalB + estabilidad;
  // El Excel calculaba estas cargas sobre el final de navegado (celda fija); se corrigió a su propio final.
  const cargas = final * (p.cargas + p.art) + p.seguroVida + p.fondoEnfermedades;
  const cuotaSindical = final * cuotaDe(grupo, p);
  const decreto633 = final * tasa633(p);
  const costoBruto = final + cargas + cuotaSindical + decreto633;
  return {
    conformado, basico: B, rj, supply, locacion, antiguedad, subtotalA, licencia, sac, subtotalB,
    estabilidad, final, cargas, cuotaSindical, decreto633, costoBruto, ...cierre(costoBruto, p, fx),
  };
}

/** Las cuatro situaciones de una categoría. */
export function liquidar(args) {
  return {
    navegado: navegado(args),
    integracion: integracion(args),
    ordenes15: ordenesHasta15(args),
    ordenes90: ordenes16a90(args),
  };
}

/*
 Crewing: una línea por puesto.
 linea: { regimen, categoria, cantidad, a (adicionales), lavanderia, dias: { navegado, integracion, ordenes15, ordenes90, divisas },
          trasladoDomestico, trasladoPuerto, hospedaje, epp, antiguedadAnios?, vacacionesDias? }
 g (globales, USD): viveresDia, trasladoPuerto, lavanderia, trasladoDomestico, hospedaje, epp.
 divisaDia: USD por día del cargo según limítrofe / no limítrofe.
*/
export function lineaCrewing({ linea, basico, p, g, fx, divisaDia = 0 }) {
  const pl = { ...p };
  if (linea.antiguedadAnios != null && linea.antiguedadAnios !== '') pl.antiguedadAnios = Number(linea.antiguedadAnios);
  if (linea.vacacionesDias != null && linea.vacacionesDias !== '') pl.vacacionesDias = Number(linea.vacacionesDias);
  const args = { regimen: linea.regimen, categoria: linea.categoria, basico, p: pl, a: { ...ADICIONALES_VACIOS, ...linea.a }, fx };
  const liq = liquidar(args);
  const n = Number(linea.cantidad) || 0;
  const d = { navegado: 0, integracion: 0, ordenes15: 0, ordenes90: 0, divisas: 0, ...linea.dias };

  // Navegado: el Excel suma la lavandería (USD convertidos a ARS) al mensual y prorratea por 30.
  const lavanderiaArs = linea.lavanderia ? g.lavanderia * fx : 0;
  const navUnitDia = (liq.navegado.mensual + lavanderiaArs) / 30;
  const intUnitDia = liq.integracion.mensual / p.diasMes;
  const o15UnitDia = liq.ordenes15.mensual / p.diasMes;
  const o90UnitDia = liq.ordenes90.mensual / p.diasMes;

  const sueldosArs = n * (navUnitDia * d.navegado + intUnitDia * d.integracion + o15UnitDia * d.ordenes15 + o90UnitDia * d.ordenes90);
  const usd = {
    sueldos: fx ? sueldosArs / fx : 0,
    trasladoDomestico: linea.trasladoDomestico ? n * g.trasladoDomestico * 2 : 0,
    trasladoPuerto: linea.trasladoPuerto ? n * g.trasladoPuerto * 2 : 0,
    hospedaje: linea.hospedaje ? n * g.hospedaje * 2 : 0,
    lavanderia: linea.lavanderia ? n * g.lavanderia : 0,
    epp: linea.epp ? n * g.epp : 0,
    divisas: n * divisaDia * d.divisas,
  };
  usd.total = suma(...Object.values(usd));
  return { liq, unitarioDia: { navegado: navUnitDia, integracion: intUnitDia, ordenes15: o15UnitDia, ordenes90: o90UnitDia }, sueldosArs, usd };
}

/** Resumen de Crewing: totales USD y víveres. */
export function resumenCrewing(lineas, g) {
  const personas = lineas.reduce((s, l) => s + (Number(l.linea.cantidad) || 0), 0);
  const tot = {};
  for (const { r } of lineas) for (const [k, v] of Object.entries(r.usd)) tot[k] = (tot[k] || 0) + v;
  return { personas, usd: tot, viveresDia: personas * (g.viveresDia || 0) };
}

/** Posición diaria (formato Día_Ext): costo por día de navegación por puesto, en ARS y USD. */
export function posicionDia(lineas, fx, managementFee = 0) {
  const filas = lineas.map(({ linea, r }) => {
    const n = Number(linea.cantidad) || 0;
    return { linea, unitarioArs: r.unitarioDia.navegado, cantidad: n, totalArs: r.unitarioDia.navegado * n, totalUsd: fx ? (r.unitarioDia.navegado * n) / fx : 0 };
  });
  const crew = filas.reduce((s, f) => s + f.totalUsd, 0);
  return { filas, crewUsd: crew, managementFee, totalDia: crew + (Number(managementFee) || 0) };
}
