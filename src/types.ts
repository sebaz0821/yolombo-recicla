export type PersonaAtendida = 'Propietario(a)' | 'Arrendatario(a)' | 'Familiar' | 'Otro';
export type RespuestaBinaria = 'Sí' | 'No' | 'No sabe/No responde';

export interface RegistroPGIRS {
  id: string; // UUID local
  numero: number; // Consecutivo N.°
  zona: string; // Sector, Comuna, Barrio o Vereda
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm
  encuestador: string; // Nombre del capacitador/encuestador
  direccion: string; // Dirección / referencia de vivienda
  nombrePersona?: string; // Nombre de la persona que recibió la capacitación
  telefono?: string; // Número telefónico de contacto
  personaAtendida: PersonaAtendida;
  comprendioCambio: RespuestaBinaria;
  recibioVolante: RespuestaBinaria;
  conoceDiaA: RespuestaBinaria; // Conoce Día A de recolección
  conoceDiaB: RespuestaBinaria; // Conoce Día B de recolección
  dudaInquietud: string; // Duda o inquietud planteada
  requiereSeguimiento: RespuestaBinaria;
  observaciones: string; // Observaciones adicionales
  coordenadasGPS?: {
    lat: number;
    lng: number;
    precision?: number;
  };
  sincronizado: boolean; // Si ya se subió a Google Sheets
  fechaCreacion: number; // timestamp ms
  fechaSincronizado?: number; // timestamp ms
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  sheetName: string;
  spreadsheetUrl: string;
  scriptUrl?: string; // URL del Google Apps Script Web App
  autoSync: boolean;
}

export interface FiltrosReporte {
  zona: string;
  encuestador: string;
  fechaInicio: string;
  fechaFin: string;
  estadoSincronizacion: 'todos' | 'sincronizados' | 'pendientes';
  requiereSeguimiento: 'todos' | 'Sí' | 'No';
}
