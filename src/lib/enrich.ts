import type { EnrichedRechnungen } from '@/types/enriched';
import type { Kunden, Rechnungen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface RechnungenMaps {
  kundenMap: Map<string, Kunden>;
}

export function enrichRechnungen(
  rechnungen: Rechnungen[],
  maps: RechnungenMaps
): EnrichedRechnungen[] {
  return rechnungen.map(r => ({
    ...r,
    kundeName: resolveDisplay(r.fields.kunde, maps.kundenMap, 'kunde_firstname'),
  }));
}
