const { Pool } = require('pg');

async function main() {
    console.log('Connecting...');
    const pool = new Pool({
        connectionString: 'postgresql://postgres:zOaXqAmsJkYDKAHTRAnNIdgTigLDEgOR@junction.proxy.rlwy.net:49942/railway',
        
    });

    try {
        const res = await pool.query('SELECT * FROM clientes LIMIT 1');
        console.log('DB Columns returning:', Object.keys(res.rows[0]));
    } catch (e) {
        console.error('Error:', e);
    } finally {
        pool.end();
    }
}
main();
