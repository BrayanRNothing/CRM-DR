import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import Avatar from './Avatar';

const SIDEBAR_HINT_KEY = 'crm_sidebar_hint_seen';

const FloatingSidebar = ({ menuItems, userInfo, title = 'CRM', subtitle = 'Workspace', logo, onCollapseChange, mode = 'light' }) => {
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
        : 'bg-white border-gray-200 text-gray-800 shadow-xl';

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
    const initials = String(title)
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <aside
            className={`flex flex-col border rounded-2xl transition-all duration-300 ${containerClasses} ${isCollapsed ? 'w-20' : 'w-64'
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
                        <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-(--theme-500) via-(--theme-600) to-(--theme-700) flex items-center justify-center text-white font-black text-sm shadow-lg ring-1 ring-white/20 transition-all duration-300 group-hover:scale-95 group-hover:opacity-20 text-center uppercase">
                            {logo ? logo : initials}
                        </div>
                        <span className="absolute -bottom-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
                            className="shrink-0 w-11 h-11 rounded-xl bg-linear-to-br from-(--theme-500) via-(--theme-600) to-(--theme-700) text-white shadow-md ring-1 ring-white/20 flex items-center justify-center font-black text-xs tracking-wide hover:scale-[0.98] transition-transform"
                            title="Contraer/Expandir menú"
                        >
                            {logo ? logo : initials}
                        </button>
                        <button
                            onClick={handleToggle}
                            className="min-w-0 text-left group"
                            title="Contraer/Expandir menú"
                        >
                            <p className="font-black tracking-tight text-lg leading-none bg-clip-text text-transparent bg-linear-to-r from-(--theme-600) to-(--theme-400) truncate">
                                {title}
                            </p>
                            <p className={`text-[11px] font-semibold mt-1 leading-none truncate transition-opacity ${isDark ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                {subtitle}
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
            <div className={`flex-1 flex flex-col transition-all duration-500 ease-in-out ${isCollapsed ? 'translate-y-4' : '-translate-y-1'}`}>
                {/* User Greeting */}
                <div className={`px-4 py-3 border-b ${borderClass}`}>
                    <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                        <div className="shrink-0 flex items-center justify-center w-8 h-8">
                            <Avatar name={userInfo?.nombre || 'U'} size="sm" />
                        </div>
                        {!isCollapsed && (
                            <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                Hola, {userInfo?.nombre || 'Usuario'}
                            </p>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 flex flex-col overflow-y-auto scrollbar-hide">
                {/* Regular items */}
                <div className="space-y-1">
                    {menuItems.filter(i => !i.isBottom).map((item, index) => {
                        if (item.isAccordion) {
                            const isOpen = openAccordions[item.name];
                            return (
                                <div key={index}>
                                    <button
                                        onClick={() => !isCollapsed && toggleAccordion(item.name)}
                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${inactiveClasses} ${hoverClasses}`}
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
                                    {!isCollapsed && isOpen && item.children && (
                                        <div className="ml-4 mt-1 space-y-1">
                                            {item.children.map((child, childIndex) => {
                                                const isActive = location.pathname === child.path;
                                                return (
                                                    <Link key={childIndex} to={child.path}
                                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm ${isActive ? activeClasses : `${inactiveClasses} ${hoverClasses}`}`}
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
                        const isActive = location.pathname === item.path;
                        return (
                            <Link key={index} to={item.path}
                                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${isActive ? activeClasses : `${inactiveClasses} ${hoverClasses}`}`}
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
                        if (item.isAccordion) {
                            const isOpen = openAccordions[item.name];
                            return (
                                <div key={`bot-${index}`}>
                                    <button
                                        onClick={() => !isCollapsed && toggleAccordion(item.name)}
                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${inactiveClasses} ${hoverClasses}`}
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
                                    {!isCollapsed && isOpen && item.children && (
                                        <div className="ml-4 mt-1 space-y-1">
                                            {item.children.map((child, childIndex) => {
                                                const isActive = location.pathname === child.path;
                                                return (
                                                    <Link key={childIndex} to={child.path}
                                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm ${isActive ? activeClasses : `${inactiveClasses} ${hoverClasses}`}`}
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
                        const isActive = location.pathname === item.path;
                        return (
                            <Link key={`bot-${index}`} to={item.path}
                                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${isActive ? activeClasses : `${inactiveClasses} ${hoverClasses}`}`}
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
