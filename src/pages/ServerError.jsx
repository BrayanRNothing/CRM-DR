import { Link } from 'react-router-dom';

function ServerError() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-orange-900 to-yellow-900 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-white mb-4">500</h1>
          <div className="text-6xl mb-6">⚠️</div>
        </div>
        
        <h2 className="text-3xl font-bold text-white mb-4">
          Error del servidor
        </h2>
        
        <p className="text-gray-200 text-lg mb-8 max-w-md mx-auto">
          Algo salió mal en nuestros servidores. Por favor, intenta nuevamente más tarde.
        </p>
        
        <div className="space-x-4">
          <button 
            onClick={() => window.location.reload()} 
            className="inline-block bg-white text-red-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition transform hover:scale-105 shadow-lg"
          >
            🔄 Reintentar
          </button>
          
          <Link 
            to="/" 
            className="inline-block bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition transform hover:scale-105 shadow-lg"
          >
            🏠 Volver al Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ServerError;
