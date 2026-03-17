/**
 * EJEMPLO DE INTEGRACIÓN COMPLETA
 * Este archivo muestra cómo integrar el sistema de documentos
 * en CrearOrdenTrabajo.jsx con cambios mínimos
 */

// ============================================
// PASO 1: Agregar imports al inicio del archivo
// ============================================

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';  // ← Agregar useLocation
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import { guardarPDFEnBackend } from '../../utils/pdfHelper';  // ← NUEVO

// ============================================
// PASO 2: En el componente, verificar si viene de conversión
// ============================================

function CrearOrdenTrabajo() {
    const navigate = useNavigate();
    const location = useLocation();  // ← NUEVO

    // Verificar si viene de una cotización
    const { desdeCotizacion, cotizacion } = location.state || {};  // ← NUEVO

    const [formData, setFormData] = useState({
        fecha: new Date().toISOString().split('T')[0],
        cliente: '',
        // ... otros campos
    });

    // ============================================
    // PASO 3: Pre-llenar formulario si viene de cotización
    // ============================================

    React.useEffect(() => {
        if (desdeCotizacion && cotizacion) {
            setFormData(prev => ({
                ...prev,
                cliente: cotizacion.cliente?.nombre || '',
                direccion: cotizacion.cliente?.direccion || '',
                // Convertir productos de cotización a items de orden
                // ... mapear otros campos
            }));

            // Si la cotización tiene productos, pre-llenar items
            if (cotizacion.productos && cotizacion.productos.length > 0) {
                const itemsDesdeC cotizacion = cotizacion.productos.map((p, index) => ({
                    id: index + 1,
                    partida: index + 1,
                    cantidad: p.cantidad || 1,
                    clave: p.clave || '',
                    descripcion: p.descripcion || '',
                    medida: p.medida || '',
                    unidad: p.unidad || ''
                }));
                setItems(itemsDesdeC cotizacion);
            }

            toast.success('Datos cargados desde cotización #' + cotizacion.numero);
        }
    }, [desdeCotizacion, cotizacion]);

    // ============================================
    // PASO 4: Modificar la función generarPDF
    // ============================================

    const generarPDF = async () => {  // ← Cambiar a async
        // Validación básica
        if (!formData.cliente.trim()) {
            toast.error('El nombre del cliente es requerido');
            return;
        }

        const loadingToast = toast.loading('Generando PDF...');

        try {
            const doc = new jsPDF();
            // ... TODO el código existente de generación de PDF ...

            // Generate incremental order number
            let currentOrderNumber = parseInt(localStorage.getItem('lastOrderNumber') || '3871', 10);
            currentOrderNumber += 1;
            localStorage.setItem('lastOrderNumber', currentOrderNumber.toString());

            // ... generar contenido del PDF ...

            // Guardar PDF localmente (como antes)
            const fileName = `Orden_Trabajo_${formData.cliente.replace(/\\s+/g, '_')}_${formData.fecha}.pdf`;
            doc.save(fileName);

            // ============================================
            // NUEVO: Guardar en backend también
            // ============================================

            try {
                // Preparar datos del documento
                const datosDocumento = {
                    numero: `OT-${currentOrderNumber}`,
                    fecha: formData.fecha,
                    cliente: {
                        nombre: formData.cliente,
                        direccion: formData.direccion,
                        contacto: formData.contacto
                    },
                    productos: items.map(item => ({
                        partida: item.partida,
                        cantidad: item.cantidad,
                        clave: item.clave,
                        descripcion: item.descripcion,
                        medida: item.medida,
                        unidad: item.unidad
                    })),
                    tecnicoAsignado: formData.vendedor,
                    direccionEntrega: formData.direccion,
                    observaciones: formData.observaciones,
                    estado: formData.estado,
                    creadoPor: 'Admin',
                    // Si viene de cotización, guardar referencia
                    cotizacionRef: desdeCotizacion ? cotizacion.numero : null,
                    desdeCotizacion: desdeCotizacion || false,
                    cotizacionNumero: desdeCotizacion ? cotizacion.numero : null
                };

                // OPCIÓN A: Si tienes un servicioId disponible
                // const servicioId = formData.servicioId;

                // OPCIÓN B: Crear un servicio nuevo
                const crearServicioResponse = await fetch('http://localhost:4000/api/servicios', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        titulo: `Orden de Trabajo - ${formData.cliente}`,
                        cliente: formData.cliente,
                        tipo: 'orden_trabajo',
                        direccion: formData.direccion,
                        telefono: formData.contacto,
                        estado: 'pendiente',
                        fecha: formData.fecha
                    })
                });

                const servicioData = await crearServicioResponse.json();
                const servicioId = servicioData.id;

                // Guardar PDF en backend
                await guardarPDFEnBackend(
                    doc,
                    servicioId,
                    'orden-trabajo',
                    datosDocumento,
                    fileName
                );

                toast.success('PDF generado y guardado en historial', { id: loadingToast });
            } catch (backendError) {
                console.error('Error guardando en backend:', backendError);
                // No mostrar error al usuario, el PDF local ya se descargó
                toast.success('PDF generado exitosamente', { id: loadingToast });
            }

        } catch (error) {
            console.error('Error generando PDF:', error);
            toast.error('Error al generar el PDF', { id: loadingToast });
        }
    };

    // ... resto del componente sin cambios ...

    return (
        <div className="max-w-7xl mx-auto">
            {/* Mostrar banner si viene de cotización */}
            {desdeCotizacion && cotizacion && (
                <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
                    <p className="text-blue-800 font-semibold">
                        📋 Creando orden desde Cotización #{cotizacion.numero}
                    </p>
                    <p className="text-blue-600 text-sm">
                        Los datos han sido pre-llenados. Puedes modificarlos antes de generar el PDF.
                    </p>
                </div>
            )}

            {/* ... resto del JSX sin cambios ... */}
        </div>
    );
}

export default CrearOrdenTrabajo;

// ============================================
// RESUMEN DE CAMBIOS
// ============================================
/*
1. ✅ Importar useLocation y guardarPDFEnBackend
2. ✅ Obtener datos de navegación (desdeCotizacion, cotizacion)
3. ✅ useEffect para pre-llenar formulario
4. ✅ Cambiar generarPDF a async
5. ✅ Agregar bloque try/catch para guardar en backend
6. ✅ Crear servicio o usar existente
7. ✅ Llamar guardarPDFEnBackend
8. ✅ Mostrar banner si viene de conversión

TOTAL: ~50 líneas de código agregadas
ARCHIVOS MODIFICADOS: 1 (CrearOrdenTrabajo.jsx)
TIEMPO ESTIMADO: 20 minutos
*/
