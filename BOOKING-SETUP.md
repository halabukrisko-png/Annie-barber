# Online rezervácia cez Google Kalendár – nastavenie

Rezervácie bežia cez Vercel funkcie v `api/` (`/api/availability`, `/api/book`) a zapisujú do Google Kalendára.

## 1. Google kalendáre
Vytvor 4 kalendáre (Google Kalendár → Ďalšie kalendáre → Vytvoriť): **Anett**, **Karvy**, **Vladis** a **BARBERIS spoločný**.
Pre každý skopíruj *ID kalendára* (Nastavenia kalendára → Integrovať kalendár).

## 2. Service account
1. <https://console.cloud.google.com> → nový projekt → *APIs & Services* → zapni **Google Calendar API**.
2. *IAM & Admin → Service Accounts* → vytvor účet → *Keys → Add key → JSON* (stiahne sa súbor).
3. Každý zo 4 kalendárov zdieľaj s e-mailom service accountu (`...@...iam.gserviceaccount.com`) s právom **Vykonávať zmeny udalostí**.

## 3. Premenné prostredia vo Verceli (Project → Settings → Environment Variables)
| Názov | Hodnota |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | **celý obsah** stiahnutého JSON súboru (otvoriť v Poznámkovom bloku, Ctrl+A, Ctrl+C, vložiť). Alternatíva: samostatné `GOOGLE_SERVICE_ACCOUNT_EMAIL` a `GOOGLE_PRIVATE_KEY` |
| `CAL_ANETT`, `CAL_KARVY`, `CAL_VLADIS` | ID kalendárov barberov |
| `CAL_SHARED` | ID spoločného kalendára (každá rezervácia sa tam zrkadlí s menom barbera) |
| `RESEND_API_KEY`, `MAIL_FROM` | e-maily cez Resend (klient dostane potvrdenie aj zrušenie). `MAIL_FROM` napr. `BARBERIS <rezervacie@tvojadomena.sk>` – doména musí byť overená v Resende |
| `OWNER_EMAIL` | tvoj Gmail (viac adries oddeľ čiarkou) – dostaneš farebný e-mail: 🟢 zelený pri novej rezervácii, 🔴 červený pri zrušení |

Po pridaní premenných treba nasadiť znova (Redeploy).

## Ako to funguje
- Voľné časy sa počítajú z kalendárov barberov: **akákoľvek udalosť v kalendári barbera blokuje čas** (dovolenka, obed… stačí si ju tam pridať).
- Dĺžky služieb a hodiny sú v `api/_lib/config.js` (komplet 60 min, holenie 60 min, ostatné 30 min; Vladis má strih 40 min a časy po 40 min).
- Termíny sa ponúkajú po 30 min a bez prestávky. Pri voľbe „Nezáleží“ sa termín priradí barberovi, ku ktorému sa najlepšie hodí (nalepí sa na jeho existujúce termíny a nerozbíja voľné okná iných).
- Rezervovať sa dá najskôr o hodinu dopredu a max. 60 dní vopred.

## E-mail pri ručnom zrušení termínu v kalendári
`/api/cron-cancel` sa volá každých ~5 min z GitHub Actions (`.github/workflows/cancel-check.yml`; Vercel Hobby cron zvláda len 1x denne). Nájde termíny zmazané ručne v kalendári barbera a pošle e-mail zákazníkovi aj majiteľovi. Ručne pridané udalosti (bez rezervácie z webu) sa neoznamujú. Vyžaduje `CAL_SHARED`.
1. Vo Verceli pridaj `CRON_SECRET` (ľubovoľný dlhý náhodný reťazec) a nasaď znova.
2. V GitHub repe → Settings → Secrets and variables → Actions pridaj `CRON_SECRET` (rovnaká hodnota) a `SITE_URL` (napr. `https://barberis-barber-prievidza.com`).
