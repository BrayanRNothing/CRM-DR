import React from 'react';

const BotonMenu = ({ gradient, icon, titulo, count, badgeText, onClick }) => (
    <button onClick={onClick} className={`bg-gradient-to-br ${gradient} backdrop-blur-md p-4 lg:p-6 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col items-center justify-center w-full h-full transform hover:scale-[1.01] text-white relative overflow-hidden group border border-white/10 min-h-[200px]`}>
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
        <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
            <div className="text-4xl lg:text-7xl mb-2 lg:mb-4 drop-shadow-md transition-transform group-hover:scale-110">{icon}</div>
            <h2 className="text-xl lg:text-4xl font-bold mb-1 tracking-tight leading-tight">{titulo}</h2>
            {(count > 0 || badgeText) && (
                <div className="mt-4 lg:mt-6 bg-black/20 rounded-full px-6 py-2">
                    {badgeText ? (
                        <span className="text-sm lg:text-base font-bold uppercase tracking-wider">{badgeText}</span>
                    ) : (
                        <>
                            <span className="text-xl lg:text-2xl font-bold">{count}</span>
                            <span className="text-xs lg:text-sm ml-2">pendientes</span>
                        </>
                    )}
                </div>
            )}
        </div>
    </button>
);

export default BotonMenu;
