import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichRechnungen } from '@/lib/enrich';
import type { EnrichedRechnungen } from '@/types/enriched';
import type { Kunden } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RechnungenDialog } from '@/components/dialogs/RechnungenDialog';
import { KundenDialog } from '@/components/dialogs/KundenDialog';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck, IconPlus, IconPencil, IconTrash,
  IconFileInvoice, IconUsers, IconCurrencyEuro, IconClock, IconBuildingStore,
  IconCircleCheck, IconAlertTriangle, IconBan, IconSearch, IconX,
} from '@tabler/icons-react';

const APPGROUP_ID = '6ae9f53f81016e2f14e8546e';
const REPAIR_ENDPOINT = '/claude/build/repair';

const STATUS_COLUMNS = [
  { key: 'offen', label: 'Offen', icon: IconClock, color: 'bg-blue-50 border-blue-200', badgeClass: 'bg-blue-100 text-blue-700', headerClass: 'text-blue-700' },
  { key: 'ueberfaellig', label: 'Überfällig', icon: IconAlertTriangle, color: 'bg-orange-50 border-orange-200', badgeClass: 'bg-orange-100 text-orange-700', headerClass: 'text-orange-700' },
  { key: 'bezahlt', label: 'Bezahlt', icon: IconCircleCheck, color: 'bg-green-50 border-green-200', badgeClass: 'bg-green-100 text-green-700', headerClass: 'text-green-700' },
  { key: 'storniert', label: 'Storniert', icon: IconBan, color: 'bg-gray-50 border-gray-200', badgeClass: 'bg-gray-100 text-gray-500', headerClass: 'text-gray-500' },
] as const;

type StatusKey = typeof STATUS_COLUMNS[number]['key'];

export default function DashboardOverview() {
  const { kunden, rechnungen, kundenMap, loading, error, fetchAll } = useDashboardData();

  const enrichedRechnungen = enrichRechnungen(rechnungen, { kundenMap });

  // All hooks must be before early returns
  const [rechnungDialog, setRechnungDialog] = useState<{ open: boolean; record?: EnrichedRechnungen }>({ open: false });
  const [kundenDialog, setKundenDialog] = useState<{ open: boolean; record?: Kunden }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'rechnung' | 'kunde'; id: string } | null>(null);
  const [kundenSearch, setKundenSearch] = useState('');
  const [selectedKunde, setSelectedKunde] = useState<string | null>(null);

  const kpiData = useMemo(() => {
    const offen = enrichedRechnungen.filter(r => r.fields.zahlungsstatus?.key === 'offen');
    const ueberfaellig = enrichedRechnungen.filter(r => r.fields.zahlungsstatus?.key === 'ueberfaellig');
    const bezahlt = enrichedRechnungen.filter(r => r.fields.zahlungsstatus?.key === 'bezahlt');
    const totalOffen = offen.reduce((s, r) => s + (r.fields.bruttobetrag ?? 0), 0);
    const totalBezahlt = bezahlt.reduce((s, r) => s + (r.fields.bruttobetrag ?? 0), 0);
    return { offen: offen.length, ueberfaellig: ueberfaellig.length, totalOffen, totalBezahlt };
  }, [enrichedRechnungen]);

  const filteredKunden = useMemo(() => {
    const s = kundenSearch.toLowerCase();
    if (!s) return kunden;
    return kunden.filter(k =>
      `${k.fields.kunde_firstname ?? ''} ${k.fields.kunde_lastname ?? ''} ${k.fields.firma ?? ''}`.toLowerCase().includes(s)
    );
  }, [kunden, kundenSearch]);

  const displayedRechnungen = useMemo(() => {
    if (!selectedKunde) return enrichedRechnungen;
    return enrichedRechnungen.filter(r => {
      const url = r.fields.kunde;
      if (!url) return false;
      return url.includes(selectedKunde);
    });
  }, [enrichedRechnungen, selectedKunde]);

  const groupedByStatus = useMemo(() => {
    const map: Record<string, EnrichedRechnungen[]> = { offen: [], ueberfaellig: [], bezahlt: [], storniert: [] };
    displayedRechnungen.forEach(r => {
      const key = r.fields.zahlungsstatus?.key ?? 'offen';
      if (key in map) map[key].push(r);
    });
    return map;
  }, [displayedRechnungen]);

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'rechnung') {
      await LivingAppsService.deleteRechnungenEntry(deleteTarget.id);
    } else {
      await LivingAppsService.deleteKundenEntry(deleteTarget.id);
    }
    fetchAll();
    setDeleteTarget(null);
  }

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Offene Rechnungen"
          value={String(kpiData.offen)}
          description="Warten auf Zahlung"
          icon={<IconFileInvoice size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Überfällig"
          value={String(kpiData.ueberfaellig)}
          description="Sofort handeln"
          icon={<IconAlertTriangle size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Ausstehend"
          value={formatCurrency(kpiData.totalOffen)}
          description="Offener Betrag"
          icon={<IconCurrencyEuro size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Eingenommen"
          value={formatCurrency(kpiData.totalBezahlt)}
          description="Bezahlte Rechnungen"
          icon={<IconCurrencyEuro size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Main workspace: Kanban + Kunden sidebar */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Kanban Board */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="font-semibold text-foreground text-lg">Rechnungen</h2>
              {selectedKunde && (
                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                  Gefiltert
                  <button onClick={() => setSelectedKunde(null)} className="ml-1 hover:text-destructive">
                    <IconX size={12} />
                  </button>
                </Badge>
              )}
            </div>
            <Button size="sm" onClick={() => setRechnungDialog({ open: true })}>
              <IconPlus size={15} className="mr-1 shrink-0" />
              <span>Neue Rechnung</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto">
            {STATUS_COLUMNS.map(col => {
              const items = groupedByStatus[col.key] ?? [];
              const ColIcon = col.icon;
              return (
                <div key={col.key} className={`rounded-2xl border ${col.color} p-3 flex flex-col gap-2 min-h-[200px]`}>
                  <div className={`flex items-center gap-1.5 mb-1 ${col.headerClass}`}>
                    <ColIcon size={15} className="shrink-0" />
                    <span className="font-semibold text-sm">{col.label}</span>
                    <span className="ml-auto text-xs font-normal opacity-70">{items.length}</span>
                  </div>

                  {items.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-xs text-muted-foreground opacity-60">Keine Einträge</p>
                    </div>
                  )}

                  {items.map(r => (
                    <div key={r.record_id} className="bg-white rounded-xl p-3 border border-white/80 shadow-sm flex flex-col gap-1.5 group">
                      <div className="flex items-start justify-between gap-1 min-w-0">
                        <span className="text-xs font-medium text-muted-foreground truncate">{r.fields.rechnungsnummer ?? '—'}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            className="p-1 rounded hover:bg-accent transition-colors"
                            onClick={() => setRechnungDialog({ open: true, record: r })}
                            title="Bearbeiten"
                          >
                            <IconPencil size={13} className="text-muted-foreground" />
                          </button>
                          <button
                            className="p-1 rounded hover:bg-destructive/10 transition-colors"
                            onClick={() => setDeleteTarget({ type: 'rechnung', id: r.record_id })}
                            title="Löschen"
                          >
                            <IconTrash size={13} className="text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-foreground truncate">{r.kundeName || '—'}</p>
                      {r.fields.leistungsbeschreibung && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{r.fields.leistungsbeschreibung}</p>
                      )}
                      <div className="flex items-center justify-between gap-1 flex-wrap mt-0.5">
                        <span className="text-sm font-bold text-foreground">
                          {r.fields.bruttobetrag != null ? formatCurrency(r.fields.bruttobetrag) : '—'}
                        </span>
                        {r.fields.faelligkeitsdatum && (
                          <span className="text-xs text-muted-foreground">fällig {formatDate(r.fields.faelligkeitsdatum)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Kunden Sidebar */}
        <div className="lg:w-72 xl:w-80 shrink-0">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <IconUsers size={18} className="text-muted-foreground shrink-0" />
              <h2 className="font-semibold text-foreground text-lg">Kunden</h2>
              <span className="text-sm text-muted-foreground">({kunden.length})</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setKundenDialog({ open: true })}>
              <IconPlus size={15} className="mr-1 shrink-0" />
              <span>Neu</span>
            </Button>
          </div>

          {/* Suche */}
          <div className="relative mb-3">
            <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Kunden suchen..."
              value={kundenSearch}
              onChange={e => setKundenSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredKunden.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                <IconBuildingStore size={36} className="text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">Keine Kunden gefunden</p>
                <Button size="sm" variant="outline" onClick={() => setKundenDialog({ open: true })}>
                  <IconPlus size={14} className="mr-1" />Kunden anlegen
                </Button>
              </div>
            )}
            {filteredKunden.map(k => {
              const name = [k.fields.kunde_firstname, k.fields.kunde_lastname].filter(Boolean).join(' ') || k.fields.firma || '—';
              const rechnungenCount = rechnungen.filter(r => r.fields.kunde?.includes(k.record_id)).length;
              const isSelected = selectedKunde === k.record_id;
              return (
                <div
                  key={k.record_id}
                  className={`rounded-xl border p-3 flex items-start gap-3 cursor-pointer transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30 hover:bg-accent/30'}`}
                  onClick={() => setSelectedKunde(isSelected ? null : k.record_id)}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold text-sm">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{name}</p>
                    {k.fields.firma && (k.fields.kunde_firstname || k.fields.kunde_lastname) && (
                      <p className="text-xs text-muted-foreground truncate">{k.fields.firma}</p>
                    )}
                    {k.fields.email && (
                      <p className="text-xs text-muted-foreground truncate">{k.fields.email}</p>
                    )}
                    {rechnungenCount > 0 && (
                      <span className="text-xs text-muted-foreground">{rechnungenCount} Rechnung{rechnungenCount !== 1 ? 'en' : ''}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      className="p-1 rounded hover:bg-accent transition-colors"
                      onClick={e => { e.stopPropagation(); setKundenDialog({ open: true, record: k }); }}
                      title="Bearbeiten"
                    >
                      <IconPencil size={13} className="text-muted-foreground" />
                    </button>
                    <button
                      className="p-1 rounded hover:bg-destructive/10 transition-colors"
                      onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'kunde', id: k.record_id }); }}
                      title="Löschen"
                    >
                      <IconTrash size={13} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rechnungen Dialog */}
      <RechnungenDialog
        open={rechnungDialog.open}
        onClose={() => setRechnungDialog({ open: false })}
        onSubmit={async (fields) => {
          if (rechnungDialog.record) {
            await LivingAppsService.updateRechnungenEntry(rechnungDialog.record.record_id, fields);
          } else {
            await LivingAppsService.createRechnungenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={rechnungDialog.record?.fields}
        kundenList={kunden}
        enablePhotoScan={AI_PHOTO_SCAN['Rechnungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Rechnungen']}
      />

      {/* Kunden Dialog */}
      <KundenDialog
        open={kundenDialog.open}
        onClose={() => setKundenDialog({ open: false })}
        onSubmit={async (fields) => {
          if (kundenDialog.record) {
            await LivingAppsService.updateKundenEntry(kundenDialog.record.record_id, fields);
          } else {
            await LivingAppsService.createKundenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={kundenDialog.record?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Kunden']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kunden']}
      />

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Eintrag löschen"
        description={
          deleteTarget?.type === 'rechnung'
            ? 'Diese Rechnung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.'
            : 'Diesen Kunden wirklich löschen? Verknüpfte Rechnungen bleiben erhalten.'
        }
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
