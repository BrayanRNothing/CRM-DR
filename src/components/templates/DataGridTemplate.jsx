import React from 'react';

const DataGridTemplate = ({ children }) => {
    return (
        <div className="w-full h-full overflow-y-auto px-1 py-1 scrollbar-hide">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 auto-rows-max">
                {children}
            </div>
        </div>
    );
};

export default DataGridTemplate;
