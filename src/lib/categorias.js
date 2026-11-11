// Categorías del personal embarcado, en el orden de las planillas de liquidación.
// grupo: 'cubierta' (capitán y oficiales de cubierta), 'maquinas' (jefe y oficiales de máquina),
//        'subalterno' (electricista … engrasador), 'pilotaje' (escala de pilotaje, monto mensual cerrado)
//        y 'car' (escala CAR).
// Solo nombres y reglas: los montos y coeficientes viven en la base (cs_categorias / cs_basicos).
export const CATEGORIAS = [
  { clave: 'capitan-ultramar', nombre: 'Capitán de Ultramar', depto: 'cubierta', grupo: 'cubierta', ingles: 'Master' },
  { clave: '1-of-cubierta', nombre: '1er Oficial de Cubierta', depto: 'cubierta', grupo: 'cubierta', ingles: 'Chief Officer' },
  { clave: '2-of-cubierta', nombre: '2do Oficial de Cubierta', depto: 'cubierta', grupo: 'cubierta', ingles: 'Second Officer' },
  { clave: '3-of-cubierta', nombre: '3er Oficial de Cubierta', depto: 'cubierta', grupo: 'cubierta', ingles: 'Third Officer' },
  { clave: 'jefe-maquina', nombre: 'Jefe de Máquina', depto: 'maquinas', grupo: 'maquinas', ingles: 'Chief Engineer' },
  { clave: '1-of-maquina', nombre: '1er Oficial de Máquina', depto: 'maquinas', grupo: 'maquinas', ingles: '2nd Engineer' },
  { clave: '2-of-maquina', nombre: '2do Oficial de Máquina', depto: 'maquinas', grupo: 'maquinas', ingles: '3rd Engineer' },
  { clave: '3-of-maquina', nombre: '3er Oficial de Máquina', depto: 'maquinas', grupo: 'maquinas', ingles: '4th Engineer' },
  { clave: 'electricista', nombre: 'Electricista', depto: 'maquinas', grupo: 'subalterno', ingles: 'Electrician' },
  { clave: '1-bombero', nombre: '1er Bombero', depto: 'maquinas', grupo: 'subalterno', ingles: 'Pumpman' },
  { clave: '2-bombero', nombre: '2do Bombero', depto: 'maquinas', grupo: 'subalterno', ingles: '2nd Pumpman' },
  { clave: 'contramaestre', nombre: 'Contramaestre', depto: 'cubierta', grupo: 'subalterno', ingles: 'Bosun' },
  { clave: 'marinero', nombre: 'Marinero', depto: 'cubierta', grupo: 'subalterno', ingles: 'AB' },
  { clave: 'cocinero', nombre: 'Cocinero', depto: 'cocina', grupo: 'subalterno', ingles: '1st Cook' },
  { clave: '2-cocinero', nombre: '2do Cocinero', depto: 'cocina', grupo: 'subalterno', ingles: '2nd Cook' },
  { clave: 'ayudante-cocina', nombre: 'Ayudante de Cocina', depto: 'cocina', grupo: 'subalterno', ingles: 'Assistant Cook' },
  { clave: '1-mozo', nombre: '1er Mozo', depto: 'cocina', grupo: 'subalterno', ingles: '1st Messman' },
  { clave: '2-mozo', nombre: '2do Mozo', depto: 'cocina', grupo: 'subalterno', ingles: '2nd Messman' },
  { clave: 'mecanico', nombre: 'Mecánico', depto: 'maquinas', grupo: 'subalterno', ingles: 'Mechanic' },
  { clave: '1-cabo', nombre: '1er Cabo', depto: 'cubierta', grupo: 'subalterno', ingles: 'Able Seafarer Deck' },
  { clave: 'enfermero', nombre: 'Enfermero', depto: 'cocina', grupo: 'subalterno', ingles: 'Nurse' },
  { clave: 'aux-maquina', nombre: 'Auxiliar de Máquina', depto: 'maquinas', grupo: 'subalterno', ingles: 'Wiper' },
  { clave: 'engrasador', nombre: 'Engrasador', depto: 'maquinas', grupo: 'subalterno', ingles: 'Oiler' },
  { clave: 'capitan-pilotaje', nombre: 'Capitán Pilotaje', depto: 'cubierta', grupo: 'pilotaje', ingles: 'Pilot Master' },
  { clave: '1-of-cubierta-pilotaje', nombre: '1er Oficial de Cubierta Pilotaje', depto: 'cubierta', grupo: 'pilotaje', ingles: 'Pilot Chief Officer' },
  { clave: '2-of-cubierta-pilotaje', nombre: '2do Oficial de Cubierta Pilotaje', depto: 'cubierta', grupo: 'pilotaje', ingles: 'Pilot Second Officer' },
  { clave: 'car-capitan', nombre: 'CAR - Capitán', depto: 'cubierta', grupo: 'car', ingles: 'Master (CAR)' },
  { clave: 'car-jefe-maquina', nombre: 'CAR - Jefe de Máquina', depto: 'maquinas', grupo: 'car', ingles: 'Chief Engineer (CAR)' },
  { clave: 'car-contramaestre', nombre: 'CAR - Contramaestre', depto: 'cubierta', grupo: 'car', ingles: 'Bosun (CAR)' },
  { clave: 'car-marinero', nombre: 'CAR - Marinero', depto: 'cubierta', grupo: 'car', ingles: 'AB (CAR)' },
  // Categorías del acta que las planillas no usan todavía (se cargan igual para tenerlas a mano).
  { clave: 'capitan-fluvial', nombre: 'Capitán Fluvial', depto: 'cubierta', grupo: 'cubierta', ingles: 'River Master', extra: true },
  { clave: '1-of-fluvial', nombre: '1er Oficial Fluvial', depto: 'cubierta', grupo: 'cubierta', ingles: 'River Chief Officer', extra: true },
  { clave: '2-of-fluvial', nombre: '2do Oficial Fluvial', depto: 'cubierta', grupo: 'cubierta', ingles: 'River Second Officer', extra: true },
  { clave: '3-of-fluvial', nombre: '3er Oficial Fluvial', depto: 'cubierta', grupo: 'cubierta', ingles: 'River Third Officer', extra: true },
  { clave: 'baquiano', nombre: 'Baquiano', depto: 'cubierta', grupo: 'cubierta', ingles: 'River Pilot', extra: true },
];

// Bloques de la tripulación (departamento a bordo).
export const DEPARTAMENTOS = [
  { clave: 'cubierta', nombre: 'Cubierta', detalle: 'Capitán, oficiales, contramaestre, cabos y marineros' },
  { clave: 'maquinas', nombre: 'Máquinas', detalle: 'Jefe y oficiales de máquina, electricista, bomberos, mecánico y engrasadores' },
  { clave: 'cocina', nombre: 'Cocina', detalle: 'Cocineros, ayudantes, mozos y enfermería' },
];

export const CATEGORIA = Object.fromEntries(CATEGORIAS.map((c) => [c.clave, c]));
export const CATEGORIAS_LIQUIDACION = CATEGORIAS.filter((c) => !c.extra);

export const REGIMENES = [
  { clave: 'terramare', nombre: 'Terra Mare', detalle: 'Personal para un tercero' },
  { clave: 'eventuales', nombre: 'Eventuales', detalle: 'Internos no efectivos' },
  { clave: 'efectivos', nombre: 'Efectivos', detalle: 'Personal efectivo propio' },
];
export const REGIMEN = Object.fromEntries(REGIMENES.map((r) => [r.clave, r]));
