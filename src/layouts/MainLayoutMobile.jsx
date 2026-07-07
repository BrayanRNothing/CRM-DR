import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedGridBackground from '../components/ui/AnimatedGridBackground';
import logosolomycrm from '../assets/logosolomycrm.png';
import GracePeriodBanner from '../components/ui/GracePeriodBanner';
import { getToken } from '../utils/authUtils';
import API_URL from '../config/api';

const MainLayoutMobile = ({ menuItems, userInfo, diasGracia }) => {
    const location = useLocation();
    const isDashboard = location.pathname === '/' || location.pathname === '/dashboard';

    return (
        <AnimatedGridBackground mode="light">
            <div className="h-dvh flex flex-col overflow-hidden relative font-sans">
                
                {/* ── Top Header ── */}
                <header className="px-5 pt-safe bg-white/70 backdrop-blur-xl border-b border-white/40 sticky top-0 z-50">
                    <div className="flex items-center justify-between h-12">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-white shadow-sm border border-slate-100 p-1 flex items-center justify-center">
                                <img src={logosolomycrm} alt="SoloMyCRM" className="w-full h-full object-contain" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black tracking-[0.15em] uppercase text-slate-800 leading-none">SoloMyCRM</span>
                                <span className="text-[8px] font-bold text-(--theme-500) uppercase tracking-widest mt-0.5">{userInfo?.rol || 'Workspace'}</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center">
                            <span className="text-[10px] font-black text-slate-700 leading-none">{userInfo?.nombre || 'User'}</span>
                        </div>
                    </div>
                </header>

                {/* ── Main Content Area ── */}
                <main className={`flex-1 overflow-y-auto pb-[90px] relative scrollbar-hide ${!isDashboard ? 'bg-white' : ''}`}>
                    {diasGracia === -1 ? (
                        <div className="min-h-full flex flex-col items-center justify-center p-6 text-center bg-white">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 border border-red-200">
                                <span className="text-2xl">🔒</span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 mb-2">Suscripción Expirada</h2>
                            <p className="text-slate-600 mb-6 text-sm font-medium">
                                Tu periodo de gracia terminó. Renueva tu suscripción para seguir usando SoloMyCRM.
                            </p>
                            <button
                                onClick={async (e) => {
                                    const btn = e.currentTarget;
                                    btn.innerText = 'Cargando...';
                                    btn.disabled = true;
                                    try {
                                        const res = await fetch(`${API_URL}/api/auth/create-renewal-checkout`, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'x-auth-token': getToken(),
                                            },
                                            body: JSON.stringify({ plan: 'mensual' })
                                        });
                                        const data = await res.json();
                                        if (res.ok && data.url) {
                                            window.location.href = data.url;
                                        } else {
                                            alert('Error: ' + (data.mensaje || 'No se pudo abrir'));
                                            btn.innerText = '💳 Renovar';
                                            btn.disabled = false;
                                        }
                                    } catch (err) {
                                        alert('Error de red');
                                        btn.innerText = '💳 Renovar';
                                        btn.disabled = false;
                                    }
                                }}
                                className="px-6 py-3 w-full bg-slate-900 text-white font-bold rounded-xl shadow-lg"
                            >
                                💳 Renovar
                            </button>
                            <button 
                                onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.href = '/'; }}
                                className="mt-4 text-slate-500 font-bold"
                            >
                                Cerrar sesión
                            </button>
                        </div>
                    ) : (
                        <div className="p-4 min-h-full">
                            {diasGracia !== null && diasGracia >= 0 && (
                                <div className="-mx-4 -mt-4 mb-4">
                                    <GracePeriodBanner diasRestantes={diasGracia} />
                                </div>
                            )}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={location.pathname}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="h-full"
                                >
                                    <Outlet />
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    )}
                </main>

                {/* ── Bottom Navigation Bar (Docked) ── */}
                <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-2xl border-t border-white/40 rounded-t-4xl shadow-[0_-10px_30px_-5px_rgba(0,0,0,0.1)]">
                    <div className="px-2 py-2 flex items-center justify-between">
                        {menuItems.filter((item) => !item.isSpacer).map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    className="relative flex flex-col items-center justify-center gap-1 group py-1"
                                    style={{ flex: 1, minWidth: 0 }}
                                >
                                    <motion.div
                                        animate={isActive ? { scale: 1.1, y: -2 } : { scale: 1, y: 0 }}
                                        className={`p-1.5 transition-all duration-300 shrink-0 ${
                                            isActive 
                                            ? 'text-(--theme-500)' 
                                            : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                    >
                                        {item.icon}
                                    </motion.div>
                                    <span className={`text-[8.5px] font-bold uppercase tracking-tight text-center leading-tight w-full truncate px-0.5 ${
                                        isActive ? 'text-(--theme-600)' : 'text-slate-400'
                                    }`}>
                                        {item.name}
                                    </span>
                                    

                                </Link>
                            );
                        })}
                    </div>
                    {/* Safe area padding for iPhones with Home Indicator */}
                    <div className="h-safe-bottom" />
                </nav>

                <style>{`
                    .pt-safe { padding-top: env(safe-area-inset-top, 16px); }
                    .pb-safe { padding-bottom: env(safe-area-inset-bottom, 16px); }
                    .h-safe-bottom { height: env(safe-area-inset-bottom, 20px); }
                `}</style>
            </div>
        </AnimatedGridBackground>
    );
};

export default MainLayoutMobile;
