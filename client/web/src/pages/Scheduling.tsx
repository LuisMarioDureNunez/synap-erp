// SYNAP - Pagina de Agenda y Citas
// Autor: Luis Mario Taboada Nunez LMTN

import React, { useEffect, useState } from 'react';
import { Calendar, Clock, User, Scissors, Plus, Search } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useAPI } from '../hooks/useAPI';

const Scheduling: React.FC = () => {
  const citasDelDia = useAPI<any>();
  const agendaSemanal = useAPI<any>();
  const servicios = useAPI<any[]>();
  const clientes = useAPI<any[]>();
  const [showCrear, setShowCrear] = useState(false);
  const [nuevaCita, setNuevaCita] = useState({ cliente_id: '', servicio_id: '', fecha_hora: '', notas: '' });

  useEffect(() => {
    citasDelDia.ejecutar('get', '/scheduling/citas/del-dia');
    agendaSemanal.ejecutar('get', '/scheduling/agenda-semanal');
    servicios.ejecutar('get', '/scheduling/servicios');
  }, []);

  const handleCrearCita = async () => {
    const fecha = new Date(nuevaCita.fecha_hora);
    const result = await citasDelDia.ejecutar('post', '/scheduling/citas', {
      ...nuevaCita,
      fecha_hora: fecha.toISOString(),
    });
    if (result) {
      setShowCrear(false);
      setNuevaCita({ cliente_id: '', servicio_id: '', fecha_hora: '', notas: '' });
      citasDelDia.ejecutar('get', '/scheduling/citas/del-dia');
      agendaSemanal.ejecutar('get', '/scheduling/agenda-semanal');
    }
  };

  const cambiarEstado = async (citaId: string, estado: string) => {
    await citasDelDia.ejecutar('put', `/scheduling/citas/${citaId}/estado`, { estado });
    citasDelDia.ejecutar('get', '/scheduling/citas/del-dia');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Agenda</h1>
          <p className="text-dark-500 dark:text-dark-400">Gestion de citas y servicios</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setShowCrear(true)}>
          Nueva Cita
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={20} className="text-synap-500" />
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white">Citas del Dia</h3>
              <Badge variant="info">{citasDelDia.data?.total || 0} citas</Badge>
            </div>

            {citasDelDia.data?.en_curso > 0 && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 rounded-xl">
                <p className="text-sm text-green-700 dark:text-green-400">
                  {citasDelDia.data.en_curso} citas en curso
                </p>
              </div>
            )}

            <div className="space-y-2">
              {citasDelDia.data?.citas?.map((cita: any) => (
                <div key={cita.id} className="flex items-center justify-between p-3 bg-dark-50 dark:bg-dark-900 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-synap-100 dark:bg-synap-950 rounded-full flex items-center justify-center">
                      <User size={18} className="text-synap-600 dark:text-synap-400" />
                    </div>
                    <div>
                      <p className="font-medium text-dark-900 dark:text-white">{cita.cliente_nombre}</p>
                      <p className="text-xs text-dark-400">{cita.servicio_nombre || 'Sin servicio'}</p>
                      <p className="text-xs text-dark-400">
                        {new Date(cita.fecha_hora).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
                        {cita.empleado_nombre && ` - ${cita.empleado_nombre}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      cita.estado === 'completada' ? 'success' :
                      cita.estado === 'en_progreso' ? 'info' :
                      cita.estado === 'cancelada' ? 'danger' : 'warning'
                    }>
                      {cita.estado}
                    </Badge>
                    {cita.estado === 'pendiente' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => cambiarEstado(cita.id, 'confirmada')}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => cambiarEstado(cita.id, 'cancelada')}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                    {cita.estado === 'confirmada' && (
                      <button
                        onClick={() => cambiarEstado(cita.id, 'en_progreso')}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                      >
                        Iniciar
                      </button>
                    )}
                    {cita.estado === 'en_progreso' && (
                      <button
                        onClick={() => cambiarEstado(cita.id, 'completada')}
                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                      >
                        Completar
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {citasDelDia.data?.citas?.length === 0 && (
                <p className="text-dark-400 text-center py-4">No hay citas para hoy</p>
              )}
            </div>
          </Card>
        </div>

        <div>
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={20} className="text-synap-500" />
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white">Agenda Semanal</h3>
            </div>
            <div className="space-y-3">
              {agendaSemanal.data?.agenda?.map((dia: any) => (
                <div key={dia.fecha} className="pb-2 border-b border-dark-100 dark:border-dark-700 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-dark-900 dark:text-white">{dia.dia}</span>
                    <Badge variant="neutral">{dia.citas.length}</Badge>
                  </div>
                  <p className="text-xs text-dark-400">{dia.fecha}</p>
                  {dia.citas.slice(0, 2).map((cita: any) => (
                    <p key={cita.id} className="text-xs text-dark-500 mt-1 truncate">
                      {cita.hora} - {cita.cliente_nombre}
                    </p>
                  ))}
                  {dia.citas.length > 2 && (
                    <p className="text-xs text-synap-500 mt-1">+{dia.citas.length - 2} mas</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Modal isOpen={showCrear} onClose={() => setShowCrear(false)} title="Nueva Cita" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">Cliente</label>
            <select
              className="w-full rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 px-4 py-2.5 text-sm"
              value={nuevaCita.cliente_id}
              onChange={(e) => setNuevaCita({ ...nuevaCita, cliente_id: e.target.value })}
            >
              <option value="">Seleccione cliente</option>
              {clientes.data?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.nombre} {c.apellido || ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">Servicio</label>
            <select
              className="w-full rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 px-4 py-2.5 text-sm"
              value={nuevaCita.servicio_id}
              onChange={(e) => setNuevaCita({ ...nuevaCita, servicio_id: e.target.value })}
            >
              <option value="">Seleccione servicio</option>
              {servicios.data?.map((s: any) => (
                <option key={s.id} value={s.id}>{s.nombre} ({s.duracion_minutos} min)</option>
              ))}
            </select>
          </div>
          <Input
            label="Fecha y Hora"
            type="datetime-local"
            value={nuevaCita.fecha_hora}
            onChange={(e) => setNuevaCita({ ...nuevaCita, fecha_hora: e.target.value })}
          />
          <Input
            label="Notas"
            value={nuevaCita.notas}
            onChange={(e) => setNuevaCita({ ...nuevaCita, notas: e.target.value })}
            placeholder="Notas adicionales..."
          />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowCrear(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleCrearCita} className="flex-1" disabled={!nuevaCita.cliente_id || !nuevaCita.fecha_hora}>
              Crear Cita
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Scheduling;
