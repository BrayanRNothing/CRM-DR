import React, { lazy, Suspense } from 'react';
import { getUser } from '../../utils/authUtils';
import SkeletonLoader from '../../components/ui/SkeletonLoader';

const CloserDashboard = lazy(() => import('./CloserDashboard'));
const ProspectorDashboard = lazy(() => import('./ProspectorDashboard'));
const IndividualDashboard = lazy(() => import('./IndividualDashboard'));

const DashboardSwitcher = () => {
    const user = getUser();
    const rol = user?.rol?.toLowerCase();

    const renderDashboard = () => {
        switch (rol) {
            case 'prospector':
                return <ProspectorDashboard />;
            case 'closer':
                return <CloserDashboard />;
            case 'individual':
                return <IndividualDashboard />;
            default:
                // Fallback a individual o un loader si no hay rol
                return <IndividualDashboard />;
        }
    };

    return (
        <Suspense fallback={
            <div className="p-8 w-full h-full">
                <SkeletonLoader variant="dashboard" />
            </div>
        }>
            {renderDashboard()}
        </Suspense>
    );
};

export default DashboardSwitcher;
