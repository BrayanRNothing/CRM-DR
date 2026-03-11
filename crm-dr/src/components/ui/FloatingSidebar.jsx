import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import Avatar from './Avatar';

const SIDEBAR_HINT_KEY = 'crm_sidebar_hint_seen';

const FloatingSidebar = ({ menuItems, userInfo, title = 'CRM', logo, onCollapseChange, mode = 'light' }) => {
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
        : 'hover:bg-blue-50 hover:text-blue-950';

    const activeClasses = isDark
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
        : 'bg-blue-800 text-white shadow-lg shadow-blue-800/30';

    const inactiveClasses = isDark
        ? 'text-gray-400'
        : 'text-gray-500';

    const borderClass = isDark ? 'border-gray-800' : 'border-gray-100';

    return (
        <aside
            className={`flex flex-col border rounded-2xl transition-all duration-300 ${containerClasses} ${isCollapsed ? 'w-20' : 'w-64'
                }`}
        >
            {/* Header */}
            <div className={`flex items-center border-b ${borderClass} ${isCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-3'}`}>
                {isCollapsed ? (
                    <button
                        onClick={handleToggle}
                        className="relative flex items-center justify-center w-full group"
                        title="Expandir menú"
                    >
                        <div className={`flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-300 group-hover:scale-95 ${isDark ? 'bg-gray-800' : 'bg-blue-50 shadow-sm'}`}>
                            <img
                                src={logo}
                                alt={title}
                                className="h-8 w-8 object-contain"
                                style={{ mixBlendMode: isDark ? 'normal' : 'multiply' }}
                            />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <ChevronRight size={18} className={`${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                        </div>
                        {/* Indicador one-time: punto pulsante + tooltip */}
                        {showHint && (
                            <span className="absolute -top-1 -right-1 flex z-50">
                                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-blue-700 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-800" />
                                <span
                                    className="absolute left-5 top-0 whitespace-nowrap text-xs font-semibold px-2 py-1 rounded-lg shadow-lg pointer-events-none z-[9999]"
                                    style={{ background: isDark ? '#1e293b' : '#0f172a', color: '#5eead4' }}
                                >
                                    ¡Expande el menú!
                                </span>
                            </span>
                        )}
                    </button>
                ) : (
                    <>
                        <button
                            onClick={handleToggle}
                            className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
                            title="Contraer/Expandir menú"
                        >
                            {logo && (
                                <div className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-blue-50 shadow-sm'}`}>
                                    <img
                                        src={logo}
                                        alt={title}
                                        className="h-7 w-7 object-contain"
                                        style={{ mixBlendMode: isDark ? 'normal' : 'multiply' }}
                                    />
                                </div>
                            )}
                            <div className="flex flex-col min-w-0">
                                <span className={`font-semibold text-sm leading-tight truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    CRM Médico
                                </span>
                            </div>
                        </button>
                        <button
                            onClick={handleToggle}
                            className={`shrink-0 p-1.5 rounded-lg transition-colors ${hoverClasses}`}
                        >
                            <ChevronLeft size={18} />
                        </button>
                    </>
                )}
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
                                        className={`w-full flex items-center gap-3 py-3 rounded-xl transition-all ${isCollapsed ? 'justify-center px-0' : 'px-3'} ${inactiveClasses} ${hoverClasses}`}
                                        title={isCollapsed ? item.name : ''}
                                    >
                                        <div className="flex-shrink-0">{item.icon}</div>
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
                                                        <div className="flex-shrink-0">{child.icon}</div>
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
                                className={`flex items-center gap-3 py-3 rounded-xl transition-all ${isCollapsed ? 'justify-center px-0' : 'px-3'} ${isActive ? activeClasses : `${inactiveClasses} ${hoverClasses}`}`}
                                title={isCollapsed ? item.name : ''}
                            >
                                <div className="flex-shrink-0">{item.icon}</div>
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
                                        className={`w-full flex items-center gap-3 py-3 rounded-xl transition-all ${isCollapsed ? 'justify-center px-0' : 'px-3'} ${inactiveClasses} ${hoverClasses}`}
                                        title={isCollapsed ? item.name : ''}
                                    >
                                        <div className="flex-shrink-0">{item.icon}</div>
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
                                                        <div className="flex-shrink-0">{child.icon}</div>
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
                                className={`flex items-center gap-3 py-3 rounded-xl transition-all ${isCollapsed ? 'justify-center px-0' : 'px-3'} ${isActive ? activeClasses : `${inactiveClasses} ${hoverClasses}`}`}
                                title={isCollapsed ? item.name : ''}
                            >
                                <div className="flex-shrink-0">{item.icon}</div>
                                {!isCollapsed && <span className="font-medium truncate">{item.name}</span>}
                            </Link>
                        );
                    })}
                </div>
            </nav>

        </aside>
    );
};

export default FloatingSidebar;
