const https = require('https');
const API = 'https://crmupdm-production.up.railway.app';
const request = (method, path, body, token) => new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const url = new URL(API + path);
    const opts = { hostname: url.hostname, path: url.pathname, method, headers: {'Content-Type':'application/json','x-auth-token':token||''} };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const req = https.request(opts, res => { let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{resolve({status:res.statusCode,data:JSON.parse(d)})}catch{resolve({status:res.statusCode,data:d})}}); });
    req.on('error',reject);if(data)req.write(data);req.end();
});
async function main() {
    const login = await request('POST', '/api/auth/login', {usuario:'prospector',contrase\u00f1a:'prospector123'});
    if(login.status!==200){console.error('Login failed:',login.data);return;}
    const token = login.data.token;
    console.log('Logged in OK');
    const dash = await request('GET', '/api/prospector/dashboard', null, token);
    console.log('Dashboard status:', dash.status);
    if(dash.status===500){console.error('Error:', dash.data);}
    else{console.log('periodos.dia:', JSON.stringify(dash.data?.periodos?.dia));console.log('periodos.total:', JSON.stringify(dash.data?.periodos?.total));}
}
main().catch(console.error);
