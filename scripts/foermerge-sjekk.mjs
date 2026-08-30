#!/usr/bin/env node
/**
 * Førmerge-sjekk — fanger feilklassene fire revisjoner har funnet.
 *
 * Kjør før du merger noe som legger til kode:
 *   node scripts/foermerge-sjekk.mjs
 *
 * Bakgrunnen: tre revisjoner på rad hadde sitt tyngste funn i kode som var
 * skrevet i mellomtiden — en tjeneste ingen kalte, en Firestore-sti uten
 * skriveregel, en nøkkelstreng som ikke traff. Revisjon er feil verktøy for
 * den klassen: for dyrt, og for sent. Disse sjekkene tar sekunder.
 *
 * Skriptet er bevisst konservativt. Falske positiver gjør at folk slutter å
 * kjøre det, så heller slippe noe gjennom enn å rope om ingenting.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, basename } from 'node:path';

const ROT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SRC = join(ROT, 'src');

function alleFiler(dir, ut = []) {
  for (const navn of readdirSync(dir)) {
    const sti = join(dir, navn);
    if (statSync(sti).isDirectory()) alleFiler(sti, ut);
    else if (/\.(ts|tsx)$/.test(navn)) ut.push(sti);
  }
  return ut;
}

const SCRIPTS = join(ROT, 'scripts');
const filer = alleFiler(SRC).map((f) => ({ sti: f, rel: relative(ROT, f), tekst: readFileSync(f, 'utf8') }));
// Skriptene teller som kallsteder — flere tjenester brukes kun derfra.
const skriptFiler = existsSync(SCRIPTS)
  ? alleFiler(SCRIPTS).map((f) => ({ sti: f, rel: relative(ROT, f), tekst: readFileSync(f, 'utf8') }))
  : [];
const erTest = (f) => f.rel.includes('__tests__') || f.rel.endsWith('.test.ts') || f.rel.endsWith('.test.tsx');
const produksjon = filer.filter((f) => !erTest(f));

const funn = [];
const meld = (tittel, detaljer, hint) => funn.push({ tittel, detaljer, hint });

// ── 1. Tjenester ingen kaller ────────────────────────────────────────────
// communityStatsService: 50 linjer kode, 34 linjer test, null kallsteder.
{
  const tjenester = produksjon.filter((f) => /[\\/]services[\\/][^\\/]+\.ts$/.test(f.rel));
  const døde = [];
  for (const t of tjenester) {
    const navn = basename(t.rel, '.ts');
    const brukt = [...produksjon, ...skriptFiler].some((f) => f.sti !== t.sti && f.tekst.includes(navn));
    if (!brukt) døde.push(navn);
  }
  if (døde.length) {
    meld(
      'Tjenester som ingen produksjonskode kaller',
      døde,
      'Slett dem, eller koble dem til. En tjeneste med tester men uten kallsteder ser ut som funksjonalitet uten å være det.'
    );
  }
}

// ── 2. Firestore-stier uten regel ────────────────────────────────────────
// counter_* ble skrevet til uten at noen regel dekket den.
{
  const reglerSti = join(ROT, 'firestore.rules');
  if (existsSync(reglerSti)) {
    const regler = readFileSync(reglerSti, 'utf8');
    const samlinger = new Set();
    for (const f of produksjon) {
      for (const m of f.tekst.matchAll(/(?:doc|collection)\(\s*db\s*,\s*'([a-z_]+)'/g)) {
        samlinger.add(m[1]);
      }
    }
    const udekket = [...samlinger].filter((s) => !regler.includes(`/${s}/`) && !regler.includes(`match /${s}`));
    if (udekket.length) {
      meld(
        'Firestore-samlinger uten egen regel',
        udekket,
        'Sjekk at en match-blokk dekker dem. Uten regel er de deny-by-default — feilen svelges ofte som «offline».'
      );
    }
  }
}

// ── 3. localStorage-nøkler utenfor registeret ────────────────────────────
// Sletting og eksport bommet på feilstavede nøkler; brukerdata overlevde
// «slett alt».
{
  const registerSti = join(SRC, 'constants', 'storageKeys.ts');
  if (existsSync(registerSti)) {
    const register = readFileSync(registerSti, 'utf8');
    const utenfor = new Set();
    for (const f of produksjon) {
      if (f.sti === registerSti) continue;
      for (const m of f.tekst.matchAll(/'(mintrener_[a-z0-9_]+)'/g)) {
        if (!register.includes(`'${m[1]}'`)) utenfor.add(`${m[1]}  (${f.rel})`);
      }
    }
    if (utenfor.size) {
      meld(
        'localStorage-nøkler som ikke står i storageKeys.ts',
        [...utenfor],
        'Legg dem i registeret. Sletting fanger dem via prefiks-skannet i clearAllLocalUserData, men DATAEKSPORTEN leser registeret eksplisitt — nøkler utenfor havner ikke i brukerens kopi, og det er en GDPR-forpliktelse.'
      );
    }
  }
}

// ── Rapport ──────────────────────────────────────────────────────────────
const SPØRSMÅL = [
  'Står dette i strid med noe vi har bestemt oss for å IKKE bygge? (docs/vedlegg-c, avsnitt C.6)',
  'Er et premiss her arvet fra dokumentasjon uten at kilden er lest? (Flux-lisensen, LTX-tallet)',
  'Lover UI-teksten noe enheten kanskje ikke har? (Web Bluetooth finnes ikke på iOS)',
  'Skrives det data som ingen leser — eller leses det data ingen skriver?',
];

console.log('\nFørmerge-sjekk\n' + '='.repeat(60));

if (funn.length === 0) {
  console.log('\n✅ Ingen automatiske funn.\n');
} else {
  for (const f of funn) {
    console.log(`\n⚠️  ${f.tittel}`);
    for (const d of f.detaljer) console.log(`      · ${d}`);
    console.log(`   → ${f.hint}`);
  }
  console.log('');
}

console.log('-'.repeat(60));
console.log('Fire spørsmål maskinen ikke kan svare på:\n');
SPØRSMÅL.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
console.log('');

// Skriptet rapporterer, det blokkerer ikke. Et funn kan være bevisst.
process.exit(0);
