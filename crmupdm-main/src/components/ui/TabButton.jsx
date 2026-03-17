import React from 'react';

const TabButton = ({ active, onClick, children, count }) => (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-bold flex gap-2 items-center transition ${active ? 'bg-white text-blue-600 shadow' : 'text-gray-500 hover:bg-gray-200'}`}>
        {children}
        {count > 0 && <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{count}</span>}
    </button>
);

export default TabButton;
