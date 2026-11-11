# Calculadora de sueldos · Terra Mare

Calculadora de costo de personal embarcado (convenios FENA / FESIMAF), migrada del "Cotizador" en Excel.

- **Log de cambios**: cada actualización de básicos, divisas, parámetros, overrides y lógica de cálculo, con quién, cuándo y desde qué fecha rige.
- **Calculadora Crewing**: tripulación por puesto y régimen, con adicionales, días por situación y costos extra; se guarda en la base.
- **Posición Día Ext.**: costo diario por puesto en ARS y USD más management fee.
- **Liquidación de sueldos**: las tres formas de liquidar (Terra Mare para un tercero, Eventuales y Efectivos), con navegado, integración de contrato y a las órdenes.
- **Básicos y divisas**: carga de actas paritarias mes a mes (incluidas las retroactivas), última escala vigente, overrides manuales registrados y divisas USD/día.
- **Tipo de cambio**: BNA divisa y billete, compra y venta, para la fecha elegida (BCRA como control), o un valor manual.

## Datos

Supabase de Terra Mare. Las tablas `cs_*`, la función `tipo-cambio` y las migraciones viven en el repo `loading-masters`
(`supabase/migrations/20261111120000_calculadora_sueldos.sql`, `supabase/functions/tipo-cambio`).
El acceso se da desde el panel de Administración del portal (`tm_accesos.modulos`: `sueldos` / `sueldos-edita`).

**Este repo es público: ningún valor real (básicos, tasas, montos) va en el código.** Viven en la base y se cargan desde la app.
Las pruebas públicas (`npm test`) usan números inventados. La verificación contra el Excel (`npm run test:excel`) corre solo en local,
desde `test/local/` (ignorado por git).

## Desarrollo

```bash
npm install
npm run dev     # http://localhost:5185 (requiere .env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY)
npm test
```
