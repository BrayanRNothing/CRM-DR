import React from 'react';
import { Link } from 'react-router-dom';

const secciones = [
  {
    titulo: '1. Alcance de esta política',
    contenido: [
      'Esta Política de Privacidad describe cómo CRM DR Soluciones Comerciales recopila, usa, almacena y protege los datos personales y comerciales procesados en esta plataforma.',
      'Aplica a usuarios internos, prospectos, clientes y contactos cuyos datos se registran en el sistema.'
    ]
  },
  {
    titulo: '2. Responsable del tratamiento',
    contenido: [
      'Responsable: CRM DR Soluciones Comerciales.',
      'Área responsable: Soporte y Cumplimiento.',
      'Canal principal de privacidad: julio@updm.mx y brayan@updm.mx.'
    ]
  },
  {
    titulo: '3. Datos que recopilamos',
    contenido: [
      'Datos de cuenta: nombre de usuario, rol, correo de acceso y registros de autenticación.',
      'Datos de gestión comercial: nombre, teléfono, correo, empresa, notas, historial de actividades, tareas y estados del embudo.',
      'Datos técnicos: fecha y hora de acceso, IP aproximada, eventos de uso y bitácoras operativas para seguridad y auditoría.'
    ]
  },
  {
    titulo: '4. Uso de Google Calendar y Datos de Usuario (Google API)',
    contenido: [
      'Si el usuario autoriza la integración con Google Calendar, la plataforma accede solo a los permisos necesarios para leer o crear eventos vinculados a actividades comerciales.',
      'El uso y la transferencia a cualquier otra aplicación de la información recibida de las APIs de Google por parte de este CRM se adherirán a la Política de Datos de Usuario de los Servicios de la API de Google (Google API Services User Data Policy), incluidos los requisitos de Uso Limitado.',
      'No utilizamos datos de Google Calendar para publicidad, perfilado comercial externo ni venta de información a terceros.',
      'El usuario puede revocar en cualquier momento los permisos desde su cuenta de Google en la sección de seguridad y aplicaciones conectadas.'
    ]
  },
  {
    titulo: '5. Finalidades del tratamiento',
    contenido: [
      'Administrar prospectos, clientes, calendario de seguimiento, tareas y reportes de desempeño comercial.',
      'Mantener la seguridad de la plataforma, prevenir fraude y detectar accesos no autorizados.',
      'Cumplir obligaciones legales, contractuales y de soporte técnico.'
    ]
  },
  {
    titulo: '6. Base legal',
    contenido: [
      'Tratamos datos con base en consentimiento, ejecución de una relación contractual y/o interés legítimo de operación y seguridad, según corresponda.',
      'Cuando el consentimiento sea requerido, podrá retirarse sin efectos retroactivos sobre tratamientos ya realizados conforme a derecho.'
    ]
  },
  {
    titulo: '7. Conservación de datos',
    contenido: [
      'Los datos se conservan durante el tiempo necesario para cumplir las finalidades descritas y los plazos legales aplicables.',
      'Al concluir la relación o al vencer el plazo de retención, los datos pueden anonimizarse o eliminarse de forma segura, salvo obligación legal de conservarlos.'
    ]
  },
  {
    titulo: '8. Compartición y transferencias',
    contenido: [
      'No vendemos datos personales.',
      'Podemos compartir información con proveedores tecnológicos estrictamente necesarios para operar el servicio (hosting, seguridad, correo transaccional), bajo medidas de confidencialidad y seguridad.',
      'Cualquier transferencia internacional se realiza conforme a mecanismos legales aplicables.'
    ]
  },
  {
    titulo: '9. Seguridad de la información',
    contenido: [
      'Implementamos controles razonables de seguridad: autenticación, segmentación por roles, bitácoras, respaldos y medidas de prevención de acceso no autorizado.',
      'Aún con estas medidas, ningún sistema es absolutamente infalible. Por ello se mantiene monitoreo y mejora continua de controles.'
    ]
  },
  {
    titulo: '10. Derechos del titular',
    contenido: [
      'El titular de datos puede solicitar acceso, rectificación, actualización, oposición o eliminación de sus datos, cuando legalmente proceda.',
      'Para ejercer derechos, se debe enviar solicitud al canal de privacidad con datos de identificación y detalle de la petición.'
    ]
  },
  {
    titulo: '11. Cookies y tecnologías similares',
    contenido: [
      'La plataforma puede usar almacenamiento local y cookies técnicas para mantener sesión, preferencias y funcionamiento básico.',
      'No se emplean cookies de publicidad de terceros para perfilado comercial externo dentro de este CRM.'
    ]
  },
  {
    titulo: '12. Cambios a esta política',
    contenido: [
      'Esta política puede actualizarse por cambios legales, técnicos o de negocio.',
      'La versión vigente será la publicada en esta página, con su fecha de última actualización.'
    ]
  }
];

const contactos = [
  {
    titulo: 'Correo de privacidad',
    valor: 'julio@updm.mx',
    href: 'mailto:julio@updm.mx',
    detalle: 'Solicitudes ARCO, dudas sobre datos personales y revocación de consentimiento.'
  },
  {
    titulo: 'Correo de soporte',
    valor: 'brayan@updm.mx',
    href: 'mailto:brayan@updm.mx',
    detalle: 'Incidencias técnicas relacionadas con acceso o funcionamiento del CRM.'
  },
  {
    titulo: 'Teléfono',
    valor: '8136458366',
    href: 'tel:8136458366',
    detalle: 'Lunes a viernes, 8:00 a.m. a 6:00 p.m. (GMT-4).'
  }
];

const PoliticaPrivacidad = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto w-full">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 sm:p-10">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Política de Privacidad
          </h1>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Última actualización: 23 de marzo de 2026.
          </p>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
            <p className="text-sm sm:text-base text-blue-900 leading-relaxed">
              Transparencia: los datos de Google Calendar solo se usan para funciones del CRM autorizadas por el usuario y nunca para publicidad ni venta de información.
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
