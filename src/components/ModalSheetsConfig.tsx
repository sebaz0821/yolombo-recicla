import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  PlusCircle, 
  LogOut, 
  Copy, 
  Check, 
  ShieldCheck, 
  Zap, 
  Globe, 
  Code
} from 'lucide-react';
import { GoogleSheetsConfig, RegistroPGIRS } from '../types';
import { 
  createPGIRSSpreadsheet, 
  appendRegistrosToSheet,
  clearStoredGoogleToken,
  saveStoredGoogleToken,
  syncWithAppsScript
} from '../sheetsService';

interface ModalSheetsProps {
  isOpen: boolean;
  onClose: () => void;
  config: GoogleSheetsConfig;
  onSaveConfig: (config: GoogleSheetsConfig) => void;
  accessToken: string | null;
  onAuthSuccess: (token: string) => void;
  registros: RegistroPGIRS[];
  onRegistrosActualizados: (nuevos: RegistroPGIRS[]) => void;
}

export const ModalSheetsConfig: React.FC<ModalSheetsProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  accessToken,
  onAuthSuccess,
  registros,
  onRegistrosActualizados,
}) => {
  const [spreadsheetId, setSpreadsheetId] = useState(config.spreadsheetId || '');
  const [sheetName, setSheetName] = useState(config.sheetName || 'Capacitación Casa a Casa');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(config.spreadsheetUrl || '');
  const [scriptUrl, setScriptUrl] = useState(
    config.scriptUrl || 'https://script.google.com/macros/s/AKfycbyJMDPVRZreZZsBs8eh4iPxnp1iZ4anW9Vvt71S75aHA1ox5KHKyjdUq7aALvr9zt4x/exec'
  );
  const [activeSubTab, setActiveSubTab] = useState<'appscript' | 'oauth'>('appscript');
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [mostrarCodigoAppsScript, setMostrarCodigoAppsScript] = useState(false);

  if (!isOpen) return null;

  // Iniciar flujo OAuth de Google
  const handleConectarGoogle = () => {
    const oauthClientId = '654072599879-ai-studio.apps.googleusercontent.com';
    if (typeof (window as any).google !== 'undefined' && (window as any).google.accounts?.oauth2) {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: oauthClientId,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
        callback: (response: any) => {
          if (response.access_token) {
            saveStoredGoogleToken(response.access_token, response.expires_in);
            onAuthSuccess(response.access_token);
            setStatusMessage({ text: '¡Conectado exitosamente con tu cuenta de Google!', type: 'success' });
          } else if (response.error) {
            setStatusMessage({ text: `Error de autenticación: ${response.error}`, type: 'error' });
          }
        },
      });
      client.requestAccessToken();
    } else {
      const manualToken = prompt('Ingresa el token de acceso de Google:');
      if (manualToken) {
        saveStoredGoogleToken(manualToken.trim());
        onAuthSuccess(manualToken.trim());
        setStatusMessage({ text: 'Token registrado correctamente.', type: 'success' });
      }
    }
  };

  const handleDesconectar = () => {
    clearStoredGoogleToken();
    onAuthSuccess('');
    setStatusMessage({ text: 'Desconectado de Google.', type: 'info' });
  };

  // Guardar configuración del Web App de Apps Script
  const handleGuardarAppsScript = () => {
    if (!scriptUrl.trim()) {
      setStatusMessage({ text: 'Por favor ingresa la URL del Web App de Apps Script.', type: 'error' });
      return;
    }
    const nuevaCfg: GoogleSheetsConfig = {
      ...config,
      scriptUrl: scriptUrl.trim(),
    };
    onSaveConfig(nuevaCfg);
    setStatusMessage({ text: '¡URL de Apps Script guardada y activada como método de sincronización!', type: 'success' });
  };

  // Crear una nueva Hoja automática con OAuth
  const handleCrearHojaAutomatica = async () => {
    if (!accessToken) {
      setStatusMessage({ text: 'Primero conecta tu cuenta de Google.', type: 'error' });
      return;
    }
    setIsCreating(true);
    setStatusMessage({ text: 'Creando hoja de cálculo en tu Google Drive...', type: 'info' });
    try {
      const res = await createPGIRSSpreadsheet(
        accessToken,
        `PGIRS - Capacitación Casa a Casa - ${new Date().toLocaleDateString('es-CO')}`
      );
      setSpreadsheetId(res.spreadsheetId);
      setSpreadsheetUrl(res.spreadsheetUrl);

      const nuevaCfg: GoogleSheetsConfig = {
        ...config,
        spreadsheetId: res.spreadsheetId,
        sheetName: 'Capacitación Casa a Casa',
        spreadsheetUrl: res.spreadsheetUrl,
      };
      onSaveConfig(nuevaCfg);
      setStatusMessage({
        text: '¡Hoja creada con éxito en Google Drive con las columnas del PGIRS!',
        type: 'success',
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Error al crear hoja: ${err.message}`, type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  // Guardar ID manual
  const handleGuardarManual = () => {
    let cleanId = spreadsheetId.trim();
    const match = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      cleanId = match[1];
    }

    const nuevaCfg: GoogleSheetsConfig = {
      ...config,
      spreadsheetId: cleanId,
      sheetName: sheetName.trim() || 'Capacitación Casa a Casa',
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}`,
    };
    onSaveConfig(nuevaCfg);
    setSpreadsheetId(cleanId);
    setStatusMessage({ text: 'Configuración de hoja guardada correctamente.', type: 'success' });
  };

  // Sincronizar todos los registros locales pendientes
  const handleSincronizarPendientes = async () => {
    const pendientes = registros.filter((r) => !r.sincronizado);
    if (pendientes.length === 0) {
      setStatusMessage({ text: 'No hay visitas pendientes por subir.', type: 'info' });
      return;
    }

    setIsSyncingAll(true);
    setStatusMessage({ text: `Subiendo ${pendientes.length} visitas a Google Sheets...`, type: 'info' });

    try {
      if (scriptUrl && scriptUrl.trim().length > 10) {
        // Enviar vía Google Apps Script Webhook
        await syncWithAppsScript(scriptUrl.trim(), pendientes, sheetName);
      } else if (accessToken && spreadsheetId.trim()) {
        // Enviar vía Google Sheets API REST
        await appendRegistrosToSheet(accessToken, spreadsheetId, sheetName, pendientes);
      } else {
        throw new Error('Configura el enlace de Apps Script o conecta Google Sheets para sincronizar.');
      }

      // Marcar como sincronizados localmente
      const actualizados = registros.map((r) => {
        if (!r.sincronizado) {
          return { ...r, sincronizado: true, fechaSincronizado: Date.now() };
        }
        return r;
      });
      onRegistrosActualizados(actualizados);

      setStatusMessage({
        text: `¡Se subieron con éxito ${pendientes.length} registros a tu Google Sheet!`,
        type: 'success',
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Error de sincronización: ${err.message}`, type: 'error' });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const copiarEnlace = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const pendientesCount = registros.filter((r) => !r.sincronizado).length;

  const scriptEjemplo = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT - PGIRS CAPACITACIÓN CASA A CASA (VERSIÓN AUTO-ORGANIZADA)
 * =========================================================================
 * Este script:
 * 1. Crea la pestaña "Capacitación Casa a Casa" si no existe.
 * 2. Si las cabeceras están desordenadas, las actualiza al orden exacto oficial.
 * 3. Asigna anchos de columnas óptimos y auto-ajuste de texto.
 * 4. Aplica el encabezado azul institucional (#1F4E78) idéntico al formato.
 * 5. Agrega los datos en el orden exacto de columnas y evita duplicados por ID.
 * 6. Alinea los datos (números, Sí/No centrados, fechas y nombres organizados).
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000); // 15 segundos para asegurar concurrencia sin choques

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = "Capacitación Casa a Casa";
    var sheet = ss.getSheetByName(sheetName);

    // Cabeceras oficiales en el orden exacto de la aplicación
    var headers = [
      "N.º",
      "Dirección / referencia de vivienda",
      "Nombre de quien atendió",
      "Teléfono de contacto",
      "Persona atendida (Rol)",
      "Comprendió el cambio",
      "Recibió volante",
      "Conoce Día A",
      "Conoce Día B",
      "Duda / inquietud",
      "¿Requiere seguimiento?",
      "Observaciones",
      "Zona / Sector",
      "Fecha",
      "Hora",
      "Encuestador",
      "ID Registro Local"
    ];

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    // Verificar si la fila 1 tiene las cabeceras exactas o si la hoja está vacía
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (lastRow === 0 || lastCol < headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      // Si la fila 1 ya tiene datos, asegurar que tenga el título exacto en la columna correspondiente
      var currentHeaders = sheet.getRange(1, 1, 1, Math.max(lastCol, headers.length)).getValues()[0];
      var headersCoinciden = true;
      for (var h = 0; h < headers.length; h++) {
        if (currentHeaders[h] !== headers[h]) {
          headersCoinciden = false;
          break;
        }
      }
      if (!headersCoinciden) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
    }

    // Aplicar estilo institucional al encabezado (Azul #1F4E78, texto blanco negrita, centrado)
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#1f4e78");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setFontSize(10);
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    headerRange.setWrap(true);
    sheet.setRowHeight(1, 38);
    sheet.setFrozenRows(1);

    // Obtener los IDs que ya están en la hoja para evitar filas duplicadas si reintentan el envío
    var existingIds = {};
    if (sheet.getLastRow() > 1) {
      var idValues = sheet.getRange(2, 17, sheet.getLastRow() - 1, 1).getValues();
      for (var k = 0; k < idValues.length; k++) {
        if (idValues[k][0]) {
          existingIds[String(idValues[k][0])] = true;
        }
      }
    }

    var data = JSON.parse(e.postData.contents);
    var filasParaInsertar = [];

    // Priorizar data.registros para armar la fila en el orden canónico
    if (data.registros && data.registros.length > 0) {
      for (var i = 0; i < data.registros.length; i++) {
        var r = data.registros[i];
        if (r.id && existingIds[String(r.id)]) {
          continue; // Ya existe en la hoja, no duplicar
        }
        filasParaInsertar.push([
          r.numero || "",
          r.direccion || "",
          r.nombrePersona || "",
          r.telefono || "",
          r.personaAtendida || "",
          r.comprendioCambio || "",
          r.recibioVolante || "",
          r.conoceDiaA || "",
          r.conoceDiaB || "",
          r.dudaInquietud || "",
          r.requiereSeguimiento || "",
          r.observaciones || "",
          r.zona || "",
          r.fecha || "",
          r.hora || "",
          r.encuestador || "",
          r.id || ""
        ]);
      }
    } else if (data.rows && data.rows.length > 0) {
      for (var j = 0; j < data.rows.length; j++) {
        var row = data.rows[j];
        var rowId = row[16];
        if (rowId && existingIds[String(rowId)]) {
          continue;
        }
        filasParaInsertar.push(row);
      }
    }

    // Insertar en bloque para máxima velocidad y orden
    if (filasParaInsertar.length > 0) {
      var startRow = sheet.getLastRow() + 1;
      var numRows = filasParaInsertar.length;
      var numCols = headers.length;
      var dataRange = sheet.getRange(startRow, 1, numRows, numCols);
      
      dataRange.setValues(filasParaInsertar);
      dataRange.setFontSize(10);
      dataRange.setVerticalAlignment("middle");
      dataRange.setWrap(true);

      // Alineaciones estéticas según el tipo de dato:
      // Col 1 (N.º): Centrado
      sheet.getRange(startRow, 1, numRows, 1).setHorizontalAlignment("center");
      // Col 2 (Dirección): Izquierda
      sheet.getRange(startRow, 2, numRows, 1).setHorizontalAlignment("left");
      // Col 3 (Nombre): Izquierda
      sheet.getRange(startRow, 3, numRows, 1).setHorizontalAlignment("left");
      // Col 4 (Teléfono): Centrado
      sheet.getRange(startRow, 4, numRows, 1).setHorizontalAlignment("center");
      // Col 5 (Rol): Centrado
      sheet.getRange(startRow, 5, numRows, 1).setHorizontalAlignment("center");
      // Col 6, 7, 8, 9 (Sí/No/Días): Centrado
      sheet.getRange(startRow, 6, numRows, 4).setHorizontalAlignment("center");
      // Col 10 (Duda): Izquierda
      sheet.getRange(startRow, 10, numRows, 1).setHorizontalAlignment("left");
      // Col 11 (Requiere seguimiento): Centrado
      sheet.getRange(startRow, 11, numRows, 1).setHorizontalAlignment("center");
      // Col 12 (Observaciones): Izquierda
      sheet.getRange(startRow, 12, numRows, 1).setHorizontalAlignment("left");
      // Col 13, 14, 15, 16, 17 (Zona, Fecha, Hora, Encuestador, ID): Centrado / Izquierda
      sheet.getRange(startRow, 13, numRows, 5).setHorizontalAlignment("center");
    }

    // Ancho sugerido de columnas para que se lea perfecto
    var anchos = [50, 220, 180, 120, 130, 95, 95, 95, 95, 180, 110, 180, 140, 95, 80, 150, 110];
    for (var colIdx = 0; colIdx < anchos.length; colIdx++) {
      sheet.setColumnWidth(colIdx + 1, anchos[colIdx]);
    }

    return ContentService.createTextOutput(
      JSON.stringify({
        status: "success",
        insertados: filasParaInsertar.length,
        message: "Registros organizados y almacenados con éxito en Google Sheets"
      })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "error",
        message: error.toString()
      })
    ).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

// Función GET para probar en el navegador que el Web App está activo
function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: "active",
      servicio: "PGIRS Casa a Casa",
      version: "2.0 Auto-Organizada",
      columnas: 17
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

// Función utilitaria para organizar manualmente una hoja ya existente desde el editor de Apps Script
function organizarHojaExistente() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Capacitación Casa a Casa") || ss.getActiveSheet();
  
  var headers = [
    "N.º",
    "Dirección / referencia de vivienda",
    "Nombre de quien atendió",
    "Teléfono de contacto",
    "Persona atendida (Rol)",
    "Comprendió el cambio",
    "Recibió volante",
    "Conoce Día A",
    "Conoce Día B",
    "Duda / inquietud",
    "¿Requiere seguimiento?",
    "Observaciones",
    "Zona / Sector",
    "Fecha",
    "Hora",
    "Encuestador",
    "ID Registro Local"
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#1f4e78");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setRowHeight(1, 38);
  sheet.setFrozenRows(1);
  
  var anchos = [50, 220, 180, 120, 130, 95, 95, 95, 95, 180, 110, 180, 140, 95, 80, 150, 110];
  for (var colIdx = 0; colIdx < anchos.length; colIdx++) {
    sheet.setColumnWidth(colIdx + 1, anchos[colIdx]);
  }
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera modal */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-sky-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white p-1 shadow-sm shrink-0 flex items-center justify-center ring-2 ring-emerald-400/40">
              <img src="/logo.png" alt="Yolombó Recicla" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Integración con Google Sheets</h3>
              <p className="text-xs text-emerald-100/90">
                Sincronización directa para Yolombó Recicla PGIRS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Mensaje de estado */}
        {statusMessage && (
          <div
            className={`px-5 py-3 text-xs flex items-center justify-between border-b ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-sky-50 text-sky-800 border-sky-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="font-bold text-sm ml-2">
              ×
            </button>
          </div>
        )}

        {/* Pestañas de conexión */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3">
          <button
            onClick={() => setActiveSubTab('appscript')}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition ${
              activeSubTab === 'appscript'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe className="w-4 h-4" /> Enlace Apps Script Web (Recomendado)
          </button>
          <button
            onClick={() => setActiveSubTab('oauth')}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition ${
              activeSubTab === 'oauth'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Conexión Directa Google OAuth
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-sm text-slate-700">
          {activeSubTab === 'appscript' ? (
            /* Método Google Apps Script provisto por el usuario */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Webhook Google Apps Script
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Activo
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Permite a cualquier encuestador enviar las visitas de capacitación a tu Google Sheet
                  sin necesidad de iniciar sesión en Google en cada celular o tableta en campo.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    URL del Web App (macros/s/.../exec)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={scriptUrl}
                      onChange={(e) => setScriptUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="flex-1 text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                    />
                    <button
                      onClick={handleGuardarAppsScript}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition shadow-xs"
                    >
                      Guardar
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    Hoja destino:{' '}
                    <input
                      type="text"
                      value={sheetName}
                      onChange={(e) => setSheetName(e.target.value)}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-800 text-[11px] font-semibold"
                    />
                  </span>
                  <button
                    onClick={() => setMostrarCodigoAppsScript(!mostrarCodigoAppsScript)}
                    className="text-xs text-emerald-700 hover:underline font-semibold flex items-center gap-1"
                  >
                    <Code className="w-3.5 h-3.5" />
                    {mostrarCodigoAppsScript ? 'Ocultar código' : 'Ver código de Apps Script'}
                  </button>
                </div>

                {mostrarCodigoAppsScript && (
                  <div className="mt-2 bg-slate-900 text-emerald-300 p-3 rounded-xl text-[11px] font-mono overflow-x-auto relative">
                    <pre>{scriptEjemplo}</pre>
                    <button
                      onClick={() => copiarEnlace(scriptEjemplo)}
                      className="absolute top-2 right-2 px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] text-white flex items-center gap-1"
                    >
                      {copiado ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      Copiar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Método OAuth Estándar */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Cuenta de Google
                  </span>
                  {accessToken ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Conectado
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      No conectado
                    </span>
                  )}
                </div>

                {accessToken ? (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className="text-xs text-slate-600">
                      Sesión activa con permisos para crear y modificar hojas en tu Drive.
                    </p>
                    <button
                      onClick={handleDesconectar}
                      className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 font-semibold flex items-center gap-1 transition shrink-0"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Desconectar
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-slate-600 mb-3">
                      Inicia sesión para crear una hoja oficial directamente en tu Drive.
                    </p>
                    <button
                      onClick={handleConectarGoogle}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 text-xs"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Conectar con Google
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <button
                  type="button"
                  onClick={handleCrearHojaAutomatica}
                  disabled={isCreating || !accessToken}
                  className="w-full py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                >
                  <PlusCircle className="w-4 h-4" />
                  {isCreating ? 'Creando Hoja Oficial...' : 'Crear Hoja Oficial en Google Drive'}
                </button>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    O pegar ID / Enlace de Hoja de Google existente:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={spreadsheetId}
                      onChange={(e) => setSpreadsheetId(e.target.value)}
                      placeholder="Ej: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                      className="flex-1 text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <button
                      onClick={handleGuardarManual}
                      className="px-3.5 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sincronización Inmediata */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-600" /> Sincronización Inmediata
              </span>
              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                {pendientesCount} pendientes de subida
              </span>
            </div>

            <button
              onClick={handleSincronizarPendientes}
              disabled={isSyncingAll || pendientesCount === 0}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 text-xs disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingAll ? 'animate-spin' : ''}`} />
              {isSyncingAll
                ? 'Sincronizando con Google Sheets...'
                : `Sincronizar ${pendientesCount} visitas pendientes`}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition"
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
