import type { Rechnungen } from './app';

export type EnrichedRechnungen = Rechnungen & {
  kundeName: string;
};
