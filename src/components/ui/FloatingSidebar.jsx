import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronDown, LogOut } from 'lucide-react';
import Avatar from './Avatar';
import { logout } from '../../utils/authUtils';

const FloatingSidebar = ({ menuItems, userInfo, title = 'CRM', logo, onCollapseChange, mode = 'light' }) => {
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [openAccordions, setOpenAccordions] = useState({});

    const isDark = mode === 'dark';

    const handleToggle = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        if (onCollapseChange) {
            onCollapseChange(newState);
        }
    };

    const toggleAccordion = (index) => {
        setOpenAccordions(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const handleLogout = () => {
        logout();
        window.location.href = '/'; // Redirigir al login
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
                    >
                        <img
                            src={logo}
                            alt={title}
                            className="h-8 w-8 object-contain transition-opacity duration-300 group-hover:opacity-20"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <ChevronRight size={24} className={`${isDark ? 'text-white' : 'text-gray-800'}`} />
                        </div>
                    </button>
                ) : (
                    <>
                        {logo ? (
                            <div className="flex-1 flex justify-center">
                                <img
                                    src={logo}
                                    alt={title}
                                    className="h-10 w-auto object-contain"
                                />
                            </div>
                        ) : (
                            <h2 className={`font-bold text-xl ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                {title}
                            </h2>
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

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-hide">
                {menuItems.map((item, index) => {
                    // Check if item is an accordion section
                    if (item.isAccordion) {
                        const isOpen = openAccordions[index];
                        return (
                            <div key={index} className={item.gap ? 'mt-6' : ''}>
                                {/* Accordion Header */}
                                <button
                                    onClick={() => !isCollapsed && toggleAccordion(index)}
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

                                {/* Accordion Content */}
                                {!isCollapsed && isOpen && item.children && (
                                    <div className="ml-4 mt-1 space-y-1">
                                        {item.children.map((child, childIndex) => {
                                            const isActive = location.pathname === child.path;
                                            return (
                                                <Link
                                                    key={childIndex}
                                                    to={child.path}
                                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm ${isActive ? activeClasses : `${inactiveClasses} ${hoverClasses}`
                                                        }`}
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

                    // Regular menu item
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={index}
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${item.gap ? 'mt-6' : ''
                                } ${isActive ? activeClasses : `${inactiveClasses} ${hoverClasses}`}`}
                            title={isCollapsed ? item.name : ''}
                        >
                            <div className="flex-shrink-0">{item.icon}</div>
                            {!isCollapsed && (
                                <span className="font-medium truncate">{item.name}</span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* User Profile */}
            <div className={`p-3 border-t ${borderClass}`}>
                {!isCollapsed ? (
                    <>
                        <div className="flex items-center gap-3 mb-3 px-2">
                            <Avatar name={userInfo?.nombre || 'Usuario'} size="sm" />
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                    {userInfo?.nombre || 'Usuario'}
                                </p>
                                <p className={`text-xs truncate ${inactiveClasses}`}>{userInfo?.rol || 'Usuario'}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className={`w-full px-3 py-2 text-sm rounded-xl transition-colors flex items-center justify-center gap-2 ${inactiveClasses} ${hoverClasses}`}
                        >
                            <LogOut className="w-4 h-4" />
                            Cerrar Sesión
                        </button>
                    </>
                ) : (
                    <button
                        onClick={handleLogout}
                        className={`w-full p-3 rounded-xl transition-colors flex items-center justify-center ${inactiveClasses} ${hoverClasses}`}
                        title="Cerrar Sesión"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                )}
            </div>
        </aside>
    );
};

export default FloatingSidebar;
