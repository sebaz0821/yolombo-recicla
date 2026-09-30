import React, { useMemo, useState } from 'react';
import { 
  BarChart3, 
  PieChart, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  Users, 
  Send, 
  FileCheck, 
  Building2, 
  TrendingUp, 
  AlertTriangle,
  Phone,
  UserCheck
} from 'lucide-react';
import { RegistroPGIRS } from '../types';

interface InformesCoberturaProps {
  registros: RegistroPGIRS[];
}

export const InformesCobertura: React.FC<InformesCoberturaProps> = ({ registros }) => {
  const [zonaSeleccionada, setZonaSeleccionada] = useState<string>('todas');

  // Filtrar si el usuario selecciona una zona específica o todas
  const datosFiltrados = useMemo(() => {
    if (zonaSeleccionada === 'todas') return registros;
    return registros.filter((r) => r.zona === zonaSeleccionada);
  }, [registros, zonaSeleccionada]);

  // Agrupamiento por zonas
  const metricasPorZona = useMemo(() => {
    const mapa: {
      [zona: string]: {
        totalViviendas: number;
        comprendieron: number;
        recibieronVolante: number;
        conocenDiaA: number;
        conocenDiaB: number;
        requierenSeguimiento: number;
        propietarios: number;
        arrendatarios: number;
        familiares: number;
        otros: number;
        encuestadores: Set<string>;
      };
    } = {};

    registros.forEach((r) => {
      const z = r.zona || 'Sin Zona Asignada';
      if (!mapa[z]) {
        mapa[z] = {
          totalViviendas: 0,
          comprendieron: 0,
          recibieronVolante: 0,
          conocenDiaA: 0,
          conocenDiaB: 0,
          requierenSeguimiento: 0,
          propietarios: 0,
          arrendatarios: 0,
          familiares: 0,
          otros: 0,
          encuestadores: new Set(),
        };
      }
      mapa[z].totalViviendas += 1;
      if (r.comprendioCambio === 'Sí') mapa[z].comprendieron += 1;
      if (r.recibioVolante === 'Sí') mapa[z].recibieronVolante += 1;
      if (r.conoceDiaA === 'Sí') mapa[z].conocenDiaA += 1;
      if (r.conoceDiaB === 'Sí') mapa[z].conocenDiaB += 1;
      if (r.requiereSeguimiento === 'Sí') mapa[z].requierenSeguimiento += 1;

      if (r.personaAtendida === 'Propietario(a)') mapa[z].propietarios += 1;
      else if (r.personaAtendida === 'Arrendatario(a)') mapa[z].arrendatarios += 1;
      else if (r.personaAtendida === 'Familiar') mapa[z].familiares += 1;
      else mapa[z].otros += 1;

      if (r.encuestador) mapa[z].encuestadores.add(r.encuestador);
    });

    return mapa;
  }, [registros]);

  const listaZonas = Object.keys(metricasPorZona);

  // Totales globales o de la selección
  const total = datosFiltrados.length;
  const totalComprendio = datosFiltrados.filter((r) => r.comprendioCambio === 'Sí').length;
  const pctComprendio = total ? Math.round((totalComprendio / total) * 100) : 0;

  const totalVolante = datosFiltrados.filter((r) => r.recibioVolante === 'Sí').length;
  const pctVolante = total ? Math.round((totalVolante / total) * 100) : 0;

  const totalDiaA = datosFiltrados.filter((r) => r.conoceDiaA === 'Sí').length;
  const pctDiaA = total ? Math.round((totalDiaA / total) * 100) : 0;

  const totalDiaB = datosFiltrados.filter((r) => r.conoceDiaB === 'Sí').length;
  const pctDiaB = total ? Math.round((totalDiaB / total) * 100) : 0;

  const totalSeguimiento = datosFiltrados.filter((r) => r.requiereSeguimiento === 'Sí').length;
  const pctSeguimiento = total ? Math.round((totalSeguimiento / total) * 100) : 0;

  // Desglose de persona atendida
  const tiposPersona = useMemo(() => {
    const counts = { 'Propietario(a)': 0, 'Arrendatario(a)': 0, Familiar: 0, Otro: 0 };
    datosFiltrados.forEach((r) => {
      if (counts[r.personaAtendida] !== undefined) {
        counts[r.personaAtendida]++;
      }
    });
    return counts;
  }, [datosFiltrados]);

  return (
    <div className="space-y-6">
      {/* Selector de Zona y Titular de Métricas */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-white p-1 border border-slate-200 shadow-sm shrink-0 flex items-center justify-center">
              <img src="/logo.png" alt="Yolombó Recicla" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 leading-tight">
                  Informe de Cobertura • Yolombó Recicla
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                  PGIRS
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoreo PGIRS de visitas efectivas, asimilación y seguimiento de rutas por sector
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Filtrar informe:
          </label>
          <select
            value={zonaSeleccionada}
            onChange={(e) => setZonaSeleccionada(e.target.value)}
            className="text-xs sm:text-sm font-semibold py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-800"
          >
            <option value="todas">Todas las Zonas (Consolidado General)</option>
            {listaZonas.map((z) => (
              <option key={z} value={z}>
                {z} ({metricasPorZona[z].totalViviendas} predios)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tarjetas KPI de Primer Nivel */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Viviendas */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Viviendas Visitadas
            </span>
            <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{total}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {listaZonas.length} zonas alcanzadas
            </div>
          </div>
        </div>

        {/* % Comprendió el Cambio */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Comprendió Cambio
            </span>
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <CheckCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-600">{pctComprendio}%</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {totalComprendio} de {total} respuestas Sí
            </div>
          </div>
        </div>

        {/* % Recibió Volante */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Entrega de Volante
            </span>
            <span className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
              <FileCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-teal-700">{pctVolante}%</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {totalVolante} material entregado
            </div>
          </div>
        </div>

        {/* Conocimiento Día A / B */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Conocen Rutas
            </span>
            <span className="p-1.5 bg-sky-50 text-sky-700 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-sky-700">
              {pctDiaA}% <span className="text-xs font-normal text-slate-400">/ {pctDiaB}%</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Día A ({pctDiaA}%) | Día B ({pctDiaB}%)
            </div>
          </div>
        </div>

        {/* Requieren Seguimiento */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs flex flex-col justify-between bg-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
              Requieren Refuerzo
            </span>
            <span className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-600">{totalSeguimiento}</div>
            <div className="text-[11px] text-rose-600/90 mt-0.5 font-medium">
              {pctSeguimiento}% de visitas en alerta
            </div>
          </div>
        </div>
      </div>

      {/* Desglose Tabla de Cobertura por Zonas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              Tabla Comparativa de Cobertura y Rendimiento por Zona
            </h3>
            <p className="text-xs text-slate-500">
              Métricas calculadas con base en visitas casa a casa registradas en campo
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
            {listaZonas.length} Sectores
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#1f4e78] text-white">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Zona / Sector</th>
                <th className="py-2.5 px-3 font-semibold text-center">Viviendas</th>
                <th className="py-2.5 px-3 font-semibold text-center">Comprendió (%)</th>
                <th className="py-2.5 px-3 font-semibold text-center">Volante (%)</th>
                <th className="py-2.5 px-3 font-semibold text-center">Conoce Día A</th>
                <th className="py-2.5 px-3 font-semibold text-center">Conoce Día B</th>
                <th className="py-2.5 px-3 font-semibold text-center">Casos a Seguir</th>
                <th className="py-2.5 px-3 font-semibold">Capacitadores</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listaZonas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400">
                    Aún no hay visitas registradas para generar el informe.
                  </td>
                </tr>
              ) : (
                listaZonas.map((zona) => {
                  const m = metricasPorZona[zona];
                  const pComprende = Math.round((m.comprendieron / m.totalViviendas) * 100);
                  const pVolante = Math.round((m.recibieronVolante / m.totalViviendas) * 100);
                  const pDiaA = Math.round((m.conocenDiaA / m.totalViviendas) * 100);
                  const pDiaB = Math.round((m.conocenDiaB / m.totalViviendas) * 100);

                  return (
                    <tr key={zona} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-800 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        {zona}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900 bg-slate-50/50">
                        {m.totalViviendas}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-12 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-2 rounded-full"
                              style={{ width: `${pComprende}%` }}
                            />
                          </div>
                          <span className="font-semibold text-emerald-700">{pComprende}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-12 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-teal-500 h-2 rounded-full"
                              style={{ width: `${pVolante}%` }}
                            />
                          </div>
                          <span className="font-semibold text-teal-800">{pVolante}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-700">
                        {pDiaA}%
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-700">
                        {pDiaB}%
                      </td>
                      <td className="py-3 px-3 text-center">
                        {m.requierenSeguimiento > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">
                            {m.requierenSeguimiento} viviendas
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <span className="text-[11px] truncate block max-w-[200px]">
                          {Array.from(m.encuestadores).join(', ') || 'Sin asignar'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Perfil del Informante y Distribución de Tipos de Habitantes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Distribución por Persona Atendida */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-700" />
            Perfil de la Persona Atendida en Casa
          </h4>
          <p className="text-xs text-slate-500 mb-4">
            Proporción de propietarios vs arrendatarios y familiares receptores de la información
          </p>

          <div className="space-y-3">
            {[
              { label: 'Propietario(a)', count: tiposPersona['Propietario(a)'], color: 'bg-emerald-600' },
              { label: 'Arrendatario(a)', count: tiposPersona['Arrendatario(a)'], color: 'bg-sky-600' },
              { label: 'Familiar', count: tiposPersona['Familiar'], color: 'bg-indigo-600' },
              { label: 'Otro', count: tiposPersona['Otro'], color: 'bg-amber-600' },
            ].map((item) => {
              const pct = total ? Math.round((item.count / total) * 100) : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{item.label}</span>
                    <span className="text-slate-500">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`${item.color} h-2.5 rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Casos que requieren seguimiento inmediato */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <h4 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2 text-rose-700">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Prioridad de Seguimiento Casa a Casa
          </h4>
          <p className="text-xs text-slate-500 mb-3">
            Viviendas con dudas abiertas, reclamos sobre frecuencias o que no comprendieron la ruta
          </p>

          <div className="flex-1 overflow-y-auto max-h-56 space-y-2 pr-1">
            {datosFiltrados.filter((r) => r.requiereSeguimiento === 'Sí').length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs py-8">
                No hay casos pendientes de seguimiento en esta selección.
              </div>
            ) : (
              datosFiltrados
                .filter((r) => r.requiereSeguimiento === 'Sí')
                .map((r) => (
                  <div
                    key={r.id}
                    className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/30 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Ficha N.º {r.numero} - {r.direccion}</span>
                      <span className="text-[10px] text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                        {r.zona}
                      </span>
                    </div>

                    {(r.nombrePersona || r.telefono) && (
                      <div className="text-[11px] font-medium text-slate-700 flex items-center gap-2 bg-white/70 px-2 py-1 rounded-md border border-rose-100">
                        {r.nombrePersona && (
                          <span className="flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-emerald-600" />
                            {r.nombrePersona}
                          </span>
                        )}
                        {r.telefono && (
                          <a
                            href={`tel:${r.telefono}`}
                            className="flex items-center gap-1 text-emerald-700 font-mono hover:underline ml-auto"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            {r.telefono}
                          </a>
                        )}
                      </div>
                    )}

                    {r.dudaInquietud && (
                      <p className="text-slate-700 italic">
                        <strong>Duda:</strong> {r.dudaInquietud}
                      </p>
                    )}
                    {r.observaciones && (
                      <p className="text-slate-500">
                        <strong>Obs:</strong> {r.observaciones}
                      </p>
                    )}
                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                      <span>Rol: {r.personaAtendida}</span>
                      <span>Capacitador: {r.encuestador}</span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
