import { RegistroPGIRS, GoogleSheetsConfig } from './types';

const STORAGE_KEY_REGISTROS = 'pgirs_registros_v1';
const STORAGE_KEY_CONFIG = 'pgirs_sheets_config_v1';
const STORAGE_KEY_ENCUESTADOR = 'pgirs_current_encuestador_v1';
const STORAGE_KEY_ZONA = 'pgirs_current_zona_v1';

// Cargar registros locales
export function getLocalRegistros(): RegistroPGIRS[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REGISTROS);
    if (!raw) return getInitialDemoData();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error al leer registros de localStorage', e);
    return [];
  }
}

// Guardar registros locales
export function saveLocalRegistros(registros: RegistroPGIRS[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_REGISTROS, JSON.stringify(registros));
  } catch (e) {
    console.error('Error al guardar registros en localStorage', e);
  }
}

// Agregar o actualizar registro
export function upsertLocalRegistro(registro: RegistroPGIRS): RegistroPGIRS[] {
  const actuales = getLocalRegistros();
  const index = actuales.findIndex((r) => r.id === registro.id);
  let updated: RegistroPGIRS[];
  if (index >= 0) {
    updated = [...actuales];
    updated[index] = registro;
  } else {
    updated = [registro, ...actuales];
  }
  saveLocalRegistros(updated);
  return updated;
}

// Eliminar un registro
export function deleteLocalRegistro(id: string): RegistroPGIRS[] {
  const actuales = getLocalRegistros();
  const updated = actuales.filter((r) => r.id !== id);
  saveLocalRegistros(updated);
  return updated;
}

// Obtener el siguiente número consecutivo
export function getNextConsecutivo(registros: RegistroPGIRS[]): number {
  if (!registros.length) return 1;
  const max = Math.max(...registros.map((r) => r.numero || 0));
  return max + 1;
}

// Configuración de Google Sheets
export function getSheetsConfig(): GoogleSheetsConfig {
  const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyJMDPVRZreZZsBs8eh4iPxnp1iZ4anW9Vvt71S75aHA1ox5KHKyjdUq7aALvr9zt4x/exec';

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Actualizar a la versión más reciente del script provista por el usuario
      if (
        !parsed.scriptUrl || 
        parsed.scriptUrl.includes('AKfycbxGjG0ql3MMultuHcN1uHmgJ81PC9y8WKUF7xN4jRz2nlEmRtLal9G1YK068NM-7dKB') ||
        parsed.scriptUrl.includes('AKfycbzDieDlsSgGer-pmo63ceUJg586VgqMNkdCxvvs934HTtXjYnrLonxp1fxNBTjh_cy8')
      ) {
        parsed.scriptUrl = DEFAULT_SCRIPT_URL;
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(parsed));
      }
      return parsed;
    }
  } catch (e) {
    console.error('Error al leer config de Sheets', e);
  }
  return {
    spreadsheetId: '',
    sheetName: 'Capacitación Casa a Casa',
    spreadsheetUrl: '',
    scriptUrl: DEFAULT_SCRIPT_URL,
    autoSync: true,
  };
}

export function saveSheetsConfig(config: GoogleSheetsConfig): void {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
}

// Preferencias de sesión del encuestador
export function getSessionPreferences(): { encuestador: string; zona: string } {
  return {
    encuestador: localStorage.getItem(STORAGE_KEY_ENCUESTADOR) || '',
    zona: localStorage.getItem(STORAGE_KEY_ZONA) || 'Zona Centro - Sector 1',
  };
}

export function saveSessionPreferences(encuestador: string, zona: string): void {
  localStorage.setItem(STORAGE_KEY_ENCUESTADOR, encuestador);
  localStorage.setItem(STORAGE_KEY_ZONA, zona);
}

// Datos iniciales de demostración contextualizados en PGIRS
function getInitialDemoData(): RegistroPGIRS[] {
  const hoy = new Date().toISOString().split('T')[0];
  const demo: RegistroPGIRS[] = [
    {
      id: 'demo-1',
      numero: 1,
      zona: 'Sector 1 - Centro Histórico',
      fecha: hoy,
      hora: '08:30',
      encuestador: 'Carlos Mario Ruiz',
      direccion: 'Cra 14 # 23-45 Apto 201',
      nombrePersona: 'Ana Milena Gómez',
      telefono: '311 555 4321',
      personaAtendida: 'Propietario(a)',
      comprendioCambio: 'Sí',
      recibioVolante: 'Sí',
      conoceDiaA: 'Sí',
      conoceDiaB: 'Sí',
      dudaInquietud: 'Pregunta si las botellas de vidrio de gaseosa van en bolsa blanca o verde.',
      requiereSeguimiento: 'No',
      observaciones: 'Muy receptivo. Solicitó afiche para el pasillo del edificio.',
      sincronizado: false,
      fechaCreacion: Date.now() - 3600000 * 4,
    },
    {
      id: 'demo-2',
      numero: 2,
      zona: 'Sector 1 - Centro Histórico',
      fecha: hoy,
      hora: '09:15',
      encuestador: 'Carlos Mario Ruiz',
      direccion: 'Cra 14 # 23-57 Casa esquinera',
      nombrePersona: 'Héctor Fabio Vargas',
      telefono: '320 890 1234',
      personaAtendida: 'Arrendatario(a)',
      comprendioCambio: 'Sí',
      recibioVolante: 'Sí',
      conoceDiaA: 'No',
      conoceDiaB: 'Sí',
      dudaInquietud: 'No tenía claro el horario de entrega nocturno de orgánicos.',
      requiereSeguimiento: 'Sí',
      observaciones: 'Se le explicó que los orgánicos se sacan únicamente los martes y viernes de 7pm a 9pm.',
      sincronizado: false,
      fechaCreacion: Date.now() - 3600000 * 3,
    },
    {
      id: 'demo-3',
      numero: 3,
      zona: 'Sector 2 - Los Álamos',
      fecha: hoy,
      hora: '10:00',
      encuestador: 'Luisa Fernanda Gómez',
      direccion: 'Calle 18 # 8-12',
      nombrePersona: 'Beatriz Eugenia Salazar',
      telefono: '315 222 7890',
      personaAtendida: 'Familiar',
      comprendioCambio: 'No sabe/No responde',
      recibioVolante: 'Sí',
      conoceDiaA: 'No',
      conoceDiaB: 'No',
      dudaInquietud: 'Indica que los adultos mayores de la casa no manejan el código de colores.',
      requiereSeguimiento: 'Sí',
      observaciones: 'Dejar material gráfico impreso con tipografía grande y volver en la jornada de refuerzo.',
      sincronizado: false,
      fechaCreacion: Date.now() - 3600000 * 2,
    },
    {
      id: 'demo-4',
      numero: 4,
      zona: 'Sector 2 - Los Álamos',
      fecha: hoy,
      hora: '10:45',
      encuestador: 'Luisa Fernanda Gómez',
      direccion: 'Calle 18 # 8-36 Local Comercial',
      nombrePersona: 'Jorge Iván Mejía',
      telefono: '310 444 9876',
      personaAtendida: 'Otro',
      comprendioCambio: 'Sí',
      recibioVolante: 'Sí',
      conoceDiaA: 'Sí',
      conoceDiaB: 'Sí',
      dudaInquietud: 'Genera residuos de empaque de alimentos preparados.',
      requiereSeguimiento: 'No',
      observaciones: 'Encargado del local. Tienen contratado reciclador de oficio de la asociación local.',
      sincronizado: false,
      fechaCreacion: Date.now() - 3600000 * 1,
    }
  ];
  saveLocalRegistros(demo);
  return demo;
}
