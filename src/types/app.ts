// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Kunden {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kunde_firstname?: string;
    kunde_lastname?: string;
    firma?: string;
    email?: string;
    telefon?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    notizen?: string;
  };
}

export interface Rechnungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    rechnungsnummer?: string;
    kunde?: string; // applookup -> URL zu 'Kunden' Record
    rechnungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    faelligkeitsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    leistungsbeschreibung?: string;
    nettobetrag?: number;
    steuersatz?: LookupValue;
    bruttobetrag?: number;
    zahlungsstatus?: LookupValue;
    bezahldatum?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export const APP_IDS = {
  KUNDEN: '6ae9f52a1879ade22efdb8bc',
  RECHNUNGEN: '6ae9f52e03108fdeac6f9675',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'rechnungen': {
    steuersatz: [{ key: "satz_19", label: "19 %" }, { key: "satz_7", label: "7 %" }, { key: "satz_0", label: "0 %" }],
    zahlungsstatus: [{ key: "offen", label: "Offen" }, { key: "bezahlt", label: "Bezahlt" }, { key: "ueberfaellig", label: "Überfällig" }, { key: "storniert", label: "Storniert" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'kunden': {
    'kunde_firstname': 'string/text',
    'kunde_lastname': 'string/text',
    'firma': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'notizen': 'string/textarea',
  },
  'rechnungen': {
    'rechnungsnummer': 'string/text',
    'kunde': 'applookup/select',
    'rechnungsdatum': 'date/date',
    'faelligkeitsdatum': 'date/date',
    'leistungsbeschreibung': 'string/textarea',
    'nettobetrag': 'number',
    'steuersatz': 'lookup/radio',
    'bruttobetrag': 'number',
    'zahlungsstatus': 'lookup/select',
    'bezahldatum': 'date/date',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateKunden = StripLookup<Kunden['fields']>;
export type CreateRechnungen = StripLookup<Rechnungen['fields']>;