import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const MetricKPICard = ({ 
    title, 
    value, 
    format = 'number', 
    icon, 
    detail, 
    trend, 
    color = 'blue',
    thresholds = { good: 50, okay: 30 }
}) => {
    
    const getStatusColor = (val) => {
        if (format !== 'percent') return `bg-${color}-50 text-${color}-600 border-${color}-100`;
        const num = parseFloat(val);
        if (num >= thresholds.good) return 'bg-green-50 text-green-600 border-green-100';
        if (num >= thresholds.okay) return 'bg-amber-50 text-amber-600 border-amber-100';
        return 'bg-rose-50 text-rose-600 border-rose-100';
    };

    const statusClasses = getStatusColor(value);

    const formattedValue = () => {
        if (format === 'percent') return `${value.toFixed(1)}%`;
        if (format === 'money') return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
        return new Intl.NumberFormat('es-MX').format(value);
    };

    return (
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden h-full flex flex-col justify-center">
            {/* Trend Badge - Absolute top-right */}
            {trend !== undefined && (
                <div className={`absolute top-3 right-3 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black ${trend > 0 ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                    {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(trend)}%
                </div>
            )}

            <div className="flex items-center gap-4">
                {/* Icon Section */}
                <div className={`p-2.5 rounded-xl ${statusClasses.split(' ')[0]} ${statusClasses.split(' ')[1]} transition-colors shrink-0`}>
                    {React.cloneElement(icon, { className: 'w-5 h-5' })}
                </div>
                
                {/* Content Section */}
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate mb-0.5">{title}</p>
                    <div className="flex items-baseline gap-1.5">
                        <h3 className="text-xl font-black text-gray-800 tracking-tight leading-none">{formattedValue()}</h3>
                    </div>
                </div>
            </div>

            {/* Sub-detail if exists */}
            {detail && (
                <p className="text-[9px] text-gray-400 font-medium group-hover:text-gray-500 transition-colors mt-2.5 truncate">
                    {detail}
                </p>
            )}

            {/* Progress bar as a thin base line */}
            {format === 'percent' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-50 overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-700 ${statusClasses.split(' ')[1].replace('text', 'bg')}`} 
                        style={{ width: `${Math.min(value, 100)}%` }} 
                    />
                </div>
            )}
        </div>
    );
};

export default MetricKPICard;
