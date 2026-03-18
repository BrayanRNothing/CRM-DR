#!/usr/bin/env node

/**
 * Script de verificación - Comprueba que las variables de entorno están configuradas correctamente
 * Uso: node backend/check-env.js
 */

require('dotenv').config();

console.log('\n🔍 VERIFICACIÓN DE CONFIGURACIÓN\n');
console.log('─'.repeat(50));

const checks = {
    'NODE_ENV': process.env.NODE_ENV,
    'PORT': process.env.PORT || '4000',
    'JWT_SECRET': process.env.JWT_SECRET ? '✅ Configurado' : '❌ No configurado',
    'DATABASE_URL': process.env.DATABASE_URL ? '✅ Configurado (PostgreSQL)' : '❌ No configurado (OBLIGATORIO)',
    'GOOGLE_CLIENT_ID': process.env.GOOGLE_CLIENT_ID ? '✅ Configurado' : '❌ No configurado',
    'GOOGLE_CLIENT_SECRET': process.env.GOOGLE_CLIENT_SECRET ? '✅ Configurado' : '❌ No configurado',
};

Object.entries(checks).forEach(([key, value]) => {
    const status = typeof value === 'string' && value.includes('✅') ? '✅' : 
                   typeof value === 'string' && value.includes('❌') ? '❌' : '📝';
    console.log(`${status} ${key.padEnd(20)} : ${value}`);
});

console.log('─'.repeat(50));

const isProd = process.env.NODE_ENV === 'production';
console.log(`\n🎯 Modo detectado: ${isProd ? 'PRODUCCIÓN (PostgreSQL)' : 'DESARROLLO (PostgreSQL)'}\n`);

if (process.env.DATABASE_URL) {
    console.log('✅ Configuración correcta: PostgreSQL habilitado\n');
} else {
    console.log('❌ Falta DATABASE_URL. El backend no iniciará sin PostgreSQL.\n');
}

console.log('💡 Para ejecutar en desarrollo:');
console.log('   Windows (CMD):  set DATABASE_URL=postgresql://... && npm run dev:windows');
console.log('   Windows (PS):   $env:DATABASE_URL=\'postgresql://...\'; npm run dev:windows');
console.log('   Linux/Mac:      DATABASE_URL=postgresql://... npm run dev\n');
