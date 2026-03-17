import React from 'react';

const InfoMosaic = ({ children }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
            {children}
        </div>
    );
};

export default InfoMosaic;
