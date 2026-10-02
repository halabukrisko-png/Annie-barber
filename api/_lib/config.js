// Konfigurácia rezervačného systému BARBERIS.
// Kalendáre sa nastavujú cez premenné prostredia vo Verceli (pozri BOOKING-SETUP.md).

const TZ = 'Europe/Bratislava';

// Otváracie hodiny v minútach od polnoci (0 = nedeľa ... 6 = sobota); chýbajúci deň = zatvorené.
const HOURS = {
  1: [8 * 60, 18 * 60],
  2: [8 * 60, 18 * 60],
  3: [8 * 60, 18 * 60],
  4: [8 * 60, 18 * 60],
  5: [8 * 60, 18 * 60],
  6: [8 * 60, 14 * 60],
};

const BREAK_MIN = 5;          // prestávka medzi dvoma termínmi
const GRID_MIN = 15;          // základný krok ponúkaných časov
const LEAD_MIN = 60;          // najskôr o hodinu odteraz
const HORIZON_DAYS = 60;      // ako ďaleko dopredu sa dá rezervovať

const BARBERS = {
  Anett: { calendarEnv: 'CAL_ANETT' },
  Karvy: { calendarEnv: 'CAL_KARVY' },
  Vladis: { calendarEnv: 'CAL_VLADIS' },
};
const BARBER_NAMES = Object.keys(BARBERS);

// Dĺžky v minútach. `byBarber` prepisuje základnú dĺžku pre konkrétneho barbera.
const SERVICES = {
  strih:     { name: 'Strih',                          price: '20 €',     min: 30, byBarber: { Vladis: 45 } },
  komplet:   { name: 'Kompletná úprava (strih + brada)', price: '30 €',   min: 60 },
  brada:     { name: 'Úprava brady',                   price: '15 €',     min: 30 },
  detsky:    { name: 'Detský strih do 12 r.',          price: '15 €',     min: 30 },
  holenie:   { name: 'Holenie hlavy + úprava brady',   price: '25 €',     min: 45 },
  farbenie:  { name: 'Farbenie brady',                 price: '5 – 10 €', min: 30 },
  cistenie:  { name: 'Čistenie pleti',                 price: 'od 10 €',  min: 30 },
};

function durationFor(serviceId, barber) {
  const s = SERVICES[serviceId];
  if (!s) return null;
  return (s.byBarber && s.byBarber[barber]) || s.min;
}

function calendarId(barber) {
  return process.env[BARBERS[barber].calendarEnv] || null;
}

module.exports = { TZ, HOURS, BREAK_MIN, GRID_MIN, LEAD_MIN, HORIZON_DAYS, BARBERS, BARBER_NAMES, SERVICES, durationFor, calendarId };
