import { RegistroPGIRS } from './types';

// Cabeceras exactas para la hoja:
// N.º | Dirección / referencia de vivienda | Nombre persona atendida | Teléfono | Rol / Persona atendida | Comprendió el cambio | Recibió volante | Conoce Día A | Conoce Día B | Duda / inquietud | ¿Requiere seguimiento? | Observaciones
// + Metadatos de auditoría: Zona | Fecha | Hora | Encuestador | ID Registro Local
export const SHEET_HEADERS = [
  'N.º',
  'Dirección / referencia de vivienda',
  'Nombre de quien atendió',
  'Teléfono de contacto',
  'Persona atendida (Rol)',
  'Comprendió el cambio',
  'Recibió volante',
  'Conoce Día A',
  'Conoce Día B',
  'Duda / inquietud',
  '¿Requiere seguimiento?',
  'Observaciones',
  'Zona / Sector',
  'Fecha',
  'Hora',
  'Encuestador',
  'ID Registro Local',
];

// Comprueba si hay un token válido almacenado
export function getStoredGoogleToken(): string | null {
  return localStorage.getItem('pgirs_google_access_token');
}

export function saveStoredGoogleToken(token: string, expiresInSeconds: number = 3500): void {
  localStorage.setItem('pgirs_google_access_token', token);
  const expiryTime = Date.now() + expiresInSeconds * 1000;
  localStorage.setItem('pgirs_google_token_expiry', expiryTime.toString());
}

export function clearStoredGoogleToken(): void {
  localStorage.removeItem('pgirs_google_access_token');
  localStorage.removeItem('pgirs_google_token_expiry');
  localStorage.removeItem('pgirs_google_user_email');
}

export function isTokenValid(): boolean {
  const token = getStoredGoogleToken();
  const expiry = localStorage.getItem('pgirs_google_token_expiry');
  if (!token || !expiry) return false;
  return Date.now() < parseInt(expiry, 10);
}

// Convertir un registro a una fila de Google Sheets
export function registroToRow(reg: RegistroPGIRS): (string | number)[] {
  return [
    reg.numero,
    reg.direccion,
    reg.nombrePersona || '',
    reg.telefono || '',
    reg.personaAtendida,
    reg.comprendioCambio,
    reg.recibioVolante,
    reg.conoceDiaA,
    reg.conoceDiaB,
    reg.dudaInquietud || '',
    reg.requiereSeguimiento,
    reg.observaciones || '',
    reg.zona,
    reg.fecha,
    reg.hora,
    reg.encuestador,
    reg.id,
  ];
}

// Crear una nueva Hoja de Cálculo en Google Drive
export async function createPGIRSSpreadsheet(
  accessToken: string,
  title: string = 'PGIRS - Registro Capacitacion Casa a Casa'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'Capacitación Casa a Casa',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Error al crear la hoja de cálculo: ${err}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl;

  // Insertar cabecera con estilo corporativo PGIRS (azul oscuro como en la imagen)
  await setupSheetHeaderAndFormatting(accessToken, spreadsheetId, 'Capacitación Casa a Casa');

  return { spreadsheetId, spreadsheetUrl };
}

// Dar formato y agregar cabeceras exactas
export async function setupSheetHeaderAndFormatting(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string = 'Capacitación Casa a Casa'
): Promise<void> {
  // 1. Agregar valores de cabecera en fila 1
  const updateRangeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    sheetName
  )}!A1:O1?valueInputOption=USER_ENTERED`;

  await fetch(updateRangeUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: `${sheetName}!A1:O1`,
      majorDimension: 'ROWS',
      values: [SHEET_HEADERS],
    }),
  });

  // 2. Dar formato visual con el azul de la imagen de referencia: #1b4965 / #1f4e78
  try {
    const batchUpdateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    await fetch(batchUpdateUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: SHEET_HEADERS.length,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.11,
                    green: 0.29,
                    blue: 0.44, // Color azul oscuro exacto de la tabla de la imagen
                  },
                  textFormat: {
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    bold: true,
                    fontSize: 10,
                  },
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE',
                  wrapStrategy: 'WRAP',
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)',
            },
          },
          {
            updateSheetProperties: {
              properties: {
                sheetId: 0,
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
              fields: 'gridProperties.frozenRowCount',
            },
          },
        ],
      }),
    });
  } catch (e) {
    console.warn('Formato opcional no aplicado:', e);
  }
}

// Sincronizar un lote de registros con Google Apps Script Web App (Webhook directo sin pedir login a cada encuestador)
export async function syncWithAppsScript(
  scriptUrl: string,
  registros: RegistroPGIRS[],
  sheetName: string = 'Capacitación Casa a Casa'
): Promise<{ success: boolean; message?: string }> {
  if (!registros.length) return { success: true };

  const rows = registros.map((r) => registroToRow(r));
  const payload = {
    action: 'appendRows',
    sheetName,
    headers: SHEET_HEADERS,
    registros: registros,
    rows: rows,
    timestamp: new Date().toISOString(),
  };

  try {
    // Intentar envío POST con no-cors o text/plain para evitar bloqueos CORS clásicos de Google Apps Script
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      try {
        const json = await response.json();
        return { success: true, message: json.message || 'Sincronizado con éxito' };
      } catch (e) {
        return { success: true, message: 'Datos enviados al Apps Script' };
      }
    }
  } catch (err) {
    // Si hay error de CORS estándar en browser hacia Apps Script, intentamos modo no-cors
    try {
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });
      return { success: true, message: 'Datos enviados al Apps Script (modo seguro)' };
    } catch (e2: any) {
      throw new Error(`Error al enviar datos a Google Apps Script: ${e2.message || err}`);
    }
  }

  return { success: true };
}

// Sincronizar un lote de registros con Google Sheets (API REST v4)
export async function appendRegistrosToSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  registros: RegistroPGIRS[]
): Promise<number> {
  if (!registros.length) return 0;

  const rows = registros.map((r) => registroToRow(r));
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    sheetName
  )}!A:O:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: `${sheetName}!A:O`,
      majorDimension: 'ROWS',
      values: rows,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Error al sincronizar con Sheets (${response.status}): ${errorData}`);
  }

  const result = await response.json();
  const updatedRows = result.updates?.updatedRows || registros.length;
  return updatedRows;
}

// Leer datos desde Google Sheets para comprobar conexión o descargar registros ya existentes
export async function fetchSheetData(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<{ headers: string[]; rows: any[][] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    sheetName
  )}!A1:Z5000`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Error al leer datos de la hoja: ${err}`);
  }

  const data = await response.json();
  const values = data.values || [];
  if (values.length === 0) {
    return { headers: [], rows: [] };
  }
  return {
    headers: values[0] || [],
    rows: values.slice(1),
  };
}

// Obtener info del usuario de Google usando token
export async function getGoogleUserProfile(accessToken: string): Promise<{ name?: string; email?: string; picture?: string } | null> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error('Error fetching user profile', e);
  }
  return null;
}
