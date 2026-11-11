// Pruebas públicas con números inventados (no son valores reales de ninguna escala).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { navegado, integracion, ordenesHasta15, ordenes16a90, pctAntiguedad, lineaCrewing } from '../src/lib/calculo.js';
import { basicosVigentes, vigente, meses } from '../src/lib/escalas.js';

const P = {
  contrato: 'TERCERO', decreto633: true, art: 0.01, cargas: 0.1, estabilidad: 0.05, sac: 0.1,
  seguroVida: 7, fondoEnfermedades: 3, cuotaCubierta: 0.03, cuotaGeneral: 0.02, iibb: 0.01, creditoDebito: 0.005,
  tasaDecreto633: 0.01, divisorVacaciones: 20, divisorFeriados: 20, divisorFeriadosSubalterno: 40, feriados: 12,
  diasMes: 30, factorOrdenes: 0.8, antiguedad: [{ hasta: 3, pct: 0.01 }, { pct: 0.03 }], antiguedadAnios: 0, vacacionesDias: 10,
};
const cerca = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg ?? ''} ${a} ≠ ${b}`);

test('antigüedad por tramos', () => {
  assert.equal(pctAntiguedad(0, P.antiguedad), 0);
  assert.equal(pctAntiguedad(3, P.antiguedad), 0.01);
  assert.equal(pctAntiguedad(4, P.antiguedad), 0.03);
});

test('pilotaje: mensual cerrado, sin SAC ni adicionales', () => {
  const r = navegado({ regimen: 'terramare', categoria: 'capitan-pilotaje', basico: 1000, p: P, a: { rj: 1, supply: 1, locacion: 1, acta: 1, regimenFranco: 1, precioFranco: 1 }, fx: 2 });
  const bruto = 1000 + 1000 * 0.11 + 10 + 1000 * 0.02 + 1000 * 0.01;
  cerca(r.costoBruto, bruto);
  cerca(r.mensual, bruto * 1.015);
  cerca(r.diarioUsd, (bruto * 1.015) / 30 / 2);
  assert.equal(integracion({ regimen: 'terramare', categoria: 'capitan-pilotaje', basico: 1000, p: P }).mensual, 0);
});

test('cubierta no cobra feriados; máquinas sí', () => {
  const cub = navegado({ regimen: 'terramare', categoria: 'capitan-ultramar', basico: 1000, p: P });
  const maq = navegado({ regimen: 'terramare', categoria: 'jefe-maquina', basico: 1000, p: P });
  assert.equal(cub.feriados, 0);
  cerca(maq.feriados, (1000 / 20) * 12 / 12);
});

test('navegado de Terra Mare paso a paso', () => {
  const a = { rj: 0.5, supply: 0.2, locacion: 0.1, acta: 0.3, regimenFranco: 0.5, precioFranco: 0.5 };
  const p = { ...P, antiguedadAnios: 2 };
  const r = navegado({ regimen: 'terramare', categoria: 'marinero', basico: 100, p, a });
  const conf = 100 * 1.5 * 1.2 * 1.1;
  cerca(r.rj, 50); cerca(r.supply, 30); cerca(r.locacion, 18);
  cerca(r.feriados, (conf / 20) * 12 / 12);
  cerca(r.acta, (100 + 50 + 30 + 18 + r.feriados) * 0.3);
  cerca(r.antiguedad, 150 * 2 * 0.01);
  cerca(r.licencia, (conf / 20) * 10 / 12);
  cerca(r.francos, (conf / 30) * (30 + 1) * 0.25);
  cerca(r.sac, (r.subtotalA + r.licencia + r.francos) * 0.1);
  cerca(r.estabilidad, r.subtotalB * 0.05);
  cerca(r.cuotaSindical, (r.subtotalA + r.sac) * 0.02);
});

test('diferencias de Eventuales y Efectivos', () => {
  const a = { rj: 0.5, supply: 0.2, locacion: 0.1, acta: 0.3, regimenFranco: 0.5, precioFranco: 0.5 };
  const ev = navegado({ regimen: 'eventuales', categoria: 'capitan-ultramar', basico: 100, p: P, a });
  cerca(ev.sac, (ev.subtotalA + ev.licencia) * 0.1, 'SAC sin francos');
  cerca(ev.cargas, (ev.final - ev.licencia - ev.francos) * 0.11 + 10, 'cargas sin lic. ni francos');
  const evSub = navegado({ regimen: 'eventuales', categoria: 'marinero', basico: 100, p: P, a });
  cerca(evSub.acta, (100 + 50 + 30 + 18) * 0.3, 'acta sin feriados');
  const ef = navegado({ regimen: 'efectivos', categoria: 'marinero', basico: 100, p: { ...P, contrato: 'BARCO PROPIO' }, a });
  cerca(ef.estabilidad, ef.subtotalA * 0.05);
  assert.equal(ef.iibb, 0);
  const o90 = ordenes16a90({ regimen: 'eventuales', categoria: 'marinero', basico: 100, p: P, a });
  cerca(o90.basico, 100 * 1.5 * 1.3 * 0.8, 'aditivo');
  const o15 = ordenesHasta15({ regimen: 'terramare', categoria: 'marinero', basico: 100, p: P, a });
  cerca(o15.basico, 100 * 1.2 * 1.1);
  assert.equal(integracion({ regimen: 'efectivos', categoria: 'marinero', basico: 100, p: P }).mensual, 0);
});

test('línea de Crewing: cantidad, días y extras', () => {
  const g = { viveresDia: 1, trasladoPuerto: 10, lavanderia: 5, trasladoDomestico: 2, hospedaje: 3, epp: 4 };
  const linea = { regimen: 'terramare', categoria: 'marinero', cantidad: 2, lavanderia: true, trasladoPuerto: true, epp: true,
    dias: { navegado: 10, divisas: 10 } };
  const r = lineaCrewing({ linea, basico: 100, p: P, g, fx: 2, divisaDia: 1.5 });
  cerca(r.unitarioDia.navegado, (r.liq.navegado.mensual + 5 * 2) / 30);
  cerca(r.usd.sueldos, (2 * r.unitarioDia.navegado * 10) / 2);
  assert.equal(r.usd.trasladoPuerto, 40);
  assert.equal(r.usd.lavanderia, 10);
  assert.equal(r.usd.epp, 8);
  assert.equal(r.usd.divisas, 30);
});

test('básicos: última vigente, provisoria, coeficiente y override', () => {
  const actas = [{ id: 'a1', nombre: 'Acta 1', firmada_el: '2030-02-10' }, { id: 'a2', nombre: 'Acta 2', firmada_el: '2030-05-10' }];
  const basicos = [
    { categoria: 'jefe-maquina', mes: '2030-01-01', monto: 100, acta_id: 'a1' },
    { categoria: 'jefe-maquina', mes: '2030-02-01', monto: 110, acta_id: 'a1' },
    { categoria: 'jefe-maquina', mes: '2030-02-01', monto: 115, acta_id: 'a2' }, // acta posterior corrige febrero
    { categoria: 'jefe-maquina', mes: '2030-04-01', monto: 130, acta_id: 'a2' },
  ];
  const categorias = [{ clave: 'jefe-maquina', forma: 'monto' }, { clave: 'enfermero', forma: 'coef', base: 'jefe-maquina', coef: 0.5 }];
  let v = basicosVigentes({ categorias, basicos, actas, mes: '2030-02' });
  assert.equal(v['jefe-maquina'].monto, 115);
  assert.equal(v['jefe-maquina'].provisoria, false);
  assert.equal(v.enfermero.monto, 57.5);
  v = basicosVigentes({ categorias, basicos, actas, mes: '2030-03' });
  assert.equal(v['jefe-maquina'].monto, 115);
  assert.equal(v['jefe-maquina'].provisoria, true);
  v = basicosVigentes({ categorias, basicos, actas, mes: '2030-04', overrides: [{ categoria: 'jefe-maquina', monto: 200, desde: '2030-04-01' }] });
  assert.equal(v['jefe-maquina'].monto, 200);
  assert.equal(v['jefe-maquina'].montoActa, 130);
  assert.equal(v.enfermero.monto, 100);
});

test('tabla versionada y meses', () => {
  const f = [{ vigente_desde: '2030-01-01', v: 1 }, { vigente_desde: '2030-06-01', v: 2 }];
  assert.equal(vigente(f, '2030-05-31').v, 1);
  assert.equal(vigente(f, '2030-06-01').v, 2);
  assert.equal(vigente(f, '2029-12-31'), null);
  assert.deepEqual(meses('2030-11', '2031-02'), ['2030-11', '2030-12', '2031-01', '2031-02']);
});
