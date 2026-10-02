# Annie-barber – pravidlá pre Claude

## Commity a push (dôležité pre Vercel)
Vercel nasadzuje iba commity, ktorých autor je účet majiteľa. Commity od `Claude <noreply@anthropic.com>` sa nenasadia.

Pred prvým commitom v každej session nastav:

```
git config user.name "halabukrisko-png"
git config user.email "287959535+halabukrisko-png@users.noreply.github.com"
```

- Pushuj na `main` (Vercel sleduje `main`): `git push origin HEAD:main`.
- Ak treba, pushni aj na pracovnú vetvu session, aby sa nehromadili nepushnuté commity.
- Ak sa nasadenie nespustí, zmeň značku `<!-- build ... -->` na riadku 4 v `o-nas-m.html` (napr. `...p` -> `...q`) a pushni znova.
- Pred pushom `git fetch origin main`; ak `main` pribudol, zlúč ho (`git merge origin/main`), nerob force push.
