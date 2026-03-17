import React, { useState, useEffect } from 'react';
import { Users, Phone, Calendar, TrendingUp, TrendingDown, Award } from 'lucide-react';
import InfoMosaic from '../../components/ui/InfoMosaic';
import InfoCard from '../../components/ui/InfoCard';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('mes'); // 'hoy', 'mes', 'total'

  // Datos según período
  const statsData = {
    hoy: {
      prospectos: 5,
      llamadas: 12,
      citas: 3,
      ventasGanadas: 2,
      ventasPerdidas: 1
    },
    mes: {
      prospectos: 45,
      llamadas: 128,
      citas: 23,
      ventasGanadas: 18,
      ventasPerdidas: 7
    },
    total: {
      prospectos: 234,
      llamadas: 856,
      citas: 145,
      ventasGanadas: 98,
      ventasPerdidas: 34
    }
  };

  const stats = statsData[activeTab];

  const [vendedores, setVendedores] = useState([
    {
      id: 1,
      nombre: 'Carlos Méndez',
      avatar: '👨‍💼',
      actividad: 'Cerró venta con Cliente XYZ',
      tiempo: 'Hace 15 min',
      tipo: 'venta'
    },
    {
      id: 2,
      nombre: 'Ana García',
      avatar: '👩‍💼',
      actividad: 'Agendó cita con Prospecto ABC',
      tiempo: 'Hace 1 hora',
      tipo: 'cita'
    },
    {
      id: 3,
      nombre: 'Luis Torres',
      avatar: '👨‍💼',
      actividad: 'Realizó 8 llamadas',
      tiempo: 'Hace 2 horas',
      tipo: 'llamada'
    },
    {
      id: 4,
      nombre: 'María López',
      avatar: '👩‍💼',
      actividad: 'Agregó 3 nuevos prospectos',
      tiempo: 'Hace 3 horas',
      tipo: 'prospecto'
    }
  ]);

  return (
    <div className="min-h-screen p-6">
      {/* Tabs de Filtro */}
      <div className="backdrop-blur-sm border border-white/10 rounded-xl p-3 mb-6 inline-flex gap-1">
        <div role="tablist" className="tabs tabs-boxed bg-transparent gap-1">
          <a
            role="tab"
            className={`tab px-4 py-1.5 transition-all duration-300 rounded-md text-sm font-medium cursor-pointer ${activeTab === 'hoy' ? 'bg-aqua-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            onClick={() => setActiveTab('hoy')}
          >
            Hoy
          </a>
          <a
            role="tab"
            className={`tab px-4 py-1.5 transition-all duration-300 rounded-md text-sm font-medium cursor-pointer ${activeTab === 'mes' ? 'bg-aqua-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            onClick={() => setActiveTab('mes')}
          >
            Mes
          </a>
          <a
            role="tab"
            className={`tab px-4 py-1.5 transition-all duration-300 rounded-md text-sm font-medium cursor-pointer ${activeTab === 'total' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            onClick={() => setActiveTab('total')}
          >
            Total
          </a>
        </div>
      </div>

      {/* Grid de Métricas - Tipo Mosaico */}
      <InfoMosaic>

        {/* Prospectos */}
        <InfoCard
          title="Prospectos"
          value={stats.prospectos}
          subtext="Clientes potenciales"
          icon={Users}
          color="blue"
        />

        {/* Llamadas */}
        <InfoCard
          title="Llamadas"
          value={stats.llamadas}
          subtext="Este mes"
          icon={Phone}
          color="purple"
        />

        {/* Citas */}
        <InfoCard
          title="Citas"
          value={stats.citas}
          subtext="Agendadas"
          icon={Calendar}
          color="cyan"
        />

        {/* Ventas Ganadas */}
        <InfoCard
          title="Ganadas"
          value={stats.ventasGanadas}
          subtext="Ventas cerradas"
          icon={TrendingUp}
          color="green"
        />

        {/* Ventas Perdidas */}
        <InfoCard
          title="Perdidas"
          value={stats.ventasPerdidas}
          subtext="Oportunidades perdidas"
          icon={TrendingDown}
          color="red"
        />

        {/* Tasa de Conversión */}
        <InfoCard
          title="Conversión"
          value={`${Math.round((stats.ventasGanadas / (stats.ventasGanadas + stats.ventasPerdidas)) * 100) || 0}%`}
          subtext="Tasa de éxito"
          icon={Award}
          color="amber"
        />

      </InfoMosaic>

      {/* Vendedores con Actividad Reciente */}
      <div className="bg-gray-900/30 backdrop-blur-xl border border-gray-700/30 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          Vendedores con Actividad Reciente
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {vendedores.map((vendedor) => (
            <div
              key={vendedor.id}
              className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:bg-gray-800/60 transition-all duration-300 hover:scale-105"
            >
              {/* Avatar y Nombre */}
              <div className="flex items-center gap-3 mb-3">
                <div className="text-3xl">{vendedor.avatar}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-sm truncate">{vendedor.nombre}</h3>
                  <p className="text-xs text-gray-400">{vendedor.tiempo}</p>
                </div>
              </div>

              {/* Actividad */}
              <div className={`p-3 rounded-lg ${vendedor.tipo === 'venta' ? 'bg-green-500/10 border border-green-500/20' :
                vendedor.tipo === 'cita' ? 'bg-cyan-500/10 border border-cyan-500/20' :
                  vendedor.tipo === 'llamada' ? 'bg-purple-500/10 border border-purple-500/20' :
                    'bg-blue-500/10 border border-blue-500/20'
                }`}>
                <p className={`text-xs font-medium ${vendedor.tipo === 'venta' ? 'text-green-300' :
                  vendedor.tipo === 'cita' ? 'text-cyan-300' :
                    vendedor.tipo === 'llamada' ? 'text-purple-300' :
                      'text-blue-300'
                  }`}>
                  {vendedor.actividad}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;