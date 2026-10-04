// Konfigurácia rezervačného systému BARBERIS.
// Kalendáre sa nastavujú cez premenné prostredia vo Verceli (pozri BOOKING-SETUP.md).

const TZ = 'Europe/Bratislava';

// Otváracie hodiny v minútach od polnoci (0 = nedeľa ... 6 = sobota); chýbajúci deň = zatvorené.
const HOURS = {
  1: [9 * 60, 18 * 60],
  2: [9 * 60, 18 * 60],
  3: [9 * 60, 18 * 60],
  4: [9 * 60, 18 * 60],
  5: [9 * 60, 18 * 60],
  6: [9 * 60, 14 * 60],
};

const BREAK_MIN = 0;          // prestávka medzi dvoma termínmi (žiadna)
const GRID_MIN = 30;          // základný krok ponúkaných časov (plus čas hneď po existujúcom termíne)
const LEAD_MIN = 60;          // najskôr o hodinu odteraz
const HORIZON_DAYS = 44;      // mesiac a 2 týždne; ako ďaleko dopredu sa dá rezervovať

// colorId = farba udalosti v Google Kalendári (3 fialová, 7 tyrkysová, 6 oranžová)
const BARBERS = {
  Anett: { calendarEnv: 'CAL_ANETT', colorId: '3', icon: '🟣' },
  Karvy: { calendarEnv: 'CAL_KARVY', colorId: '7', icon: '🔵' },
  Vladis: { calendarEnv: 'CAL_VLADIS', colorId: '6', icon: '🟠' },
};
const BARBER_NAMES = Object.keys(BARBERS);

// Dĺžky v minútach. `byBarber` prepisuje základnú dĺžku pre konkrétneho barbera.
const SERVICES = {
  strih:     { name: 'Strih', nameEn: 'Haircut',                          price: '20 €',     min: 30, byBarber: { Vladis: 45 } },
  komplet:   { name: 'Kompletná úprava (strih + brada)', nameEn: 'Full grooming (haircut + beard)', price: '30 €',   min: 60 },
  brada:     { name: 'Úprava brady', nameEn: 'Beard trim',                   price: '15 €',     min: 30 },
  detsky:    { name: 'Detský strih do 12 r.', nameEn: 'Kids haircut (under 12)',          price: '15 €',     min: 30 },
  holenie:   { name: 'Holenie hlavy + úprava brady', nameEn: 'Head shave + beard trim',   price: '25 €',     min: 60 },
  farbenie:  { name: 'Farbenie brady', nameEn: 'Beard colouring',                 price: '5 – 10 €', min: 30 },
  cistenie:  { name: 'Čistenie pleti', nameEn: 'Facial cleansing',                 price: 'od 10 €',  min: 30 },
};

function durationFor(serviceId, barber) {
  const s = SERVICES[serviceId];
  if (!s) return null;
  return (s.byBarber && s.byBarber[barber]) || s.min;
}

function breakFor() { return BREAK_MIN; }
function gridFor() { return GRID_MIN; } // všetci barberi: krok 30 min

function calendarId(barber) {
  return process.env[BARBERS[barber].calendarEnv] || null;
}

module.exports = { TZ, HOURS, BREAK_MIN, GRID_MIN, breakFor, gridFor, LEAD_MIN, HORIZON_DAYS, BARBERS, BARBER_NAMES, SERVICES, durationFor, calendarId };
