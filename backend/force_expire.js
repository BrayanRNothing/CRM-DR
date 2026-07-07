require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL,
});

async function expirarGracia() {
    // Busca al usuario de prueba por un email o usuario aproximado. O expira a todos los inactivos.
    try {
        console.log("⏳ Conectando a la base de datos...");
        
        // Vamos a restarle 4 días a la fecha de vencimiento de las cuentas que estén en periodo de gracia
        // (plan_activo = false). Así su periodo de 3 días de gracia quedará obsoleto.
        const res = await pool.query(`
            UPDATE usuarios 
            SET plan_vencimiento = NOW() - INTERVAL '4 days'
            WHERE plan_activo = false
            RETURNING id, usuario, email, plan_vencimiento;
        `);
        
        if (res.rowCount > 0) {
            console.log("✅ Se forzó la expiración del periodo de gracia para los siguientes usuarios:");
            console.table(res.rows);
            console.log("\n🚀 Prueba recargar el CRM con alguno de estos usuarios. Debería expulsarte.");
        } else {
            console.log("⚠️ No se encontraron usuarios en periodo de gracia (plan_activo = false) para expirar.");
        }
    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await pool.end();
    }
}

expirarGracia();
