import React from 'react';

/**
 * Componente de Skeleton Loader reutilizable
 * Variantes: card, table, form, dashboard
 */
const SkeletonLoader = ({ variant = 'card', count = 1 }) => {
    const renderCard = () => (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="flex items-center justify-between mt-4">
                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
        </div>
    );

    const renderTable = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
            <div className="p-4 border-b border-gray-200">
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            </div>
            {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4 border-b border-gray-100 flex items-center gap-4">
                    <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-8 bg-gray-200 rounded w-20"></div>
                </div>
            ))}
        </div>
    );

    const renderForm = () => (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
            {[...Array(4)].map((_, i) => (
                <div key={i}>
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                </div>
            ))}
            <div className="h-12 bg-gray-200 rounded w-full mt-6"></div>
        </div>
    );

    const renderDashboard = () => (
        <div className="space-y-6 animate-pulse">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                ))}
            </div>
            {/* Chart */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
            </div>
        </div>
    );

    const renderSkeleton = () => {
        switch (variant) {
            case 'table':
                return renderTable();
            case 'form':
                return renderForm();
            case 'dashboard':
                return renderDashboard();
            case 'card':
            default:
                return (
                    <div className="space-y-3">
                        {[...Array(count)].map((_, i) => (
                            <div key={i}>{renderCard()}</div>
                        ))}
                    </div>
                );
        }
    };

    return renderSkeleton();
};

export default SkeletonLoader;
