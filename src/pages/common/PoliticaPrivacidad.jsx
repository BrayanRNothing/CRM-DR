import React from 'react';
import { Link } from 'react-router-dom';

const secciones = [
  {
    titulo: '1. Alcance de esta politica',
    contenido: [
      'Esta Politica de Privacidad describe como CRM DR Soluciones Comerciales recopila, usa, almacena y protege los datos personales y comerciales procesados en esta plataforma.',
      'Aplica a usuarios internos, prospectos, clientes y contactos cuyos datos se registran en el sistema.'
    ]
  },
  {
    titulo: '2. Responsable del tratamiento',
    contenido: [
      'Responsable: CRM DR Soluciones Comerciales.',
      'Area responsable: Soporte y Cumplimiento.',
      'Canal principal de privacidad: privacidad@crm-dr.com.'
    ]
  },
  {
    titulo: '3. Datos que recopilamos',
    contenido: [
      'Datos de cuenta: nombre de usuario, rol, correo de acceso y registros de autenticacion.',
      'Datos de gestion comercial: nombre, telefono, correo, empresa, notas, historial de actividades, tareas y estados del embudo.',
      'Datos tecnicos: fecha y hora de acceso, IP aproximada, eventos de uso y bitacoras operativas para seguridad y auditoria.'
    ]
  },
  {
    titulo: '4. Uso de Google Calendar',
    contenido: [
      'Si el usuario autoriza la integracion con Google Calendar, la plataforma accede solo a los permisos necesarios para leer o crear eventos vinculados a actividades comerciales.',
      'No utilizamos datos de Google Calendar para publicidad, perfilado comercial externo ni venta de informacion a terceros.',
      'El usuario puede revocar en cualquier momento los permisos desde su cuenta de Google en la seccion de seguridad y aplicaciones conectadas.'
    ]
  },
  {
    titulo: '5. Finalidades del tratamiento',
    contenido: [
      'Administrar prospectos, clientes, calendario de seguimiento, tareas y reportes de desempeno comercial.',
      'Mantener la seguridad de la plataforma, prevenir fraude y detectar accesos no autorizados.',
      'Cumplir obligaciones legales, contractuales y de soporte tecnico.'
    ]
  },
  {
    titulo: '6. Base legal',
    contenido: [
      'Tratamos datos con base en consentimiento, ejecucion de una relacion contractual y/o interes legitimo de operacion y seguridad, segun corresponda.',
      'Cuando el consentimiento sea requerido, podra retirarse sin efectos retroactivos sobre tratamientos ya realizados conforme a derecho.'
    ]
  },
  {
    titulo: '7. Conservacion de datos',
    contenido: [
      'Los datos se conservan durante el tiempo necesario para cumplir las finalidades descritas y los plazos legales aplicables.',
      'Al concluir la relacion o al vencer el plazo de retencion, los datos pueden anonimizarse o eliminarse de forma segura, salvo obligacion legal de conservarlos.'
    ]
  },
  {
    titulo: '8. Comparticion y transferencias',
    contenido: [
      'No vendemos datos personales.',
      'Podemos compartir informacion con proveedores tecnologicos estrictamente necesarios para operar el servicio (hosting, seguridad, correo transaccional), bajo medidas de confidencialidad y seguridad.',
      'Cualquier transferencia internacional se realiza conforme a mecanismos legales aplicables.'
    ]
  },
  {
    titulo: '9. Seguridad de la informacion',
    contenido: [
      'Implementamos controles razonables de seguridad: autenticacion, segmentacion por roles, bitacoras, respaldos y medidas de prevencion de acceso no autorizado.',
      'Aun con estas medidas, ningun sistema es absolutamente infalible. Por ello se mantiene monitoreo y mejora continua de controles.'
    ]
  },
  {
    titulo: '10. Derechos del titular',
    contenido: [
      'El titular de datos puede solicitar acceso, rectificacion, actualizacion, oposicion o eliminacion de sus datos, cuando legalmente proceda.',
      'Para ejercer derechos, se debe enviar solicitud al canal de privacidad con datos de identificacion y detalle de la peticion.'
    ]
  },
  {
    titulo: '11. Cookies y tecnologias similares',
    contenido: [
      'La plataforma puede usar almacenamiento local y cookies tecnicas para mantener sesion, preferencias y funcionamiento basico.',
      'No se emplean cookies de publicidad de terceros para perfilado comercial externo dentro de este CRM.'
    ]
  },
  {
    titulo: '12. Cambios a esta politica',
    contenido: [
      'Esta politica puede actualizarse por cambios legales, tecnicos o de negocio.',
      'La version vigente sera la publicada en esta pagina, con su fecha de ultima actualizacion.'
    ]
  }
];

const contactos = [
  {
    titulo: 'Correo de privacidad',
    valor: 'privacidad@crm-dr.com',
    href: 'mailto:privacidad@crm-dr.com',
    detalle: 'Solicitudes ARCO, dudas sobre datos personales y revocacion de consentimiento.'
  },
  {
    titulo: 'Correo de soporte',
    valor: 'soporte@crm-dr.com',
    href: 'mailto:soporte@crm-dr.com',
    detalle: 'Incidencias tecnicas relacionadas con acceso o funcionamiento del CRM.'
  },
  {
    titulo: 'Telefono',
    valor: '+1 809 555 0147',
    href: 'tel:+18095550147',
    detalle: 'Lunes a viernes, 8:00 a.m. a 6:00 p.m. (GMT-4).'
  }
];

const PoliticaPrivacidad = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 sm:p-10">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Politica de Privacidad
          </h1>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Ultima actualizacion: 23 de marzo de 2026.
          </p>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
            <p className="text-sm sm:text-base text-blue-900 leading-relaxed">
              Transparencia: los datos de Google Calendar solo se usan para funciones del CRM autorizadas por el usuario y nunca para publicidad ni venta de informacion.
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
            <h2 className="text-lg font-bold text-slate-800">13. Contacto de privacidad y soporte</h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {contactos.map((contacto) => (
                <article key={contacto.titulo} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{contacto.titulo}</p>
                  <a
                    href={contacto.href}
                    className="mt-1 inline-block text-base font-bold text-(--theme-700) hover:text-(--theme-800) underline underline-offset-4"
                  >
                    {contacto.valor}
                  </a>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">{contacto.detalle}</p>
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
            <Link
              to="/terminos-y-condiciones"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
            >
              Ver Condiciones del Servicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoliticaPrivacidad;
