# Annie-barber – pravidlá pre Claude

## Commity a push (dôležité pre Vercel)
Vercel nasadzuje iba commity, ktorých autor je účet majiteľa. Commity od `Claude <noreply@anthropic.com>` sa nenasadia.

Pred prvým commitom v každej session nastav:

```
git config user.name "halabukrisko-png"
git config user.email "287959535+halabukrisko-png@users.noreply.github.com"
```

- Pushuj IBA na `main`: `git push origin HEAD:main`. Nepushuj súčasne aj na inú vetvu - každá vetva vytvorí ďalšie (Preview) nasadenie a míňa limit.
- Vercel (free plán) má denný limit nasadení ("Deployment rate limited - retry in 24 hours"). Každý push = nasadenie, preto zlučuj viac zmien do jedného commitu/pushu a NEPOSIELAJ commity, ktoré len menia značku `<!-- build ... -->`.
- Stav nasadenia commitu zistíš: `curl -s https://api.github.com/repos/halabukrisko-png/Annie-barber/commits/<sha>/statuses`.
- Pred pushom `git fetch origin main`; ak `main` pribudol, zlúč ho (`git merge origin/main`), nerob force push.

## Dve sady stránok (desktop `X.html` a mobil `X-m.html`)
Mobilné stránky (`X-m.html`) majú vlastný obsah a vlastné SEO (hlavička, canonical). Texty v nich sa menia samostatne, nie automaticky podľa desktopu.
