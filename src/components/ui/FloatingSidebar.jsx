import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import Avatar from './Avatar';

const SIDEBAR_HINT_KEY = 'crm_sidebar_hint_seen';

const BrandGlyph = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="2" fill="currentColor" opacity="0.95" />
        <rect x="14" y="3" width="7" height="7" rx="2" fill="currentColor" opacity="0.6" />
        <rect x="3" y="14" width="7" height="7" rx="2" fill="currentColor" opacity="0.6" />
        <rect x="14" y="14" width="7" height="7" rx="2" fill="currentColor" opacity="0.95" />
    </svg>
);

const FloatingSidebar = ({ menuItems, userInfo, title = 'solomycrm', subtitle = 'Workspace', logo, onCollapseChange, mode = 'light' }) => {
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [openAccordions, setOpenAccordions] = useState({});
    // Mostrar el indicador solo si nunca se ha visto antes
    const [showHint, setShowHint] = useState(() => !localStorage.getItem(SIDEBAR_HINT_KEY));

    const isDark = mode === 'dark';

    const handleToggle = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        if (onCollapseChange) onCollapseChange(newState);
        // Descartar el hint la primera vez que el usuario interactúa
        if (showHint) {
            setShowHint(false);
            localStorage.setItem(SIDEBAR_HINT_KEY, '1');
        }
    };

    const toggleAccordion = (identifier) => {
        setOpenAccordions(prev => ({ ...prev, [identifier]: !prev[identifier] }));
    };

    // Estilos dinámicos
    const containerClasses = isDark
        ? 'backdrop-blur-xs border-gray-700/30 bg-gray-900/80 text-white'
        : 'bg-white border-gray-200 text-gray-800';

    const hoverClasses = isDark
        ? 'hover:bg-gray-800 hover:text-white'
        : 'hover:bg-(--theme-50) hover:text-(--theme-700)';

    const activeClasses = isDark
        ? 'bg-(--theme-600) text-white shadow-lg shadow-(--theme-600)/30'
        : 'bg-(--theme-500) text-white shadow-lg shadow-(--theme-500)/30';

    const inactiveClasses = isDark
        ? 'text-gray-400'
        : 'text-gray-500';

    const borderClass = isDark ? 'border-gray-800' : 'border-gray-100';
    return (
        <aside
            className={`flex flex-col border rounded-2xl transition-all duration-300 premium-reflejo ${containerClasses} ${isCollapsed ? 'w-20' : 'w-64'
                }`}
        >
            {/* Header */}
            <div className={`p-3 border-b ${borderClass}`}>
                {isCollapsed ? (
                    <button
                        onClick={handleToggle}
                        className="relative flex items-center justify-center w-full group py-1"
                        title="Expandir menú"
                    >
                        <div className="w-12 h-12 flex items-center justify-center transition-all duration-300 group-hover:scale-95">
                            {logo ? logo : <BrandGlyph />}
                        </div>
                        <span className="absolute -bottom-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
                        <div className="absolute inset-0 flex items-center justify-center translate-x-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <ChevronRight size={24} className={`${isDark ? 'text-white' : 'text-gray-800'}`} />
                        </div>
                        {/* Indicador one-time: punto pulsante + tooltip */}
                        {showHint && (
                            <span className="absolute -top-1 -right-1 flex z-9999">
                                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-(--theme-400) opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-(--theme-500)" />
                                <span
                                    className="absolute left-5 top-0 whitespace-nowrap text-xs font-semibold px-2 py-1 rounded-lg shadow-lg pointer-events-none z-9999"
                                    style={{ background: isDark ? '#1e293b' : '#0f172a', color: '#5eead4' }}
                                >
                                    ¡Expande el menú!
                                </span>
                            </span>
                        )}
                    </button>
                ) : (
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={handleToggle}
                            className="shrink-0 w-11 h-11 flex items-center justify-center hover:scale-[0.98] transition-transform"
                            title="Contraer/Expandir menú"
                        >
                            {logo ? logo : <BrandGlyph />}
                        </button>
                        <button
                            onClick={handleToggle}
                            className="min-w-0 text-left group"
                            title="Contraer/Expandir menú"
                        >
                            <p className="font-black tracking-tight text-lg leading-none bg-clip-text text-transparent bg-linear-to-r from-(--theme-600) to-(--theme-400) truncate">
                                {userInfo?.nombre || title}
                            </p>
                            <p className={`text-[11px] font-semibold mt-1 leading-none truncate transition-opacity ${isDark ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                {userInfo?.rol || subtitle}
                            </p>
                        </button>
                        <button
                            onClick={handleToggle}
                            className={`ml-auto p-1.5 rounded-lg transition-colors ${hoverClasses}`}
                            title="Contraer menú"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    </div>
                )}
            </div>

            {/* Content Wrapper with vertical shift animation */}
            <div className={`flex-1 flex flex-col transition-all duration-500 ease-in-out ${isCollapsed ? 'translate-y-0' : '-translate-y-1'}`}>
                {/* Navigation */}
                <nav className="flex-1 p-3 flex flex-col overflow-y-auto scrollbar-hide">
                    {/* Regular items */}
                    <div className="space-y-1">
                        {menuItems.filter(i => !i.isBottom).map((item, index) => {
                            const isActive = item.path && location.pathname === item.path;
                            const hasActiveChild = item.children?.some(child => location.pathname === child.path);

                            if (item.isAccordion) {
                                const isOpen = openAccordions[item.name];
                                return (
                                    <div key={index} className="relative group/accordion">
                                        <button
                                            onClick={() => {
                                                if (isCollapsed) {
                                                    handleToggle();
                                                    if (!openAccordions[item.name]) {
                                                        toggleAccordion(item.name);
                                                    }
                                                } else {
                                                    toggleAccordion(item.name);
                                                }
                                            }}
                                            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-3 rounded-xl transition-all ${hasActiveChild && isCollapsed ? activeClasses : `${inactiveClasses} ${hoverClasses}`}`}
                                            title={isCollapsed ? item.name : ''}
                                        >
                                            <div className="shrink-0">{item.icon}</div>
                                            {!isCollapsed && (
                                                <>
                                                    <span className="font-medium truncate flex-1 text-left">{item.name}</span>
                                                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                                </>
                                            )}
                                        </button>

                                        {/* Submenú Flotante (cuando está contraído) */}
                                        {isCollapsed && item.children && (
                                            <div className="fixed left-22 ml-1 invisible group-hover/accordion:visible opacity-0 group-hover/accordion:opacity-100 transition-all duration-200 z-100">
                                                <div className={`${containerClasses} border rounded-2xl p-2 min-w-[180px] backdrop-blur-xl`}>
                                                    <div className={`px-3 py-2 border-b ${borderClass} mb-1`}>
                                                        <p className="text-xs font-bold uppercase tracking-wider opacity-50">{item.name}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {item.children.map((child, childIndex) => {
                                                            const isChildActive = location.pathname === child.path;
                                                            return (
                                                                <Link key={childIndex} to={child.path}
                                                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm ${isChildActive ? activeClasses : `${inactiveClasses} ${hoverClasses}`}`}
                                                                >
                                                                    <div className="shrink-0">{child.icon}</div>
                                                                    <span className="font-medium truncate">{child.name}</span>
                                                                </Link>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Acordeón Tradicional (cuando está expandido) */}
                                        {!isCollapsed && isOpen && item.children && (
                                            <div className="ml-4 mt-1 space-y-1 border-l-2 border-(--theme-500)/20 pl-2">
                                                {item.children.map((child, childIndex) => {
                                                    const isChildActive = location.pathname === child.path;
                                                    return (
                                                        <Link key={childIndex} to={child.path}
                                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm ${isChildActive ? activeClasses : `${inactiveClasses} ${hoverClasses}`}`}
                                                        >
                                                            <div className="shrink-0">{child.icon}</div>
                                                            <span className="font-medium truncate">{child.name}</span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            return (
                                <Link key={index} to={item.path}
                                    className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-3 rounded-xl transition-all ${isActive ? activeClasses : `${inactiveClasses} ${hoverClasses}`}`}
                                    title={isCollapsed ? item.name : ''}
                                >
                                    <div className="shrink-0">{item.icon}</div>
                                    {!isCollapsed && <span className="font-medium truncate">{item.name}</span>}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Spacer pushes Ajustes to bottom */}
                    <div className="flex-1" />

                    {/* Bottom items (Ajustes) */}
                    <div className={`space-y-1 pt-2 mt-2 border-t ${borderClass}`}>
                        {menuItems.filter(i => i.isBottom).map((item, index) => {
                            const isActive = item.path && location.pathname === item.path;
                            const hasActiveChild = item.children?.some(child => location.pathname === child.path);

                            if (item.isAccordion) {
                                const isOpen = openAccordions[item.name];
                                return (
                                    <div key={`bot-${index}`} className="relative group/accordion">
                                        <button
                                            onClick={() => {
                                                if (isCollapsed) {
                                                    handleToggle();
                                                    if (!openAccordions[item.name]) {
                                                        toggleAccordion(item.name);
                                                    }
                                                } else {
                                                    toggleAccordion(item.name);
                                                }
                                            }}
                                            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-3 rounded-xl transition-all ${hasActiveChild && isCollapsed ? activeClasses : `${inactiveClasses} ${hoverClasses}`}`}
                                            title={isCollapsed ? item.name : ''}
                                        >
                                            <div className="shrink-0">{item.icon}</div>
                                            {!isCollapsed && (
                                                <>
                                                    <span className="font-medium truncate flex-1 text-left">{item.name}</span>
                                                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                                </>
                                            )}
                                        </button>

                                        {/* Submenú Flotante (cuando está contraído) */}
                                        {isCollapsed && item.children && (
                                            <div className="fixed left-22 bottom-4 ml-1 invisible group-hover/accordion:visible opacity-0 group-hover/accordion:opacity-100 transition-all duration-200 z-100">
                                                <div className={`${containerClasses} border rounded-2xl p-2 min-w-[180px] backdrop-blur-xl`}>
                                                    <div className={`px-3 py-2 border-b ${borderClass} mb-1`}>
                                                        <p className="text-xs font-bold uppercase tracking-wider opacity-50">{item.name}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {item.children.map((child, childIndex) => {
                                                            const isChildActive = location.pathname === child.path;
                                                            return (
                                                                <Link key={childIndex} to={child.path}
                                                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm ${isChildActive ? activeClasses : `${inactiveClasses} ${hoverClasses}`}`}
                                                                >
                                                                    <div className="shrink-0">{child.icon}</div>
                                                                    <span className="font-medium truncate">{child.name}</span>
                                                                </Link>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {!isCollapsed && isOpen && item.children && (
                                            <div className="ml-4 mt-1 space-y-1 border-l-2 border-(--theme-500)/20 pl-2">
                                                {item.children.map((child, childIndex) => {
                                                    const isChildActive = location.pathname === child.path;
                                                    return (
                                                        <Link key={childIndex} to={child.path}
                                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm ${isChildActive ? activeClasses : `${inactiveClasses} ${hoverClasses}`}`}
                                                        >
                                                            <div className="shrink-0">{child.icon}</div>
                                                            <span className="font-medium truncate">{child.name}</span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            return (
                                <Link key={`bot-${index}`} to={item.path}
                                    className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-3 rounded-xl transition-all ${isActive ? activeClasses : `${inactiveClasses} ${hoverClasses}`}`}
                                    title={isCollapsed ? item.name : ''}
                                >
                                    <div className="shrink-0">{item.icon}</div>
                                    {!isCollapsed && <span className="font-medium truncate">{item.name}</span>}
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            </div>

        </aside>
    );
};

export default FloatingSidebar;
