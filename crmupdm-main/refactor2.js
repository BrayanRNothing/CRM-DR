const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'src/pages/prospector/ProspectorSeguimiento.jsx');
let content = fs.readFileSync(srcPath, 'utf8');

// 1. Add useLocation 
content = content.replace(
    "import { useNavigate } from 'react-router-dom';",
    "import { useNavigate, useLocation } from 'react-router-dom';"
);

// 2. Add dynamic role vars inside component
content = content.replace(
    "const navigate = useNavigate();",
    "const navigate = useNavigate();\n    const location = useLocation();\n    const rolePath = location.pathname.includes('/closer') ? 'closer' : 'prospector';"
);

// 3. Replace text "/api/prospector/" with "/api/${rolePath}/"
content = content.replace(/\/api\/prospector\//g, "/api/$${rolePath}/");

// 4. Update the heading Title
content = content.replace(
    '<h1 className="text-2xl font-bold text-gray-900">Seguimiento de Prospectos</h1>',
    '<h1 className="text-2xl font-bold text-gray-900">Prospectos y Seguimiento</h1>'
);

fs.writeFileSync(srcPath, content, 'utf8');
console.log("Routing updates completed successfully.");
