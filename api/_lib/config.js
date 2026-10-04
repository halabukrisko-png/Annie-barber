// Konfigurácia rezervačného systému BARBERIS.
// Kalendáre sa nastavujú cez premenné prostredia vo Verceli (pozri BOOKING-SETUP.md).

const TZ = 'Europe/Bratislava';

// Otváracie hodiny v minútach od polnoci (0 = nedeľa ... 6 = sobota); chýbajúci deň = zatvorené.
const HOURS = {
  2: [9 * 60, 18 * 60],
  3: [9 * 60, 18 * 60],
  4: [9 * 60, 18 * 60],
  5: [9 * 60, 18 * 60],
  6: [9 * 60, 13 * 60], // sobota: salón je do 14:00, ale objednať sa dá len tak, aby sa termín skončil do 13:00
};

// Obedňajšia prestávka v dňoch utorok – piatok: 12:30 – 14:00. Posledný termín pred ňou začína o 12:00 (služba môže
// presiahnuť do prestávky), ďalší o 14:00. Medzi 12:00 a 14:00 sa nezačína žiadny termín.
const LUNCH_DAY = { from: 12 * 60 + 30, to: 14 * 60, last: 12 * 60 };
const LUNCH = { 2: LUNCH_DAY, 3: LUNCH_DAY, 4: LUNCH_DAY, 5: LUNCH_DAY };

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
  strih:     { name: 'Strih', nameEn: 'Haircut',                          price: '20 €',     min: 30, byBarber: { Vladis: 40 } },
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
// krok ponúkaných časov: 30 min; Vladis pri strihu 15 min (strih trvá 40 min)
function gridFor(barber, serviceId) { return barber === 'Vladis' && serviceId === 'strih' ? 15 : GRID_MIN; }

function calendarId(barber) {
  return process.env[BARBERS[barber].calendarEnv] || null;
}

module.exports = { TZ, HOURS, LUNCH, BREAK_MIN, GRID_MIN, breakFor, gridFor, LEAD_MIN, HORIZON_DAYS, BARBERS, BARBER_NAMES, SERVICES, durationFor, calendarId };
