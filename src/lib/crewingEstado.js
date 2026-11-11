import { useEffect, useState } from 'react';
import { lineaCrewing, resumenCrewing } from './calculo.js';
import { paramsCalculo } from './parametros.js';

const CLAVE = 'cs-crewing';
const EVENTO = 'cs-crewing-cambio';

export const lineaNueva = (regimen = 'terramare') => ({
  id: crypto.randomUUID(), regimen, categoria: 'capitan-ultramar', nota: '', cantidad: 1,
  a: { rj: 0, supply: 0, locacion: 0, acta: 0, regimenFranco: 0, precioFranco: 0 },
  lavanderia: false, trasladoDomestico: false, trasladoPuerto: false, hospedaje: false, epp: false,
  dias: { navegado: 0, integracion: 0, ordenes15: 0, ordenes90: 0, divisas: 0 },
  antiguedadAnios: '', vacacionesDias: '',
});
export const crewingVacio = () => ({ id: null, nombre: '', ajustes: { terramare: {}, eventuales: {}, efectivos: {} }, lineas: [], managementFee: 0 });

function leer() {
  try { return JSON.parse(localStorage.getItem(CLAVE)) ?? crewingVacio(); } catch { return crewingVacio(); }
}

/** Tripulación en edición, compartida entre Crewing, Posición Día Ext. y Liquidación (borrador local). */
export function useCrewing() {
  const [estado, setEstado] = useState(leer);
  useEffect(() => {
    const f = () => setEstado(leer());
    window.addEventListener(EVENTO, f);
    return () => window.removeEventListener(EVENTO, f);
  }, []);
  const guardar = (nuevo) => {
    const v = typeof nuevo === 'function' ? nuevo(leer()) : nuevo;
    try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch { /* sin almacenamiento */ }
    setEstado(v);
    window.dispatchEvent(new Event(EVENTO));
  };
  return [estado, guardar];
}

/** Calcula todas las líneas con la escala, parámetros, divisas y tipo de cambio del contexto. */
export function calcularCrewing(ctx, estado) {
  const g = ctx.valores.globales ?? {};
  const lineas = estado.lineas.map((linea) => {
    const p = paramsCalculo(ctx.valores, linea.regimen, estado.ajustes?.[linea.regimen]);
    const div = ctx.divisas?.[linea.categoria]?.[p.divisas === 'no_limitrofe' ? 'no_limitrofe' : 'limitrofe'] ?? 0;
    const basico = ctx.basicos[linea.categoria]?.monto ?? 0;
    let r;
    try { r = lineaCrewing({ linea, basico, p, g, fx: ctx.fx, divisaDia: Number(div) || 0 }); } catch { r = null; }
    return { linea, r, p, basico };
  }).filter((x) => x.r);
  return { lineas, resumen: resumenCrewing(lineas, g) };
}
