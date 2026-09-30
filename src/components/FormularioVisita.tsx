import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  MapPin, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  FileText,
  Navigation,
  Sparkles,
  Phone,
  UserCheck
} from 'lucide-react';
import { RegistroPGIRS, PersonaAtendida, RespuestaBinaria } from '../types';
import { getNextConsecutivo, getSessionPreferences, saveSessionPreferences } from '../storage';

interface FormularioVisitaProps {
  onGuardar: (registro: RegistroPGIRS) => void;
  registrosExistentes: RegistroPGIRS[];
  onCancelar?: () => void;
  registroEditando?: RegistroPGIRS | null;
}

export const FormularioVisita: React.FC<FormularioVisitaProps> = ({
  onGuardar,
  registrosExistentes,
  onCancelar,
  registroEditando,
}) => {
  const prefs = getSessionPreferences();

  const [numero, setNumero] = useState<number>(() => {
    if (registroEditando) return registroEditando.numero;
    return getNextConsecutivo(registrosExistentes);
  });

  const [zona, setZona] = useState<string>(() => {
    if (registroEditando) return registroEditando.zona;
    return prefs.zona || 'Comuna 1 - Sector Norte';
  });

  const [encuestador, setEncuestador] = useState<string>(() => {
    if (registroEditando) return registroEditando.encuestador;
    return prefs.encuestador || '';
  });

  const [direccion, setDireccion] = useState<string>(registroEditando?.direccion || '');
  const [nombrePersona, setNombrePersona] = useState<string>(registroEditando?.nombrePersona || '');
  const [telefono, setTelefono] = useState<string>(registroEditando?.telefono || '');
  const [personaAtendida, setPersonaAtendida] = useState<PersonaAtendida>(
    registroEditando?.personaAtendida || 'Propietario(a)'
  );
  const [comprendioCambio, setComprendioCambio] = useState<RespuestaBinaria>(
    registroEditando?.comprendioCambio || 'Sí'
  );
  const [recibioVolante, setRecibioVolante] = useState<RespuestaBinaria>(
    registroEditando?.recibioVolante || 'Sí'
  );
  const [conoceDiaA, setConoceDiaA] = useState<RespuestaBinaria>(
    registroEditando?.conoceDiaA || 'Sí'
  );
  const [conoceDiaB, setConoceDiaB] = useState<RespuestaBinaria>(
    registroEditando?.conoceDiaB || 'Sí'
  );
  const [dudaInquietud, setDudaInquietud] = useState<string>(registroEditando?.dudaInquietud || '');
  const [requiereSeguimiento, setRequiereSeguimiento] = useState<RespuestaBinaria>(
    registroEditando?.requiereSeguimiento || 'No'
  );
  const [observaciones, setObservaciones] = useState<string>(registroEditando?.observaciones || '');

  const [fecha, setFecha] = useState<string>(() => {
    if (registroEditando) return registroEditando.fecha;
    return new Date().toISOString().split('T')[0];
  });

  const [hora, setHora] = useState<string>(() => {
    if (registroEditando) return registroEditando.hora;
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  const [gpsLoading, setGpsLoading] = useState(false);
  const [coordenadas, setCoordenadas] = useState<{ lat: number; lng: number; precision?: number } | undefined>(
    registroEditando?.coordenadasGPS
  );
  const [alerta, setAlerta] = useState<string | null>(null);

  // Obtener geolocalización opcional para el encuestador en campo
  const obtenerGPS = () => {
    if (!navigator.geolocation) {
      setAlerta('La geolocalización no es compatible con este navegador.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordenadas({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          precision: Math.round(pos.coords.accuracy),
        });
        setGpsLoading(false);
      },
      (err) => {
        console.warn('Error GPS:', err);
        setGpsLoading(false);
        setAlerta('No se pudo obtener la posición GPS. Continúa manualmente.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!direccion.trim()) {
      setAlerta('Por favor ingresa la dirección o referencia de la vivienda.');
      return;
    }
    if (!encuestador.trim()) {
      setAlerta('Por favor ingresa el nombre del capacitador/encuestador.');
      return;
    }

    // Recordar datos frecuentes en sesión
    saveSessionPreferences(encuestador.trim(), zona.trim());

    const nuevoRegistro: RegistroPGIRS = {
      id: registroEditando ? registroEditando.id : `pgirs-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      numero: Number(numero),
      zona: zona.trim(),
      fecha,
      hora,
      encuestador: encuestador.trim(),
      direccion: direccion.trim(),
      nombrePersona: nombrePersona.trim(),
      telefono: telefono.trim(),
      personaAtendida,
      comprendioCambio,
      recibioVolante,
      conoceDiaA,
      conoceDiaB,
      dudaInquietud: dudaInquietud.trim(),
      requiereSeguimiento,
      observaciones: observaciones.trim(),
      coordenadasGPS: coordenadas,
      sincronizado: false, // nuevo o editado queda pendiente para sincronizar
      fechaCreacion: registroEditando ? registroEditando.fechaCreacion : Date.now(),
    };

    onGuardar(nuevoRegistro);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header del formulario */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-sky-900 text-white px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white p-1 shadow-md shrink-0 flex items-center justify-center ring-2 ring-emerald-400/40">
              <img src="/logo.png" alt="Yolombó Recicla" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/20 text-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-400/30">
                  YOLOMBÓ RECICLA
                </span>
                <span className="text-xs text-emerald-100 font-mono">
                  Ficha N.º {numero}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold mt-1 tracking-tight">
                {registroEditando ? 'Modificar Registro de Visita' : 'Nuevo Registro de Capacitación'}
              </h2>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Formato oficial de seguimiento para el Plan de Gestión Integral de Residuos Sólidos
              </p>
            </div>
          </div>
          {coordenadas && (
            <span className="text-[11px] bg-white/10 px-2.5 py-1 rounded-xl text-white flex items-center gap-1 shrink-0 border border-white/10">
              <Navigation className="w-3.5 h-3.5 text-emerald-300" /> GPS fijado
            </span>
          )}
        </div>
      </div>

      {alerta && (
        <div className="mx-5 mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
          <span>{alerta}</span>
          <button onClick={() => setAlerta(null)} className="font-bold ml-2">×</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        {/* Metadatos de Encuesta (Zona, Encuestador, Consecutivo) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Zona / Sector / Comuna *
            </label>
            <input
              type="text"
              required
              value={zona}
              onChange={(e) => setZona(e.target.value)}
              placeholder="Ej: Comuna 3 - Manzana B"
              className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-emerald-600" /> Capacitador(a) / Encuestador *
            </label>
            <input
              type="text"
              required
              value={encuestador}
              onChange={(e) => setEncuestador(e.target.value)}
              placeholder="Nombre y Apellido"
              className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                N.° Ficha
              </label>
              <input
                type="number"
                min="1"
                required
                value={numero}
                onChange={(e) => setNumero(parseInt(e.target.value) || 1)}
                className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold text-center"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" /> Hora
              </label>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full text-sm px-2 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-center"
              />
            </div>
          </div>
        </div>

        {/* Campo 1: Dirección / Referencia de vivienda */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
              Dirección / Referencia de Vivienda <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={obtenerGPS}
              disabled={gpsLoading}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
            >
              <Navigation className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
              {coordenadas ? `GPS: ${coordenadas.lat}, ${coordenadas.lng}` : 'Capturar GPS actual'}
            </button>
          </div>
          <input
            type="text"
            required
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Ej: Carrera 15 # 45-20 Casa de dos pisos reja blanca"
            className="w-full text-sm px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm"
          />
        </div>

        {/* Datos de Contacto: Nombre de la persona y Teléfono */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              Nombre de la persona que recibió la capacitación
            </label>
            <input
              type="text"
              value={nombrePersona}
              onChange={(e) => setNombrePersona(e.target.value)}
              placeholder="Ej: María Elena Rodríguez"
              className="w-full text-sm px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              Número telefónico de contacto
            </label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej: 312 456 7890 o fijo"
              className="w-full text-sm px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs"
            />
          </div>
        </div>

        {/* Campo 2: Persona Atendida (Exacto a dropdown de la imagen del usuario) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
            Persona Atendida <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['Propietario(a)', 'Arrendatario(a)', 'Familiar', 'Otro'] as PersonaAtendida[]).map((opcion) => (
              <button
                type="button"
                key={opcion}
                onClick={() => setPersonaAtendida(opcion)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border text-center transition-all ${
                  personaAtendida === opcion
                    ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {opcion}
              </button>
            ))}
          </div>
        </div>

        {/* Sección de Preguntas Clave del PGIRS (Comprendió, Volante, Día A, Día B) */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Evaluación de Asimilación y Material PGIRS
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Comprendió el cambio */}
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <label className="block text-xs font-bold text-slate-800 mb-2">
                ¿Comprendió el cambio?
              </label>
              <div className="flex gap-1.5">
                {(['Sí', 'No', 'No sabe/No responde'] as RespuestaBinaria[]).map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setComprendioCambio(val)}
                    className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg border transition-colors ${
                      comprendioCambio === val
                        ? val === 'Sí'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : val === 'No'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Recibió volante */}
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <label className="block text-xs font-bold text-slate-800 mb-2">
                ¿Recibió volante?
              </label>
              <div className="flex gap-1.5">
                {(['Sí', 'No', 'No sabe/No responde'] as RespuestaBinaria[]).map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setRecibioVolante(val)}
                    className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg border transition-colors ${
                      recibioVolante === val
                        ? val === 'Sí'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : val === 'No'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Conoce Día A */}
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-800">
                  ¿Conoce Día A (Aprovechables / Orgánicos)?
                </label>
              </div>
              <div className="flex gap-1.5">
                {(['Sí', 'No', 'No sabe/No responde'] as RespuestaBinaria[]).map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setConoceDiaA(val)}
                    className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg border transition-colors ${
                      conoceDiaA === val
                        ? val === 'Sí'
                          ? 'bg-teal-600 text-white border-teal-600'
                          : val === 'No'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Conoce Día B */}
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-800">
                  ¿Conoce Día B (No aprovechables / Ordinarios)?
                </label>
              </div>
              <div className="flex gap-1.5">
                {(['Sí', 'No', 'No sabe/No responde'] as RespuestaBinaria[]).map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setConoceDiaB(val)}
                    className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg border transition-colors ${
                      conoceDiaB === val
                        ? val === 'Sí'
                          ? 'bg-sky-600 text-white border-sky-600'
                          : val === 'No'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Duda / Inquietud y ¿Requiere seguimiento? */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              Duda / Inquietud planteada
            </label>
            <input
              type="text"
              value={dudaInquietud}
              onChange={(e) => setDudaInquietud(e.target.value)}
              placeholder="Dudas sobre separación en la fuente, rutas, canecas o bolsas..."
              className="w-full text-sm px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              ¿Requiere seguimiento?
            </label>
            <div className="grid grid-cols-3 gap-1 mt-1.5">
              {(['No', 'Sí', 'No sabe/No responde'] as RespuestaBinaria[]).map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setRequiereSeguimiento(val)}
                  className={`py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all ${
                    requiereSeguimiento === val
                      ? val === 'Sí'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-slate-800 text-white border-slate-800 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {val === 'No sabe/No responde' ? 'N/S' : val}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Observaciones */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            Observaciones de la visita
          </label>
          <textarea
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Anotaciones clave: número de habitantes, compromiso adquirido, sugerencias comunitarias..."
            className="w-full text-sm px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Botones de Acción */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
          {onCancelar && (
            <button
              type="button"
              onClick={onCancelar}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
          )}

          <button
            type="submit"
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-700/20 active:scale-98 transition flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            {registroEditando ? 'Guardar Cambios' : 'Registrar Visita PGIRS'}
          </button>
        </div>
      </form>
    </div>
  );
};
