import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  BarChart3, 
  Wifi, 
  WifiOff, 
  FileSpreadsheet, 
  Plus, 
  RotateCw, 
  CheckCircle2, 
  Layers, 
  ShieldCheck,
  Building,
  Sparkles,
  Info,
  Calendar
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { RegistroPGIRS, GoogleSheetsConfig } from './types';
import { 
  getLocalRegistros, 
  saveLocalRegistros, 
  upsertLocalRegistro, 
  deleteLocalRegistro, 
  getSheetsConfig, 
  saveSheetsConfig 
} from './storage';
import { 
  getStoredGoogleToken, 
  isTokenValid, 
  appendRegistrosToSheet,
  getGoogleUserProfile,
  syncWithAppsScript
} from './sheetsService';
import { FormularioVisita } from './components/FormularioVisita';
import { TablaRegistros } from './components/TablaRegistros';
import { InformesCobertura } from './components/InformesCobertura';
import { ModalSheetsConfig } from './components/ModalSheetsConfig';

export default function App() {
  const [activeTab, setActiveTab] = useState<'registro' | 'tabla' | 'informes'>('tabla');
  const [registros, setRegistros] = useState<RegistroPGIRS[]>([]);
  const [registroEditando, setRegistroEditando] = useState<RegistroPGIRS | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(getSheetsConfig());
  const [accessToken, setAccessToken] = useState<string | null>(getStoredGoogleToken());
  const [modalSheetsAbierto, setModalSheetsAbierto] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Cargar datos locales al iniciar
  useEffect(() => {
    const data = getLocalRegistros();
    setRegistros(data);

    // Escuchar estado de conexión de red
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Conexión a internet restablecida.', 'info');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Modo sin conexión activado. Los datos se guardan en el dispositivo.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Guardar nueva visita o visita editada
  const handleGuardarVisita = async (nuevoRegistro: RegistroPGIRS) => {
    const actualizados = upsertLocalRegistro(nuevoRegistro);
    setRegistros(actualizados);
    setRegistroEditando(null);

    // Animación visual de éxito
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (e) {
      // Ignorar si falla
    }

    // Si hay conexión y scriptUrl configurada (o OAuth token), auto-sincronizar de inmediato
    if (isOnline && (sheetsConfig.scriptUrl || (accessToken && sheetsConfig.spreadsheetId))) {
      try {
        if (sheetsConfig.scriptUrl) {
          await syncWithAppsScript(sheetsConfig.scriptUrl, [nuevoRegistro], sheetsConfig.sheetName);
        } else if (accessToken && sheetsConfig.spreadsheetId) {
          await appendRegistrosToSheet(
            accessToken,
            sheetsConfig.spreadsheetId,
            sheetsConfig.sheetName,
            [nuevoRegistro]
          );
        }

        // Marcar como sincronizado
        const sincronizadoList = actualizados.map((r) =>
          r.id === nuevoRegistro.id ? { ...r, sincronizado: true, fechaSincronizado: Date.now() } : r
        );
        saveLocalRegistros(sincronizadoList);
        setRegistros(sincronizadoList);
        showToast('¡Visita registrada y sincronizada en tiempo real con Google Sheets!', 'success');
      } catch (err: any) {
        console.warn('Auto-sync falló, guardado localmente:', err);
        showToast('Visita guardada localmente (pendiente de subir a Sheets).', 'info');
      }
    } else {
      showToast('¡Visita guardada localmente con éxito (Modo Offline)!', 'success');
    }

    // Regresar a la tabla
    setActiveTab('tabla');
  };

  const handleEditarVisita = (reg: RegistroPGIRS) => {
    setRegistroEditando(reg);
    setActiveTab('registro');
  };

  const handleEliminarVisita = (id: string) => {
    const rest = deleteLocalRegistro(id);
    setRegistros(rest);
    showToast('Registro eliminado de la memoria local.', 'info');
  };

  // Sincronizar todos los pendientes
  const handleSincronizarPendientes = async () => {
    if (!isOnline) {
      showToast('No tienes conexión a internet para sincronizar.', 'error');
      return;
    }

    const hasAppsScript = Boolean(sheetsConfig.scriptUrl && sheetsConfig.scriptUrl.trim().length > 10);
    const hasOAuth = Boolean(accessToken && sheetsConfig.spreadsheetId);

    if (!hasAppsScript && !hasOAuth) {
      setModalSheetsAbierto(true);
      showToast('Configura el enlace de Apps Script o conecta Google Sheets.', 'info');
      return;
    }

    const pendientes = registros.filter((r) => !r.sincronizado);
    if (!pendientes.length) {
      showToast('Todas las visitas ya están sincronizadas con Google Sheets.', 'info');
      return;
    }

    setIsSyncing(true);
    try {
      if (hasAppsScript) {
        await syncWithAppsScript(sheetsConfig.scriptUrl!, pendientes, sheetsConfig.sheetName);
      } else {
        await appendRegistrosToSheet(
          accessToken!,
          sheetsConfig.spreadsheetId,
          sheetsConfig.sheetName,
          pendientes
        );
      }

      const actualizados = registros.map((r) =>
        r.sincronizado ? r : { ...r, sincronizado: true, fechaSincronizado: Date.now() }
      );
      saveLocalRegistros(actualizados);
      setRegistros(actualizados);
      showToast(`¡Se han sincronizado ${pendientes.length} visitas con Google Sheets!`, 'success');

      try {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (e) {}
    } catch (err: any) {
      console.error(err);
      showToast(`Error al sincronizar: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const totalPendientes = registros.filter((r) => !r.sincronizado).length;

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 flex flex-col font-sans">
      {/* Toast flotante */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold text-white ${
              toast.type === 'success'
                ? 'bg-emerald-700 border-emerald-600'
                : toast.type === 'error'
                ? 'bg-rose-700 border-rose-600'
                : 'bg-slate-800 border-slate-700'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            ) : (
              <Info className="w-4 h-4 text-sky-300" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Barra de Navegación Superior */}
      <header className="bg-[#133e63] text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative group shrink-0">
              <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-white p-1 shadow-md shadow-black/25 ring-2 ring-emerald-400/60 flex items-center justify-center overflow-hidden transition-transform transform group-hover:scale-105">
                <img
                  src="/logo.png"
                  alt="Logo Yolombó Recicla"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#133e63] shadow-xs"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-black tracking-tight leading-tight text-white flex items-center gap-1.5">
                  <span>Yolombó Recicla</span>
                </h1>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500 text-slate-950 tracking-wider shadow-xs">
                  PGIRS Oficial
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/90 font-medium">
                Capacitación Casa a Casa • Gestión y Separación de Residuos
              </p>
            </div>
          </div>

          {/* Indicadores de Estado: Online/Offline y Google Sheets */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Indicador de Conexión */}
            <div
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition ${
                isOnline
                  ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-500/40'
                  : 'bg-amber-900/60 text-amber-200 border border-amber-500/40'
              }`}
              title={isOnline ? 'Conectado a Internet' : 'Sin Internet (Modo Local Offline)'}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden md:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>Offline</span>
                </>
              )}
            </div>

            {/* Botón de Google Sheets */}
            <button
              onClick={() => setModalSheetsAbierto(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
                sheetsConfig.scriptUrl || (sheetsConfig.spreadsheetId && accessToken)
                  ? 'bg-emerald-600/90 hover:bg-emerald-600 text-white border-emerald-400/40 shadow-xs'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
              <span className="hidden sm:inline">
                {sheetsConfig.scriptUrl ? 'Apps Script Activo' : sheetsConfig.spreadsheetId ? 'Sheets Conectado' : 'Conectar Sheets'}
              </span>
              {totalPendientes > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-900 text-[10px] font-black flex items-center justify-center">
                  {totalPendientes}
                </span>
              )}
            </button>

            {/* Botón rápido para registrar nueva casa */}
            {activeTab !== 'registro' && (
              <button
                onClick={() => {
                  setRegistroEditando(null);
                  setActiveTab('registro');
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md flex items-center gap-1 transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nueva Visita</span>
              </button>
            )}
          </div>
        </div>

        {/* Pestañas de Navegación Principal */}
        <div className="bg-[#0e2f4c] px-4 sm:px-6 border-t border-white/10">
          <div className="max-w-7xl mx-auto flex gap-1">
            <button
              onClick={() => {
                setRegistroEditando(null);
                setActiveTab('tabla');
              }}
              className={`py-2.5 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition ${
                activeTab === 'tabla'
                  ? 'border-emerald-400 text-emerald-300 bg-white/5'
                  : 'border-transparent text-slate-300 hover:text-white'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Seguimiento Casa a Casa
              <span className="px-1.5 py-0.2 rounded-full bg-white/15 text-[11px] font-mono">
                {registros.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('registro')}
              className={`py-2.5 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition ${
                activeTab === 'registro'
                  ? 'border-emerald-400 text-emerald-300 bg-white/5'
                  : 'border-transparent text-slate-300 hover:text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              {registroEditando ? 'Editar Visita' : 'Formulario de Capacitación'}
            </button>

            <button
              onClick={() => setActiveTab('informes')}
              className={`py-2.5 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition ${
                activeTab === 'informes'
                  ? 'border-emerald-400 text-emerald-300 bg-white/5'
                  : 'border-transparent text-slate-300 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Informes de Cobertura por Zonas
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Dinámico */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        {/* Banner de Sincronización si hay pendientes */}
        {totalPendientes > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-amber-200 text-amber-900 rounded-xl">
                <RotateCw className="w-5 h-5 animate-spin" />
              </span>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                  {totalPendientes} {totalPendientes === 1 ? 'visita guardada' : 'visitas guardadas'} en tu dispositivo sin subir a Google Sheets
                </h4>
                <p className="text-xs text-amber-800">
                  {isOnline
                    ? 'Tienes conexión a internet activa. Puedes enviarlas a la base de datos ahora.'
                    : 'Modo Offline: Tan pronto recuperes señal podrás sincronizarlas con un clic.'}
                </p>
              </div>
            </div>

            <button
              onClick={handleSincronizarPendientes}
              disabled={isSyncing || !isOnline}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {isSyncing ? 'Subiendo a Sheets...' : 'Sincronizar Ahora'}
            </button>
          </div>
        )}

        {/* Vista: Tabla de Registros */}
        {activeTab === 'tabla' && (
          <TablaRegistros
            registros={registros}
            onEditar={handleEditarVisita}
            onEliminar={handleEliminarVisita}
            onSincronizarPendientes={handleSincronizarPendientes}
            isSyncing={isSyncing}
            sheetsConectado={Boolean(sheetsConfig.scriptUrl || (sheetsConfig.spreadsheetId && accessToken))}
          />
        )}

        {/* Vista: Formulario de Visita */}
        {activeTab === 'registro' && (
          <div className="max-w-3xl mx-auto">
            <FormularioVisita
              onGuardar={handleGuardarVisita}
              registrosExistentes={registros}
              onCancelar={() => setActiveTab('tabla')}
              registroEditando={registroEditando}
            />
          </div>
        )}

        {/* Vista: Informes de Cobertura */}
        {activeTab === 'informes' && <InformesCobertura registros={registros} />}
      </main>

      {/* Footer Yolombó Recicla */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-slate-50 p-1 border border-slate-200 shadow-2xs">
            <img src="/logo.png" alt="Yolombó Recicla" className="w-full h-full object-contain" />
          </div>
          <p className="font-bold text-slate-700">Yolombó Recicla • Plan de Gestión Integral de Residuos Sólidos (PGIRS)</p>
          <p className="text-[11px] text-slate-400 max-w-lg">
            Herramienta oficial de campo para encuestadores y capacitación comunitaria. Compatible con modo Offline y Google Sheets.
          </p>
        </div>
      </footer>

      {/* Modal de Configuración de Google Sheets */}
      <ModalSheetsConfig
        isOpen={modalSheetsAbierto}
        onClose={() => setModalSheetsAbierto(false)}
        config={sheetsConfig}
        onSaveConfig={(cfg) => {
          setSheetsConfig(cfg);
          saveSheetsConfig(cfg);
        }}
        accessToken={accessToken}
        onAuthSuccess={(token) => setAccessToken(token)}
        registros={registros}
        onRegistrosActualizados={(nuevos) => {
          setRegistros(nuevos);
          saveLocalRegistros(nuevos);
        }}
      />
    </div>
  );
}
