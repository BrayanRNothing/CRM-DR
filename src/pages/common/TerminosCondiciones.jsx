import React from 'react';
import { Link } from 'react-router-dom';

const secciones = [
  {
    titulo: '1. Aceptacion de uso',
    contenido:
      'Al usar esta plataforma CRM, aceptas cumplir estos terminos y condiciones, asi como la normativa aplicable en materia de proteccion de datos y uso de sistemas de informacion.'
  },
  {
    titulo: '2. Cuenta y seguridad',
    contenido:
      'Eres responsable de mantener la confidencialidad de tus credenciales. No compartas tu cuenta con terceros. Debes notificar de inmediato cualquier acceso no autorizado.'
  },
  {
    titulo: '3. Uso permitido',
    contenido:
      'La plataforma debe utilizarse unicamente para actividades comerciales legitimas relacionadas con la gestion de prospectos, clientes y ventas. Queda prohibido el uso fraudulento o malicioso.'
  },
  {
    titulo: '4. Datos y privacidad',
    contenido:
      'La informacion registrada en el sistema debe ser veraz y obtenida con consentimiento cuando aplique. Cada usuario es responsable del tratamiento correcto de los datos que captura.'
  },
  {
    titulo: '5. Disponibilidad del servicio',
    contenido:
      'Se realizan esfuerzos razonables para mantener la disponibilidad del sistema. Sin embargo, pueden existir interrupciones por mantenimiento, actualizaciones o eventos no previstos.'
  },
  {
    titulo: '6. Modificaciones',
    contenido:
      'Estos terminos pueden actualizarse periodicamente. Las modificaciones entran en vigor una vez publicadas en esta pagina.'
  },
  {
    titulo: '7. Contacto',
    contenido:
      'Si tienes dudas sobre estos terminos y condiciones, contacta al administrador del sistema o al equipo de soporte de tu organizacion.'
  }
];

const TerminosCondiciones = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 sm:p-10">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Terminos y Condiciones
          </h1>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Ultima actualizacion: 23 de marzo de 2026.
          </p>

          <div className="mt-8 space-y-6">
            {secciones.map((seccion) => (
              <section key={seccion.titulo} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <h2 className="text-lg font-bold text-slate-800">{seccion.titulo}</h2>
                <p className="mt-2 text-slate-600 leading-relaxed">{seccion.contenido}</p>
              </section>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-(--theme-600) text-white font-semibold hover:bg-(--theme-700) transition-colors"
            >
              Volver al login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerminosCondiciones;
