// Oferta comercial (Budgetary Offer · Crewing Services) armada con los números del proyecto.
// Textos por defecto en inglés, como la oferta modelo; todo se puede editar por proyecto (se guarda en p.oferta).

// Nombre del puesto en la oferta, capacidad en inglés y certificado STCW de referencia.
export const PUESTOS_OFERTA = {
  'capitan-ultramar': { es: 'CAPITÁN ULTRAMAR', en: 'Master', stcw: 'II/2' },
  '1-of-cubierta': { es: '1ER OF. DE CUBIERTA', en: 'Chief Mate', stcw: 'II/2' },
  '2-of-cubierta': { es: '2DO OF. DE CUBIERTA', en: 'Officer in Charge of Navigational Watch', stcw: 'II/1' },
  '3-of-cubierta': { es: '3ER OF. DE CUBIERTA', en: 'Officer in Charge of Navigational Watch', stcw: 'II/1' },
  contramaestre: { es: 'CONTRAMAESTRE', en: 'Rating (Navigational Watch)', stcw: 'II/4 or II/5' },
  marinero: { es: 'MARINERO', en: 'Rating (Navigational Watch)', stcw: 'II/4 or II/5' },
  'jefe-maquina': { es: 'JEFE DE MÁQUINA', en: 'Chief Engineer', stcw: 'III/2' },
  '1-of-maquina': { es: '1ER OF. DE MÁQUINA', en: 'Second Engineer', stcw: 'III/2' },
  '2-of-maquina': { es: '2DO OF. DE MÁQUINA', en: 'Officer in Charge of Engineering Watch', stcw: 'III/1' },
  '3-of-maquina': { es: '3ER OF. DE MÁQUINA', en: 'Officer in Charge of Engineering Watch', stcw: 'III/1' },
  electricista: { es: 'ELECTRICISTA', en: 'Electro-Technical Rating', stcw: 'III/7' },
  '1-bombero': { es: '1ER BOMBERO', en: 'Pumpman', stcw: 'III/4' },
  '2-bombero': { es: '2DO BOMBERO', en: 'Pumpman', stcw: 'III/4' },
  mecanico: { es: 'MECÁNICO', en: 'Mechanic', stcw: 'III/5' },
  '1-cabo': { es: '1ER CABO', en: 'Rating (Engine-room Watch)', stcw: 'III/4 or III/5' },
  engrasador: { es: 'ENGRASADOR', en: 'Rating (Engine-room Watch)', stcw: 'III/4 or III/5' },
  'aux-maquina': { es: 'AUX. DE MÁQUINA', en: 'Wiper', stcw: '—' },
  cocinero: { es: 'COCINERO', en: 'Ship Cook', stcw: 'MLC A3.2 *' },
  '2-cocinero': { es: '2DO COCINERO', en: 'Second Cook', stcw: '—' },
  'ayudante-cocina': { es: 'AYUDANTE DE COCINA', en: 'Assistant Cook', stcw: '—' },
  '1-mozo': { es: '1ER MOZO', en: 'Messman', stcw: '—' },
  '2-mozo': { es: '2DO MOZO', en: 'Messman', stcw: '—' },
  enfermero: { es: 'ENFERMERO', en: 'Nurse', stcw: 'VI/4' },
};

export const ofertaPorDefecto = (p, email = '') => ({
  titulo: 'BUDGETARY OFFER · CREWING SERVICES',
  buque: '', imo: '', bandera: '', gt: '', propulsion: '', tipoBuque: 'Offshore Support Vessel',
  cliente: p.cliente || '', attn: '', fecha: new Date().toISOString().slice(0, 10), validez: 15, lugar: 'Buenos Aires',
  alcanceRequerido: 'The CONTRACTOR proposes the provision of Crewing Services Management for the vessel under the full Minimum Safe Manning set by the Flag State for an unlimited trading area, staffed with Argentine crew to operate in Argentine waters.',
  notaTripulacion: '(*) A certified Cook is required for ships with 10 or more persons on board (MLC 2006 Std. A3.2). Radio: at least two officers holding a GMDSS GOC, or one dedicated GMDSS GOC officer, are required.',
  condicion: 'Minimum Safe Manning (Unlimited Trading Area)',
  enfermeroOpcional: true,
  inicioFin: 'Once personnel are summoned by the COMPANY and successfully complete the mandatory medical examination, they will be placed at the COMPANY\'s disposal and will begin accruing salaries from that date. Salaries shall continue to accrue until the date the seafarer returns to his place of residence.\n\nFor periods during which a crew member is under contract but not yet embarked (mobilization/demobilization periods), a rate of 50% of the applicable Daily Rate shall apply.',
  notaConvenio: 'Note: Salary calculations are based on the most updated Collective Bargaining Agreement "Convenio Colectivo de Trabajo entre CAENA y el Centro de Jefes y Oficiales Maquinistas Navales del 20/2/2009" and the "Acta Acuerdo entre FENA/CAENA/CNA/CARBA y el Centro de Capitanes de Ultramar CCUOMM del 9/1/2019".',
  firmaNombre: '', firmaCargo: 'General Manager · TERRA-MARE SERVICES S.A.', firmaEmail: email,
});

const MESES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ordinal = (d) => (d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th');
export const fechaEn = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${MESES_EN[m - 1]} ${d}${ordinal(d)} ${y}`;
};
export const mesEn = (ym) => (ym ? `${MESES_EN[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}` : '[month/year]');
const NUMEROS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
  'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four', 'twenty-five',
  'twenty-six', 'twenty-seven', 'twenty-eight', 'twenty-nine', 'thirty'];
export const enLetras = (n) => NUMEROS[n] ?? String(n);
