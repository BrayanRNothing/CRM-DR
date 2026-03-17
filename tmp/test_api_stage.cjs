const https = require('https');

const API = 'https://crmupdm-production.up.railway.app';

const request = (method, path, body, token) => new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const url = new URL(API + path);
    const opts = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token || ''
        }
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const req = https.request(opts, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
            try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
            catch { resolve({ status: res.statusCode, data: d }); }
        });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
});

async function main() {
    // 1. Login
    console.log('1. Logging in as prospector...');
    const login = await request('POST', '/api/auth/login', { usuario: 'prospector', contraseña: 'prospector123' });
    if (login.status !== 200) { console.error('❌ Login failed:', login.data); return; }
    const token = login.data.token;
    console.log('✅ Logged in, token:', token.slice(0, 30) + '...');

    // 2. Get prospectos
    console.log('\n2. Fetching prospectos...');
    const prospectos = await request('GET', '/api/prospector/prospectos', null, token);
    console.log(`Status: ${prospectos.status}, Count: ${Array.isArray(prospectos.data) ? prospectos.data.length : 'ERROR'}`);
    if (!Array.isArray(prospectos.data) || prospectos.data.length === 0) {
        console.error('❌ No prospectos returned or error:', prospectos.data);
        return;
    }
    const p = prospectos.data[0];
    console.log(`First prospect: ${p.nombres} ${p.apellidoPaterno}, etapa=${p.etapaEmbudo}, proximaLlamada=${p.proximaLlamada}`);

    // 3. Register activity (successfull call)
    console.log('\n3. Registering successful call...');
    const actividad = await request('POST', '/api/prospector/registrar-actividad', {
        clienteId: p.id || p._id,
        tipo: 'llamada',
        resultado: 'exitoso',
        notas: 'Test desde script',
        etapaEmbudo: 'en_contacto'
    }, token);
    console.log(`Status: ${actividad.status}, Response:`, JSON.stringify(actividad.data).slice(0, 200));

    // 4. Update proximaLlamada
    const pid = p.id || p._id;
    const mañana = new Date(); mañana.setDate(mañana.getDate() + 1);
    console.log('\n4. Updating proximaLlamada...');
    const upd = await request('PUT', `/api/prospector/prospectos/${pid}`, {
        proximaLlamada: mañana.toISOString()
    }, token);
    console.log(`Status: ${upd.status}, Response:`, JSON.stringify(upd.data).slice(0, 200));

    // 5. Re-fetch and verify
    console.log('\n5. Re-fetching prospectos to verify...');
    const resultado = await request('GET', '/api/prospector/prospectos', null, token);
    if (Array.isArray(resultado.data)) {
        const updated = resultado.data.find(x => (x.id || x._id) == pid);
        if (updated) {
            console.log(`✅ Updated: etapa=${updated.etapaEmbudo}, proximaLlamada=${updated.proximaLlamada}`);
        } else {
            console.error('❌ Prospecto not found in re-fetch');
        }
    }
}

main().catch(console.error);
