#!/usr/bin/env node

/**
 * Script de diagnóstico para Railway
 * Prueba conectividad, CORS y autenticación
 */

const API_URL = 'https://crm-updm-production.up.railway.app';

async function testConnectivity() {
    console.log('🧪 PRUEBA 1: Conectividad básica (/health)');
    try {
        const res = await fetch(`${API_URL}/health`);
        const data = await res.json();
        console.log('✅ GET /health:', res.status, data);
    } catch (err) {
        console.log('❌ GET /health:', err.message);
    }
}

async function testCORS() {
    console.log('\n🧪 PRUEBA 2: Verificación de CORS');
    try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'OPTIONS',
            headers: {
                'Origin': 'https://crm-updm.vercel.app',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            }
        });
        
        const allowOrigin = res.headers.get('access-control-allow-origin');
        const allowMethods = res.headers.get('access-control-allow-methods');
        
        console.log('✅ OPTIONS preflight:', res.status);
        console.log('   Access-Control-Allow-Origin:', allowOrigin);
        console.log('   Access-Control-Allow-Methods:', allowMethods);
    } catch (err) {
        console.log('❌ OPTIONS preflight:', err.message);
    }
}

async function testLogin() {
    console.log('\n🧪 PRUEBA 3: Login con credenciales de prueba');
    try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'https://crm-updm.vercel.app'
            },
            body: JSON.stringify({
                usuario: 'prospector',
                contraseña: 'prospector'
            })
        });
        
        const data = await res.json();
        if (res.ok) {
            console.log('✅ Login exitoso:', data.usuario);
            console.log('   Token:', data.token ? '✅ Presente' : '❌ No presente');
        } else {
            console.log('⚠️ Login rechazado:', res.status, data.mensaje);
        }
    } catch (err) {
        console.log('❌ Login error:', err.message);
    }
}

async function runTests() {
    console.log(`\n🔍 Diagnosticando: ${API_URL}\n`);
    console.log('=' . repeat(60));
    
    await testConnectivity();
    await testCORS();
    await testLogin();
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 Si TODAS las pruebas son ✅, tu Railway está listo');
}

runTests();
