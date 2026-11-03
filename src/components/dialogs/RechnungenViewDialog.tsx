import type { Rechnungen, Kunden } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface RechnungenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Rechnungen | null;
  onEdit: (record: Rechnungen) => void;
  kundenList: Kunden[];
}

export function RechnungenViewDialog({ open, onClose, record, onEdit, kundenList }: RechnungenViewDialogProps) {
  function getKundenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return kundenList.find(r => r.record_id === id)?.fields.kunde_firstname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rechnungen anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rechnungsnummer</Label>
            <p className="text-sm">{record.fields.rechnungsnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kunde</Label>
            <p className="text-sm">{getKundenDisplayName(record.fields.kunde)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rechnungsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.rechnungsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fälligkeitsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.faelligkeitsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Leistungsbeschreibung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.leistungsbeschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nettobetrag (€)</Label>
            <p className="text-sm">{record.fields.nettobetrag ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Steuersatz</Label>
            <Badge variant="secondary">{record.fields.steuersatz?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bruttobetrag (€)</Label>
            <p className="text-sm">{record.fields.bruttobetrag ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zahlungsstatus</Label>
            <Badge variant="secondary">{record.fields.zahlungsstatus?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bezahldatum</Label>
            <p className="text-sm">{formatDate(record.fields.bezahldatum)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}