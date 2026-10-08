/** Fixed SPECTACLE framework constants (domains, themes, sentiment scales),
 * as defined by the client's AXM Console v6. Records only carry scores and
 * readings; names, tiers and colours always come from here. */
export interface SpectacleDomain {
  letter: string;
  code: string;
  name: string;
  tier: string;
  light: string;
  dark: string;
  deep: string;
}

export const SPECTACLE_DOMAINS: SpectacleDomain[] = [
  { letter: 'S', code: 'G1', name: 'Society', tier: 'Polity', light: '#2a78d6', dark: '#3987e5', deep: '#1d5496' },
  { letter: 'P', code: 'G2', name: 'Polity', tier: 'Polity', light: '#e34948', dark: '#e66767', deep: '#9f3332' },
  { letter: 'E', code: 'G8', name: 'Epistemology', tier: 'Mediation', light: '#1baf7a', dark: '#199e70', deep: '#137a55' },
  { letter: 'C', code: 'G4', name: 'Capital', tier: 'Substrate', light: '#eb6834', dark: '#d95926', deep: '#a44924' },
  { letter: 'T', code: 'G5', name: 'Technology', tier: 'Substrate', light: '#4a3aa7', dark: '#9085e9', deep: '#342975' },
  { letter: 'A', code: 'G6', name: 'Aesthetics', tier: 'Mediation', light: '#e87ba4', dark: '#d55181', deep: '#a25673' },
  { letter: 'C', code: 'G7', name: 'Chronology', tier: 'Mediation', light: '#8b46c8', dark: '#a768e0', deep: '#61318c' },
  { letter: 'L', code: 'G3', name: 'Law', tier: 'Polity', light: '#eda100', dark: '#c98500', deep: '#8a6200' },
  { letter: 'E', code: 'G9', name: 'Ecology', tier: 'Substrate', light: '#008300', dark: '#008300', deep: '#005c00' },
];

export const SPECTACLE_DOMAIN_BY_CODE: Record<string, SpectacleDomain> = Object.fromEntries(
  SPECTACLE_DOMAINS.map((d) => [d.code, d])
);

export const SPECTACLE_THEMES: [string, string][] = [
  ['G1.1', 'Public engagement & civic reach'], ['G1.2', 'Equity, inclusion & voice'], ['G1.3', 'The profession as social field'],
  ['G2.1', 'Critical autonomy & editorial integrity'], ['G2.2', 'State, city & the governed'], ['G2.3', 'Worlding & coloniality'],
  ['G3.1', 'Ethics, trust & standards'], ['G3.2', 'Speech, image & legal risk'], ['G3.3', 'Accountability & field-building'],
  ['G4.1', 'Political economy & market power'], ['G4.2', 'Labour & precarity'],
  ['G5.1', 'Platform dynamics'], ['G5.2', 'Embodiment & synthetic images'],
  ['G6.1', 'The image as argument'], ['G6.2', 'Affect, desire & the sensorium'], ['G6.3', 'Spectacle & mode of address'],
  ['G7.1', 'Temporality & reception'], ['G7.2', 'Archive, memory & heritage'],
  ['G8.1', 'Knowledge, pedagogy & depth'], ['G8.2', 'Epistemic justice'], ['G8.3', 'Evidence & expertise'],
  ['G9.1', 'Material ecology of media'], ['G9.2', 'Place, land & the more-than-human'],
];

export const SPECTACLE_THEME_NAME: Record<string, string> = Object.fromEntries(SPECTACLE_THEMES);

/** [code, low pole, high pole, reporting domain] */
export const SENTIMENT_SCALES: [string, string, string, string][] = [
  ['S01', 'Pessimism', 'Optimism', 'G7'], ['S02', 'Fatalism', 'Agency', 'G2'], ['S03', 'Patience', 'Urgency', 'G7'],
  ['S04', 'Anger', 'Equanimity', 'G8'], ['S05', 'Nostalgia', 'Forward-Orientation', 'G7'], ['S06', 'Frustration', 'Satisfaction', 'G1'],
  ['S07', 'Isolation', 'Solidarity', 'G1'], ['S08', 'Resignation', 'Defiance', 'G2'], ['S09', 'Despair', 'Hope', 'G7'],
  ['S10', 'Irony', 'Earnestness', 'G6'], ['S11', 'Detachment', 'Passion', 'G6'], ['S12', 'Exhaustion', 'Energy', 'G5'],
  ['S13', 'Suspicion', 'Trust', 'G3'], ['S14', 'Territoriality', 'Generosity', 'G1'], ['S15', 'Armour', 'Vulnerability', 'G8'],
  ['S16', 'Disenchantment', 'Wonder', 'G6'], ['S17', 'Placelessness', 'Locatedness', 'G9'], ['S18', 'Extraction', 'Stewardship', 'G4'],
];
