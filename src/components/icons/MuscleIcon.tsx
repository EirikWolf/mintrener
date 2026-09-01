import React from 'react';
import {
  ChestIcon,
  ShouldersIcon,
  UpperBackIcon,
  LowerBackIcon,
  BicepsIcon,
  TricepsIcon,
  AbsCoreIcon,
  GlutesIcon,
  QuadsIcon,
  HamstringsIcon,
  CalvesIcon,
  NeckIcon,
} from './muscleIcons';
import { muskelgruppeFor, MuskelGruppe } from '../../data/muskler';

interface MuscleIconProps {
  name: string;
  className?: string;
  size?: number;
}

type IkonKomponent = React.FC<{ className?: string; size?: number }>;

/**
 * Kanonisk gruppe → ikon.
 *
 * ERSTATTER en kjede av delstrengsjekker i fast rekkefølge, der rekkefølgen var
 * feil. Fire feil sto i produksjon: `bakside lår` traff `lår`-sjekken og ga
 * quadriceps, `korsrygg` traff `rygg` og ga øvre rygg, `brystrygg` traff `bryst`
 * og ga brystmuskel, og `latissimus` traff ingen gren og falt tilbake på
 * magemuskler. Grenene for `korsrygg` og `bakside lår` var død kode.
 *
 * Typen er `Record<MuskelGruppe, …>` med vilje: legger noen til en gruppe i
 * ordforrådet uten å velge ikon, nekter TypeScript å kompilere. Det er sterkere
 * enn en test, fordi det ikke kan glemmes.
 *
 * Seks grupper har ikke eget ikon ennå og deler et beslektet. Kompromissene er
 * skrevet ned framfor å skje stilltiende.
 */
const IKON: Record<MuskelGruppe, IkonKomponent> = {
  bryst: ChestIcon,
  skuldre: ShouldersIcon,
  'øvre rygg': UpperBackIcon,
  latissimus: UpperBackIcon, // deler ikon med øvre rygg — begge er rygg
  korsrygg: LowerBackIcon,
  biceps: BicepsIcon,
  triceps: TricepsIcon,
  underarmer: BicepsIcon, // nærmeste arm-ikon
  kjerne: AbsCoreIcon,
  'skrå magemuskler': AbsCoreIcon, // obliquene ER kjerne
  hoftebøyere: QuadsIcon, // fremre hofte/lår
  sete: GlutesIcon,
  'forside lår': QuadsIcon,
  'bakside lår': HamstringsIcon,
  adduktorer: QuadsIcon, // innside lår; hverken for- eller bakside treffer helt
  legger: CalvesIcon,
  nakke: NeckIcon,
  pustemuskulatur: ChestIcon, // diafragma og interkostaler sitter i brystkassen
};

/**
 * Ikon for et muskelnavn fra øvelseskatalogen.
 *
 * Gir INGENTING for navn som ikke er muskler — `kondisjon`, `balanse`,
 * `restitusjon`. De sto tidligere med et magemuskel-ikon, som er en påstand om
 * anatomi der det ikke finnes noen. Etiketten står fint alene.
 */
export const MuscleIcon: React.FC<MuscleIconProps> = ({
  name,
  className = 'w-3.5 h-3.5',
  size = 14,
}) => {
  const gruppe = muskelgruppeFor(name);
  if (!gruppe) return null;

  const Ikon = IKON[gruppe];
  return <Ikon className={className} size={size} />;
};
