// SYNAP - Pagina de Seguridad
// Autor: Luis Mario Taboada Nunez LMTN

import React, { useEffect } from 'react';
import { Shield, Key, FileText, Activity, Lock, Unlock, Database } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAPI } from '../hooks/useAPI';

const Security: React.FC = () => {
  const resumenSeguridad = useAPI<any>();
  const auditoria = useAPI<any>();
  const salud = useAPI<any>();

  useEffect(() => {
    resumenSeguridad.ejecutar('get', '/security/resumen');
    auditoria.ejecutar('get', '/security/auditoria', undefined, { limite: 20 });
    salud.ejecutar('get', '/security/salud');
  }, []);

  const handleRespaldo = async () => {
    const result = await auditoria.ejecutar('post', '/security/respaldo');
    if (result) alert('Respaldo generado exitosamente');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Seguridad</h1>
        <p className="text-dark-500 dark:text-dark-400">Monitoreo, auditoria y respaldos del sistema</p>
      </div>

      {resumenSeguridad.data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card hover>
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-yellow-500" />
              <p className="text-sm text-dark-500">Nivel de Riesgo</p>
            </div>
            <p className="text-2xl font-bold mt-2">
              <Badge variant={resumenSeguridad.data.nivel_riesgo === 'bajo' ? 'success' : resumenSeguridad.data.nivel_riesgo === 'medio' ? 'warning' : 'danger'}>
                {resumenSeguridad.data.nivel_riesgo?.toUpperCase()}
              </Badge>
            </p>
          </Card>
          <Card hover>
            <p className="text-sm text-dark-500">Intentos Fallidos 24h</p>
            <p className="text-2xl font-bold text-red-600">{resumenSeguridad.data.intentos_fallidos_24h || 0}</p>
          </Card>
          <Card hover>
            <p className="text-sm text-dark-500">Sesiones Activas</p>
            <p className="text-2xl font-bold text-dark-900 dark:text-white">{resumenSeguridad.data.sesiones_activas || 0}</p>
          </Card>
          <Card hover>
            <p className="text-sm text-dark-500">Usuarios con 2FA</p>
            <p className="text-2xl font-bold text-green-600">{resumenSeguridad.data.usuarios_con_2fa || 0}</p>
          </Card>
        </div>
      )}

      {resumenSeguridad.data?.actividad_sospechosa?.length > 0 && (
        <Card className="border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 mb-3">
            <Lock size={18} className="text-red-500" />
            <h3 className="font-semibold text-dark-900 dark:text-white">Actividad Sospechosa Detectada</h3>
          </div>
          {resumenSeguridad.data.actividad_sospechosa.map((act: any, index: number) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950 rounded-xl mb-1">
              <Badge variant="danger">{act.username}</Badge>
              <span className="text-sm text-red-700 dark:text-red-400">{act.intentos} intentos fallidos en la ultima hora</span>
            </div>
          ))}
        </Card>
      )}

      {salud.data && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Database size={18} className="text-synap-500" />
            <h3 className="font-semibold text-dark-900 dark:text-white">Salud del Sistema</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-dark-50 dark:bg-dark-900 rounded-xl">
              <p className="text-xs text-dark-500">Base de Datos</p>
              <p className="font-bold text-dark-900 dark:text-white">{salud.data.base_datos?.tamanio_mb || 0} MB</p>
            </div>
            <div className="p-3 bg-dark-50 dark:bg-dark-900 rounded-xl">
              <p className="text-xs text-dark-500">Conexiones</p>
              <p className="font-bold text-dark-900 dark:text-white">{salud.data.base_datos?.conexiones_activas || 0}</p>
            </div>
            <div className="p-3 bg-dark-50 dark:bg-dark-900 rounded-xl">
              <p className="text-xs text-dark-500">Uptime</p>
              <p className="font-bold text-dark-900 dark:text-white">{Math.round(salud.data.servidor?.uptime_segundos || 0)}s</p>
            </div>
            <div className="p-3 bg-dark-50 dark:bg-dark-900 rounded-xl">
              <p className="text-xs text-dark-500">Memoria</p>
              <p className="font-bold text-dark-900 dark:text-white">{salud.data.servidor?.memoria_usada_mb || 0} MB</p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-synap-500" />
            <h3 className="font-semibold text-dark-900 dark:text-white">Registro de Auditoria</h3>
          </div>
          <Button variant="secondary" icon={<Database size={16} />} onClick={handleRespaldo}>
            Generar Respaldo
          </Button>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-200 dark:border-dark-700 sticky top-0 bg-white dark:bg-dark-800">
                <th className="text-left p-3 text-sm font-medium text-dark-500">Fecha</th>
                <th className="text-left p-3 text-sm font-medium text-dark-500">Usuario</th>
                <th className="text-left p-3 text-sm font-medium text-dark-500">Accion</th>
                <th className="text-left p-3 text-sm font-medium text-dark-500">Entidad</th>
                <th className="text-left p-3 text-sm font-medium text-dark-500">IP</th>
              </tr>
            </thead>
            <tbody>
              {auditoria.data?.datos?.map((reg: any) => (
                <tr key={reg.id} className="border-b border-dark-100 dark:border-dark-800 text-sm">
                  <td className="p-3 text-dark-600 dark:text-dark-400">
                    {new Date(reg.created_at).toLocaleString('es-PY')}
                  </td>
                  <td className="p-3 font-medium text-dark-900 dark:text-white">{reg.usuario_nombre || 'Sistema'}</td>
                  <td className="p-3">
                    <Badge variant="info">{reg.accion}</Badge>
                  </td>
                  <td className="p-3 text-dark-600 dark:text-dark-400">{reg.entidad}</td>
                  <td className="p-3 text-dark-400 font-mono text-xs">{reg.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Security;
