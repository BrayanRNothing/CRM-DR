import React from 'react';
import { Link } from 'react-router-dom';

const secciones = [
  {
    titulo: '1. Aceptacion de los terminos',
    contenido: [
      'Al acceder y utilizar esta plataforma CRM, el usuario declara haber leido, entendido y aceptado estos terminos y condiciones.',
      'Si no estas de acuerdo con alguna clausula, debes abstenerte de usar el sistema y notificar al administrador de tu organizacion.'
    ]
  },
  {
    titulo: '2. Identificacion del responsable',
    contenido: [
      'Razon social: CRM DR Soluciones Comerciales.',
      'Unidad responsable: Area de Soporte y Cumplimiento.',
      'Este sitio tiene como finalidad la administracion de prospectos, clientes, actividades comerciales y reportes operativos internos.'
    ]
  },
  {
    titulo: '3. Cuenta, acceso y seguridad',
    contenido: [
      'Cada usuario es responsable de su cuenta, contrasena y de toda accion realizada con sus credenciales.',
      'No se permite compartir usuarios, suplantar identidad, deshabilitar controles de seguridad o acceder a informacion sin autorizacion.',
      'Ante sospecha de uso no autorizado, debes reportarlo de forma inmediata por los canales de contacto oficiales.'
    ]
  },
  {
    titulo: '4. Uso permitido y prohibiciones',
    contenido: [
      'El sistema solo puede usarse para fines comerciales legitimos y tareas autorizadas por la empresa.',
      'Queda prohibido: cargar malware, extraer datos masivamente sin autorizacion, alterar registros, y utilizar informacion para fines distintos a la operacion comercial.'
    ]
  },
  {
    titulo: '5. Tratamiento de datos y privacidad',
    contenido: [
      'Los datos personales y comerciales capturados en la plataforma se tratan conforme a principios de licitud, finalidad, proporcionalidad y seguridad.',
      'El usuario garantiza que la informacion registrada fue obtenida de forma legitima y con base legal aplicable.',
      'Se aplican medidas tecnicas y organizativas razonables para proteger la confidencialidad, integridad y disponibilidad de la informacion.'
    ]
  },
  {
    titulo: '6. Disponibilidad, mantenimiento y respaldos',
    contenido: [
      'Se realizan esfuerzos razonables para mantener la continuidad del servicio, sin garantizar disponibilidad ininterrumpida al 100%.',
      'Puede haber ventanas de mantenimiento, actualizaciones, caidas de terceros o eventos de fuerza mayor que afecten temporalmente la operacion.',
      'La empresa puede ejecutar politicas de respaldo y recuperacion conforme a sus capacidades operativas.'
    ]
  },
  {
    titulo: '7. Propiedad intelectual y uso del contenido',
    contenido: [
      'El software, interfaces, logos y elementos visuales asociados al sistema se encuentran protegidos por derechos de propiedad intelectual.',
      'No esta permitido copiar, distribuir, modificar o explotar el contenido del sistema sin autorizacion expresa.'
    ]
  },
  {
    titulo: '8. Limitacion de responsabilidad',
    contenido: [
      'En la maxima medida permitida por ley, la empresa no sera responsable por danos indirectos, incidentales o lucro cesante derivados del uso del sistema.',
      'La responsabilidad total, cuando proceda, estara sujeta a los limites establecidos por la normativa aplicable y acuerdos contractuales vigentes.'
    ]
  },
  {
    titulo: '9. Vigencia y modificaciones',
    contenido: [
      'Estos terminos pueden actualizarse para reflejar cambios operativos, legales o de seguridad.',
      'Las nuevas versiones entran en vigor desde su publicacion en esta pagina y sustituyen versiones anteriores.'
    ]
  },
  {
    titulo: '10. Legislacion aplicable y jurisdiccion',
    contenido: [
      'Estos terminos se interpretan conforme a la legislacion aplicable en la jurisdiccion de operacion de la empresa.',
      'Cualquier controversia sera atendida ante las autoridades competentes conforme a la normativa vigente.'
    ]
  }
];

const metodosContacto = [
  {
    titulo: 'Correo de soporte',
    valor: 'soporte@crm-dr.com',
    href: 'mailto:soporte@crm-dr.com',
    detalle: 'Atencion de incidencias tecnicas, acceso, bloqueos y consultas de uso.'
  },
  {
    titulo: 'Telefono',
    valor: '+1 809 555 0147',
    href: 'tel:+18095550147',
    detalle: 'Lunes a viernes, 8:00 a.m. a 6:00 p.m. (GMT-4).'
  },
  {
    titulo: 'WhatsApp de soporte',
    valor: '+1 809 555 0199',
    href: 'https://wa.me/18095550199',
    detalle: 'Soporte rapido para incidencias operativas y seguimiento de tickets.'
  },
  {
    titulo: 'Direccion administrativa',
    valor: 'Av. Empresarial 102, Santo Domingo, Republica Dominicana',
    href: null,
    detalle: 'Recepcion de notificaciones formales en horario administrativo.'
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

          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:p-5">
            <p className="text-sm sm:text-base text-emerald-900 leading-relaxed">
              Compromiso de confianza: esta plataforma aplica controles de acceso por rol, registro de actividades y buenas practicas de seguridad para proteger la informacion comercial.
            </p>
          </div>

          <div className="mt-8 space-y-6">
            {secciones.map((seccion) => (
              <section key={seccion.titulo} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <h2 className="text-lg font-bold text-slate-800">{seccion.titulo}</h2>
                <div className="mt-2 space-y-2">
                  {seccion.contenido.map((parrafo) => (
                    <p key={parrafo} className="text-slate-600 leading-relaxed">
                      {parrafo}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800">11. Metodos de contacto oficiales</h2>
            <p className="mt-2 text-slate-600 leading-relaxed">
              Para cualquier duda legal, operativa o de privacidad, utiliza exclusivamente los siguientes canales verificados.
            </p>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {metodosContacto.map((metodo) => (
                <article key={metodo.titulo} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{metodo.titulo}</p>
                  {metodo.href ? (
                    <a
                      href={metodo.href}
                      target={metodo.href.startsWith('http') ? '_blank' : undefined}
                      rel={metodo.href.startsWith('http') ? 'noreferrer' : undefined}
                      className="mt-1 inline-block text-base font-bold text-(--theme-700) hover:text-(--theme-800) underline underline-offset-4"
                    >
                      {metodo.valor}
                    </a>
                  ) : (
                    <p className="mt-1 text-base font-bold text-slate-800">{metodo.valor}</p>
                  )}
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">{metodo.detalle}</p>
                </article>
              ))}
            </div>
          </section>

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
