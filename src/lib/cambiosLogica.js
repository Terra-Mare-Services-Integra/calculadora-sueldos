// Cambios de la LÓGICA de cálculo (el código). Cada versión nueva se agrega arriba y la app la registra
// sola en el Log de cambios la primera vez que entra un editor. Solo descripciones: nada de valores.
export const CAMBIOS_LOGICA = [
  {
    version: 'app-1.0',
    fecha: '2026-11-11',
    descripcion: 'Lógica migrada del Cotizador V22 (TERRAMARE, EVENTUALES, EFECTIVOS, Crewing y Posición Día_Ext) a la calculadora web.',
    detalle: [
      'Verificada contra el Excel recalculado: las 30 categorías de los tres regímenes, navegado, integración, a las órdenes 0-15 y 16-90 y Crewing.',
      'Básicos: se toman de las actas FENA/FESIMAF mes a mes (última vigente) en lugar de Jefe de Máquina × coeficiente; Enfermero, Aux. de Máquina y CAR siguen por coeficiente.',
      'Override manual de básicos con motivo, registrado en este log.',
      'Tipo de cambio por fecha: BNA divisa y billete, compra y venta (más BCRA de control), o valor manual.',
      'Corregido: Crewing de Eventuales y Efectivos buscaba "a las órdenes 16-90" en la fila de 0-15 y con la celda equivocada.',
      'Corregido: Crewing de Efectivos tomaba la integración de una fila vacía (los efectivos no tienen integración: queda en 0 a propósito).',
      'Corregido: en Eventuales, las columnas CAR tomaban ART, antigüedad y vacaciones de Terra Mare.',
      'Corregido: en Efectivos, "a las órdenes" de las categorías CAR usaba el básico del Jefe de Máquina.',
      'Corregido: en Efectivos, las cargas de "a las órdenes" se calculaban sobre el final de navegado.',
      'Corregido: traslados, hospedaje, EPP y divisas se multiplican por la cantidad de personas del puesto (el Excel los tomaba una vez por línea; traslado doméstico, hospedaje y EPP daban #REF!).',
      'Corregido: la fila 23 de Crewing no tenía las fórmulas de costos en USD.',
      'Se mantienen a propósito las diferencias por régimen y por puesto del Excel (feriados de cubierta, SAC sin francos de capitanes en Eventuales, cargas de Eventuales sin licencia ni francos, etc.).',
      'Crewing calcula cada línea con sus propios adicionales (el Excel tomaba los de la primera línea de esa categoría).',
    ],
  },
];
export const VERSION_LOGICA = CAMBIOS_LOGICA[0].version;
