import React from 'react';

const InfoItem = ({ label, value, icon }) => (
    <div className="flex items-start gap-2 p-3 bg-gray-50/50 rounded-lg hover:bg-gray-50 transition border border-transparent hover:border-gray-100">
        <div className="text-lg bg-white p-1.5 rounded-md shadow-sm border border-gray-100 shrink-0">{icon}</div>
        <div className="min-w-0 flex-1">
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tight leading-none mb-0.5">{label}</div>
            <div className="font-bold text-gray-800 text-xs break-words">{value || "No registrado"}</div>
        </div>
    </div>
);

export default InfoItem;
