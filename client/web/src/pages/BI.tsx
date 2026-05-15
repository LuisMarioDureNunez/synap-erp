// SYNAP - Pagina de Business Intelligence
// Autor: Luis Mario Taboada Nunez LMTN

import React, { useEffect } from 'react';
import { TrendingUp, Brain, AlertTriangle, Lightbulb, BarChart3 } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useAPI } from '../hooks/useAPI';

const BI: React.FC = () => {
  const dashboard = useAPI<any>();
  const tendencias = useAPI<any>();
  const prediccion = useAPI<any>();
  const anomalias = useAPI<any>();
  const recomendaciones = useAPI<any>();

  useEffect(() => {
    dashboard.ejecutar('get', '/bi/dashboard');
    tendencias.ejecutar('get', '/bi/tendencias', undefined, { dias: 30 });
    prediccion.ejecutar('get', '/bi/predecir-ventas', undefined, { dias: 7 });
    anomalias.ejecutar('get', '/bi/detectar-anomalias');
    recomendaciones.ejecutar('get', '/bi/recomendaciones');
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Business Intelligence & IA</h1>
        <p className="text-dark-500 dark:text-dark-400">Analisis avanzado e inteligencia artificial</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-synap-500" />
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white">Tendencias de Ventas</h3>
          </div>
          {tendencias.data && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-dark-50 dark:bg-dark-900 p-4 rounded-xl">
                  <p className="text-sm text-dark-500">Total Periodo</p>
                  <p className="text-xl font-bold text-dark-900 dark:text-white">
                    Gs. {Math.round(tendencias.data.total_ventas_periodo || 0).toLocaleString('es-PY')}
                  </p>
                </div>
                <div className="bg-dark-50 dark:bg-dark-900 p-4 rounded-xl">
                  <p className="text-sm text-dark-500">Promedio Diario</p>
                  <p className="text-xl font-bold text-dark-900 dark:text-white">
                    Gs. {Math.round(tendencias.data.promedio_diario || 0).toLocaleString('es-PY')}
                  </p>
                </div>
              </div>
              {tendencias.data.crecimiento_porcentaje !== undefined && (
                <div className="flex items-center gap-2">
                  <Badge variant={parseFloat(tendencias.data.crecimiento_porcentaje) >= 0 ? 'success' : 'danger'}>
                    {tendencias.data.crecimiento_porcentaje}%
                  </Badge>
                  <span className="text-sm text-dark-500">Crecimiento del periodo</span>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Brain size={20} className="text-purple-500" />
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white">Prediccion IA - Proximos 7 Dias</h3>
          </div>
          {prediccion.data?.prediccion_disponible && (
            <div className="space-y-2">
              {prediccion.data.predicciones?.slice(0, 7).map((pred: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-dark-100 dark:border-dark-700">
                  <div>
                    <p className="text-sm font-medium text-dark-900 dark:text-white">{pred.dia_semana}</p>
                    <p className="text-xs text-dark-400">{pred.fecha}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-dark-900 dark:text-white">Gs. {pred.prediccion_ventas.toLocaleString('es-PY')}</p>
                    <p className="text-xs text-dark-400">Confianza: {pred.confianza}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!prediccion.data?.prediccion_disponible && (
            <p className="text-dark-400 text-sm">Se necesitan mas datos historicos para generar predicciones</p>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={20} className="text-yellow-500" />
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white">Deteccion de Anomalias</h3>
          </div>
          {anomalias.data && (
            <div className="space-y-2">
              <p className="text-sm text-dark-500">
                <strong>{anomalias.data.total_anomalias || 0}</strong> anomalias detectadas
              </p>
              {anomalias.data.anomalias_ventas?.map((anomalia: any, index: number) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-dark-50 dark:bg-dark-900 rounded-xl">
                  <Badge variant={anomalia.tipo === 'pico_alto' ? 'success' : 'danger'}>{anomalia.tipo}</Badge>
                  <span className="text-sm text-dark-700 dark:text-dark-300">
                    {anomalia.fecha}: Gs. {Math.round(anomalia.total).toLocaleString('es-PY')} ({anomalia.porcentaje_desviacion}%)
                  </span>
                </div>
              ))}
              {anomalias.data.anomalias_productos?.map((anomalia: any, index: number) => (
                <div key={`prod-${index}`} className="flex items-center gap-2 p-2 bg-dark-50 dark:bg-dark-900 rounded-xl">
                  <Badge variant="warning">{anomalia.anomalia}</Badge>
                  <span className="text-sm text-dark-700 dark:text-dark-300">{anomalia.nombre}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={20} className="text-yellow-500" />
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white">Recomendaciones Inteligentes</h3>
          </div>
          {recomendaciones.data && (
            <div className="space-y-2">
              {recomendaciones.data.recomendaciones?.map((rec: any, index: number) => (
                <div key={index} className="p-3 bg-dark-50 dark:bg-dark-900 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={rec.prioridad === 'critica' ? 'danger' : rec.prioridad === 'alta' ? 'warning' : 'info'}>
                      {rec.tipo}
                    </Badge>
                    <span className="text-xs text-dark-400">{rec.prioridad}</span>
                  </div>
                  <p className="text-sm text-dark-700 dark:text-dark-300">{rec.mensaje}</p>
                  <p className="text-xs text-synap-500 mt-1">{rec.accion}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default BI;
