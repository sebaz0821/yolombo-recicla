import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  User, 
  FileSpreadsheet, 
  Download, 
  AlertTriangle,
  Phone,
  UserCheck
} from 'lucide-react';
import { RegistroPGIRS } from '../types';

interface TablaRegistrosProps {
  registros: RegistroPGIRS[];
  onEditar: (registro: RegistroPGIRS) => void;
  onEliminar: (id: string) => void;
  onSincronizarPendientes: () => void;
  isSyncing: boolean;
  sheetsConectado: boolean;
}

export const TablaRegistros: React.FC<TablaRegistrosProps> = ({
  registros,
  onEditar,
  onEliminar,
  onSincronizarPendientes,
  isSyncing,
  sheetsConectado,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [filtroZona, setFiltroZona] = useState<string>('todos');
  const [filtroSync, setFiltroSync] = useState<'todos' | 'sincronizado' | 'pendiente'>('todos');
  const [filtroSeguimiento, setFiltroSeguimiento] = useState<'todos' | 'Sí' | 'No'>('todos');
  const [registroAEliminar, setRegistroAEliminar] = useState<RegistroPGIRS | null>(null);

  // Obtener zonas únicas
  const zonasUnicas = Array.from(new Set(registros.map((r) => r.zona).filter(Boolean)));

  // Filtrado de registros
  const filtrados = registros.filter((reg) => {
    const q = busqueda.toLowerCase();
    const matchesBusqueda =
      reg.direccion.toLowerCase().includes(q) ||
      (reg.nombrePersona && reg.nombrePersona.toLowerCase().includes(q)) ||
      (reg.telefono && reg.telefono.includes(q)) ||
      reg.encuestador.toLowerCase().includes(q) ||
      reg.dudaInquietud.toLowerCase().includes(q) ||
      reg.observaciones.toLowerCase().includes(q) ||
      reg.numero.toString().includes(q);

    const matchesZona = filtroZona === 'todos' || reg.zona === filtroZona;
    const matchesSync =
      filtroSync === 'todos' ||
      (filtroSync === 'sincronizado' && reg.sincronizado) ||
      (filtroSync === 'pendiente' && !reg.sincronizado);
    const matchesSeguimiento =
      filtroSeguimiento === 'todos' || reg.requiereSeguimiento === filtroSeguimiento;

    return matchesBusqueda && matchesZona && matchesSync && matchesSeguimiento;
  });

  const exportarCSVLocal = () => {
    if (!registros.length) return;
    const headers = [
      'N.º',
      'Dirección / referencia',
      'Nombre de quien atendió',
      'Teléfono',
      'Persona atendida (Rol)',
      'Comprendió el cambio',
      'Recibió volante',
      'Conoce Día A',
      'Conoce Día B',
      'Duda / inquietud',
      '¿Requiere seguimiento?',
      'Observaciones',
      'Zona',
      'Fecha',
      'Hora',
      'Encuestador',
      'Sincronizado',
    ];

    const rows = registros.map((r) => [
      r.numero,
      `"${r.direccion.replace(/"/g, '""')}"`,
      `"${(r.nombrePersona || '').replace(/"/g, '""')}"`,
      `"${(r.telefono || '').replace(/"/g, '""')}"`,
      r.personaAtendida,
      r.comprendioCambio,
      r.recibioVolante,
      r.conoceDiaA,
      r.conoceDiaB,
      `"${(r.dudaInquietud || '').replace(/"/g, '""')}"`,
      r.requiereSeguimiento,
      `"${(r.observaciones || '').replace(/"/g, '""')}"`,
      `"${r.zona}"`,
      r.fecha,
      r.hora,
      `"${r.encuestador}"`,
      r.sincronizado ? 'Sí' : 'No',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PGIRS_Registros_Visitas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPendientes = registros.filter((r) => !r.sincronizado).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      {/* Barra de control superior */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por dirección, capacitador o notas..."
              className="pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64 sm:w-72"
            />
          </div>

          {/* Filtro de Zonas */}
          <select
            value={filtroZona}
            onChange={(e) => setFiltroZona(e.target.value)}
            className="text-xs sm:text-sm py-1.5 px-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
          >
            <option value="todos">Todas las zonas ({zonasUnicas.length})</option>
            {zonasUnicas.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>

          {/* Filtro de Estado de Sincronización */}
          <select
            value={filtroSync}
            onChange={(e) => setFiltroSync(e.target.value as any)}
            className="text-xs sm:text-sm py-1.5 px-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendientes de subir ({totalPendientes})</option>
            <option value="sincronizado">Ya en Sheets</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {totalPendientes > 0 && sheetsConectado && (
            <button
              onClick={onSincronizarPendientes}
              disabled={isSyncing}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {isSyncing ? 'Sincronizando...' : `Subir a Sheets (${totalPendientes})`}
            </button>
          )}

          <button
            onClick={exportarCSVLocal}
            title="Descargar copia de seguridad en Excel/CSV"
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Descargar CSV
          </button>
        </div>
      </div>

      {/* Tabla con el encabezado idéntico a la imagen provista */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-xs border-collapse min-w-[900px]">
          <thead>
            {/* Encabezado azul clásico de la imagen del usuario (#1f4e78 / bg-sky-900) */}
            <tr className="bg-[#1b4b72] text-white select-none">
              <th className="py-3 px-3 font-semibold border-r border-[#2d5d85] w-12 text-center">N.º</th>
              <th className="py-3 px-3 font-semibold border-r border-[#2d5d85] min-w-[170px]">Dirección / referencia</th>
              <th className="py-3 px-3 font-semibold border-r border-[#2d5d85] min-w-[150px]">Persona capacitada / Contacto</th>
              <th className="py-3 px-3 font-semibold border-r border-[#2d5d85] min-w-[110px]">Rol atendido</th>
              <th className="py-3 px-3 font-semibold border-r border-[#2d5d85] text-center w-24">Comprendió el cambio</th>
              <th className="py-3 px-3 font-semibold border-r border-[#2d5d85] text-center w-24">Recibió volante</th>
              <th className="py-3 px-3 font-semibold border-r border-[#2d5d85] text-center w-24">Conoce Día A</th>
              <th className="py-3 px-3 font-semibold border-r border-[#2d5d85] text-center w-24">Conoce Día B</th>
              <th className="py-3 px-3 font-semibold border-r border-[#2d5d85] min-w-[150px]">Duda / inquietud</th>
              <th className="py-3 px-3 font-semibold border-r border-[#2d5d85] text-center w-28">¿Requiere seguimiento?</th>
              <th className="py-3 px-3 font-semibold border-r border-[#2d5d85] min-w-[150px]">Observaciones</th>
              <th className="py-3 px-3 font-semibold text-center w-20">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {registros.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto px-4">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white p-2 shadow-lg border border-slate-200 ring-4 ring-emerald-50">
                      <img src="/logo.png" alt="Yolombó Recicla" className="w-full h-full object-contain" />
                    </div>
                    <div className="mt-2">
                      <h4 className="font-extrabold text-slate-800 text-lg">¡Bienvenido a Yolombó Recicla!</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm">
                        Aún no tienes visitas registradas en este dispositivo. Pulsa en <strong className="text-emerald-700">"Nueva Visita"</strong> para comenzar a registrar predios y capacitaciones casa a casa.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertTriangle className="w-8 h-8 text-slate-300" />
                    <p className="font-medium text-slate-500">No se encontraron visitas con los filtros actuales</p>
                    <p className="text-xs">Prueba cambiando los filtros de búsqueda o zona.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtrados.map((item, idx) => (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                  }`}
                >
                  {/* N.º */}
                  <td className="py-2.5 px-3 font-mono font-bold text-center text-slate-800 border-r border-slate-100">
                    {item.numero}
                  </td>

                  {/* Dirección */}
                  <td className="py-2.5 px-3 border-r border-slate-100">
                    <div className="font-semibold text-slate-900">{item.direccion}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{item.zona}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5"><User className="w-2.5 h-2.5" />{item.encuestador}</span>
                    </div>
                  </td>

                  {/* Persona capacitada y teléfono */}
                  <td className="py-2.5 px-3 border-r border-slate-100">
                    <div className="font-semibold text-slate-800">
                      {item.nombrePersona || <span className="text-slate-400 italic">No especificado</span>}
                    </div>
                    {item.telefono && (
                      <div className="text-[11px] text-emerald-700 font-mono flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <a href={`tel:${item.telefono}`} className="hover:underline">
                          {item.telefono}
                        </a>
                      </div>
                    )}
                  </td>

                  {/* Rol persona atendida */}
                  <td className="py-2.5 px-3 border-r border-slate-100">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200 inline-block">
                      {item.personaAtendida}
                    </span>
                  </td>

                  {/* Comprendió el cambio */}
                  <td className="py-2.5 px-3 border-r border-slate-100 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        item.comprendioCambio === 'Sí'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : item.comprendioCambio === 'No'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {item.comprendioCambio}
                    </span>
                  </td>

                  {/* Recibió volante */}
                  <td className="py-2.5 px-3 border-r border-slate-100 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        item.recibioVolante === 'Sí'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {item.recibioVolante}
                    </span>
                  </td>

                  {/* Conoce Día A */}
                  <td className="py-2.5 px-3 border-r border-slate-100 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        item.conoceDiaA === 'Sí'
                          ? 'bg-teal-50 text-teal-700 border border-teal-200'
                          : 'bg-rose-50 text-rose-600 border border-rose-200'
                      }`}
                    >
                      {item.conoceDiaA}
                    </span>
                  </td>

                  {/* Conoce Día B */}
                  <td className="py-2.5 px-3 border-r border-slate-100 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        item.conoceDiaB === 'Sí'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-rose-50 text-rose-600 border border-rose-200'
                      }`}
                    >
                      {item.conoceDiaB}
                    </span>
                  </td>

                  {/* Duda / Inquietud */}
                  <td className="py-2.5 px-3 border-r border-slate-100">
                    <p className="line-clamp-2 text-slate-700 italic">
                      {item.dudaInquietud || <span className="text-slate-300">Ninguna</span>}
                    </p>
                  </td>

                  {/* ¿Requiere seguimiento? */}
                  <td className="py-2.5 px-3 border-r border-slate-100 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                        item.requiereSeguimiento === 'Sí'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.requiereSeguimiento}
                    </span>
                  </td>

                  {/* Observaciones */}
                  <td className="py-2.5 px-3 border-r border-slate-100">
                    <p className="line-clamp-2 text-slate-600">
                      {item.observaciones || <span className="text-slate-300">—</span>}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                      {item.sincronizado ? (
                        <span className="text-emerald-600 flex items-center gap-0.5 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> En Sheets
                        </span>
                      ) : (
                        <span className="text-amber-600 flex items-center gap-0.5 font-medium">
                          <Clock className="w-3 h-3" /> Solo en dispositivo
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Acciones: Editar y Eliminar claramente visibles y activos */}
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onEditar(item)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 hover:text-amber-900 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs active:scale-95 cursor-pointer"
                        title="Editar todos los datos de esta visita"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => setRegistroAEliminar(item)}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 hover:text-rose-900 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs active:scale-95 cursor-pointer"
                        title="Eliminar esta ficha del dispositivo"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de confirmación para eliminar */}
      {registroAEliminar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-center text-lg font-bold text-slate-800">
              ¿Eliminar visita del dispositivo?
            </h3>
            <p className="text-center text-xs text-slate-500 mt-1 mb-4">
              Estás a punto de borrar la <strong className="text-slate-700">Ficha N.° {registroAEliminar.numero}</strong> correspondiente a{' '}
              <strong className="text-slate-700">{registroAEliminar.direccion}</strong>
              {registroAEliminar.nombrePersona ? ` (${registroAEliminar.nombrePersona})` : ''}.
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1 mb-5">
              <div className="flex justify-between">
                <span className="text-slate-400">Sector / Zona:</span>
                <span className="font-semibold text-slate-700">{registroAEliminar.zona}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Capacitador:</span>
                <span className="font-semibold text-slate-700">{registroAEliminar.encuestador}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fecha y hora:</span>
                <span className="font-semibold text-slate-700">{registroAEliminar.fecha} {registroAEliminar.hora}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRegistroAEliminar(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const idABorrar = registroAEliminar.id;
                  setRegistroAEliminar(null);
                  onEliminar(idABorrar);
                }}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-rose-600/30 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer de la tabla */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 px-4">
        <div>
          Mostrando <span className="font-bold text-slate-800">{filtrados.length}</span> de{' '}
          <span className="font-bold text-slate-800">{registros.length}</span> registros en dispositivo
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {registros.filter((r) => r.sincronizado).length} sincronizados
          </span>
          <span className="flex items-center gap-1 text-amber-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            {totalPendientes} pendientes
          </span>
        </div>
      </div>
    </div>
  );
};
