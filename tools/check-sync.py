#!/usr/bin/env python3
"""Kontrola zhody desktop a mobilnej verzie (index/o-nas/galeria).

Web má dve sady stránok (X.html a X-m.html). Tento skript porovná viditeľný text
a kľúčové údaje (telefón, adresa, hodiny, ceny) a vypíše rozdiely. Spusti ho pred
každým commitom:  python3 tools/check-sync.py
Koniec s chybou (kód 1), ak sa verzie líšia.
"""
import re, html, sys, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

def texts(f):
    s = open(f, encoding='utf-8').read()
    b = s[s.find('<body'):]
    b = re.sub(r'<script.*?</script>|<svg.*?</svg>|<style.*?</style>|<noscript.*?</noscript>', '', b, flags=re.S)
    b = re.sub(r'<(br|/p|/div|/h\d|/li|/a|/span|/button)[^>]*>', '\n', b)
    b = re.sub(r'<[^>]+>', '', b)
    return {re.sub(r'\s+', ' ', html.unescape(l)).strip() for l in b.split('\n') if l.strip()}

# texty, ktoré sa zámerne líšia (napr. nadpis karty zakladateľky)
ALLOWED = {'ZA BARBERIS STOJÍM JA', 'Anett · Zakladateľka'}
bad = 0
for p in ('index', 'o-nas', 'galeria'):
    m, d = texts(p + '-m.html'), texts(p + '.html')
    for name, only in (('len v mobile', m - d - ALLOWED), ('len v desktop', d - m - ALLOWED)):
        for t in sorted(only):
            print('%-9s %-14s %s' % (p, name, t[:110])); bad += 1
FACTS = ['0951 833 488', 'Hurbana 4', '971 01 Prievidza', '8:00 – 18:00', '8:00 – 14:00', '20 €', '30 €', '15 €', '25 €', '5 – 10 €', 'od 10 €']
for f in FACTS:
    for p in ('index', 'o-nas', 'galeria'):
        pass
for p in ('index', 'galeria'):
    for f in ('0951 833 488', 'Hurbana 4', '8:00 – 18:00', '8:00 – 14:00'):
        for v in (p + '.html', p + '-m.html'):
            if f not in open(v, encoding='utf-8').read():
                print('CHÝBA údaj', f, 'v', v); bad += 1
print('OK – verzie sú zhodné' if not bad else '%d rozdielov' % bad)
sys.exit(1 if bad else 0)
