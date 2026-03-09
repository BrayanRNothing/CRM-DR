import { Link } from 'react-router-dom';
import AnimatedGridBackground from '../components/ui/AnimatedGridBackground';

function NotFound() {

  return (
    <AnimatedGridBackground>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-2xl">
          <div className="mb-8">
            <h1 className="text-9xl font-bold text-white mb-4 drop-shadow-2xl">404</h1>
            <div className="text-6xl mb-6"></div>
          </div>

          <h2 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
            Página no encontrada
          </h2>

          <p className="text-gray-200 text-lg mb-8 max-w-md mx-auto drop-shadow">
            Lo sentimos, la página que buscas no existe o ha sido movida.
          </p>

          <Link
            to="/"
            className="inline-block bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-blue-600 transition transform hover:scale-105 shadow-lg"
          >
            🏠 Volver al Inicio
          </Link>
        </div>
      </div>
    </AnimatedGridBackground>
  );
}

export default NotFound;
