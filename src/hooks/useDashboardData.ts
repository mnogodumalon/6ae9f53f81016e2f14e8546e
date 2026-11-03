import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Kunden, Rechnungen } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [kunden, setKunden] = useState<Kunden[]>([]);
  const [rechnungen, setRechnungen] = useState<Rechnungen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [kundenData, rechnungenData] = await Promise.all([
        LivingAppsService.getKunden(),
        LivingAppsService.getRechnungen(),
      ]);
      setKunden(kundenData);
      setRechnungen(rechnungenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [kundenData, rechnungenData] = await Promise.all([
          LivingAppsService.getKunden(),
          LivingAppsService.getRechnungen(),
        ]);
        setKunden(kundenData);
        setRechnungen(rechnungenData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const kundenMap = useMemo(() => {
    const m = new Map<string, Kunden>();
    kunden.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kunden]);

  return { kunden, setKunden, rechnungen, setRechnungen, loading, error, fetchAll, kundenMap };
}