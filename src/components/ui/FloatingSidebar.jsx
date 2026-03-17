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
        : 'hover:bg-teal-50 hover:text-teal-700';

    const activeClasses = isDark
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
        : 'bg-teal-500 text-white shadow-lg shadow-teal-500/30';

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
            <div className={`flex items-center p-4 border-b ${borderClass} ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                {isCollapsed ? (
                    <button
                        onClick={handleToggle}
                        className="relative flex items-center justify-center w-full group"
                        title="Expandir menú"
                    >
                        <img
                            src={logo}
                            alt={title}
                            className="h-8 w-8 object-contain transition-opacity duration-300 group-hover:opacity-20"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <ChevronRight size={24} className={`${isDark ? 'text-white' : 'text-gray-800'}`} />
                        </div>
                        {/* Indicador one-time: punto pulsante + tooltip */}
                        {showHint && (
                            <span className="absolute -top-1 -right-1 flex z-50">
                                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-teal-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500" />
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
                        {logo ? (
                            <button
                                onClick={handleToggle}
                                className="flex-1 flex justify-center hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
                                title="Contraer/Expandir menú"
                            >
                                <img
                                    src={logo}
                                    alt={title}
                                    className="h-10 w-auto object-contain"
                                />
                            </button>
                        ) : (
                            <button
                                onClick={handleToggle}
                                className={`font-bold text-xl hover:opacity-80 transition-opacity cursor-pointer focus:outline-none ${isDark ? 'text-white' : 'text-gray-800'}`}
                                title="Contraer/Expandir menú"
                            >
                                {title}
                            </button>
                        )}
                        <button
                            onClick={handleToggle}
                            className={`p-1.5 rounded-lg transition-colors absolute right-4 ${hoverClasses}`}
                        >
                            <ChevronLeft size={20} />
                        </button>
                    </>
                )}
            </div>

            {/* User Greeting */}
            <div className={`px-4 py-3 border-b ${borderClass}`}>
                {!isCollapsed ? (
                    <div className="flex items-center gap-3">
                        <Avatar name={userInfo?.nombre || 'U'} size="sm" />
                        <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            Hola, {userInfo?.nombre || 'Usuario'}
                        </p>
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <Avatar name={userInfo?.nombre || 'U'} size="sm" />
                    </div>
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
                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${inactiveClasses} ${hoverClasses}`}
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
                                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${isActive ? activeClasses : `${inactiveClasses} ${hoverClasses}`}`}
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
                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${inactiveClasses} ${hoverClasses}`}
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
                                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${isActive ? activeClasses : `${inactiveClasses} ${hoverClasses}`}`}
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
