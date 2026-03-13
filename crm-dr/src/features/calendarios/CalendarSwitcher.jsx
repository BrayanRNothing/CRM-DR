import React, { lazy, Suspense } from 'react';
import { getUser, decodeRole } from '../../utils/authUtils';
import SkeletonLoader from '../../components/ui/SkeletonLoader';

import ProspectorCalendar from './ProspectorCalendar';
import CloserCalendar from './CloserCalendar';

const CalendarSwitcher = () => {
    const user = getUser();
    const tokenRole = decodeRole();
    
    // Prioridad al rol del objeto usuario, fallback al token
    const rawRol = user?.rol || user?.role || tokenRole || '';
    const rol = rawRol.toLowerCase().trim();
    
    console.log('CalendarSwitcher detectó rol:', rol, { fromUser: user?.rol || user?.role, fromToken: tokenRole });

    const renderCalendar = () => {
        if (rol === 'prospector' || rol === 'agendador') {
            return <ProspectorCalendar />;
        }
        
        // El resto de roles (closer, admin, individual, doctor) usan CloserCalendar
        return <CloserCalendar />;
    };

    return (
        <div className="w-full h-full">
            {renderCalendar()}
        </div>
    );
};

export default CalendarSwitcher;
