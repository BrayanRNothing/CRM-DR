import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedGridBackground from '../components/ui/AnimatedGridBackground';
import logosolomycrm from '../assets/logosolomycrm.png';

const MainLayoutMobile = ({ menuItems, userInfo }) => {
    const location = useLocation();
    const isDashboard = location.pathname === '/' || location.pathname === '/dashboard';

    return (
        <AnimatedGridBackground mode="light">
            <div className="h-dvh flex flex-col overflow-hidden relative font-sans">
                
                {/* ── Top Header ── */}
                <header className="px-5 pt-safe bg-white/70 backdrop-blur-xl border-b border-white/40 sticky top-0 z-50">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white shadow-sm border border-slate-100 p-2 flex items-center justify-center">
                                <img src={logosolomycrm} alt="SoloMyCRM" className="w-full h-full object-contain" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black tracking-[0.15em] uppercase text-slate-800 leading-none">SoloMyCRM</span>
                                <span className="text-[9px] font-bold text-(--theme-500) uppercase tracking-widest mt-0.5">{userInfo?.rol || 'Workspace'}</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-slate-700 leading-none">{userInfo?.nombre || 'User'}</span>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Online</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* ── Main Content Area ── */}
                <main className={`flex-1 overflow-y-auto pb-[90px] relative scrollbar-hide ${!isDashboard ? 'bg-white' : ''}`}>
                    <div className="p-4 min-h-full">
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
                                        className={`p-1.5 rounded-2xl transition-all duration-300 shrink-0 ${
                                            isActive 
                                            ? 'bg-(--theme-500) text-white shadow-lg shadow-(--theme-500)/30' 
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
                                    
                                    {isActive && (
                                        <motion.div 
                                            layoutId="activeTab"
                                            className="absolute -top-1 w-1 h-1 rounded-full bg-(--theme-500)"
                                        />
                                    )}
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
