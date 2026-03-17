import React from 'react';

const colorStyles = {
    blue: {
        bg: 'from-blue-500/20 to-blue-600/20',
        border: 'border-blue-500/30',
        iconBg: 'bg-blue-500/20',
        iconColor: 'text-blue-400',
        titleColor: 'text-blue-300',
        subtextColor: 'text-blue-200'
    },
    purple: {
        bg: 'from-purple-500/20 to-purple-600/20',
        border: 'border-purple-500/30',
        iconBg: 'bg-purple-500/20',
        iconColor: 'text-purple-400',
        titleColor: 'text-purple-300',
        subtextColor: 'text-purple-200'
    },
    cyan: {
        bg: 'from-cyan-500/20 to-cyan-600/20',
        border: 'border-cyan-500/30',
        iconBg: 'bg-cyan-500/20',
        iconColor: 'text-cyan-400',
        titleColor: 'text-cyan-300',
        subtextColor: 'text-cyan-200'
    },
    aqua: { // Mapping aqua to cyan styles if aqua doesn't exist, or we can use specific if user defined it
        bg: 'from-cyan-500/20 to-cyan-600/20',
        border: 'border-cyan-500/30',
        iconBg: 'bg-cyan-500/20',
        iconColor: 'text-cyan-400',
        titleColor: 'text-cyan-300',
        subtextColor: 'text-cyan-200'
    },
    green: {
        bg: 'from-green-500/20 to-green-600/20',
        border: 'border-green-500/30',
        iconBg: 'bg-green-500/20',
        iconColor: 'text-green-400',
        titleColor: 'text-green-300',
        subtextColor: 'text-green-200'
    },
    red: {
        bg: 'from-red-500/20 to-red-600/20',
        border: 'border-red-500/30',
        iconBg: 'bg-red-500/20',
        iconColor: 'text-red-400',
        titleColor: 'text-red-300',
        subtextColor: 'text-red-200'
    },
    amber: {
        bg: 'from-amber-500/20 to-amber-600/20',
        border: 'border-amber-500/30',
        iconBg: 'bg-amber-500/20',
        iconColor: 'text-amber-400',
        titleColor: 'text-amber-300',
        subtextColor: 'text-amber-200'
    }
};

const InfoCard = ({ title, value, subtext, icon: Icon, color = 'blue' }) => {
    // Fallback to blue if color not found
    const styles = colorStyles[color] || colorStyles.blue;

    return (
        <div className={`bg-linear-to-br ${styles.bg} backdrop-blur-sm border ${styles.border} rounded-2xl p-6 hover:scale-105 transition-transform duration-300 shadow-lg`}>
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 ${styles.iconBg} rounded-xl`}>
                    {Icon && <Icon className={`w-6 h-6 ${styles.iconColor}`} />}
                </div>
                <span className={`text-xs ${styles.titleColor} font-semibold uppercase tracking-wider`}>{title}</span>
            </div>
            <div className="text-4xl font-bold text-white mb-1 drop-shadow-md">{value}</div>
            <p className={`text-sm ${styles.subtextColor}`}>{subtext}</p>
        </div>
    );
};

export default InfoCard;
