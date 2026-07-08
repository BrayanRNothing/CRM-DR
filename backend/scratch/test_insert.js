require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("Testing insert...");
    
    // Test the same insert as register-paid, but rollback immediately
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const query = `
        INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono, activo,
          stripe_customer_id, stripe_subscription_id, plan, plan_activo, plan_vencimiento, max_usuarios)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8, $9, TRUE, $10, $11)
        RETURNING id
      `;
      
      const values = [
        'test_user_' + Date.now(),
        'fake_hash',
        'vendedor',
        'Test User',
        'test@test.com',
        '123456',
        'cus_123',
        'sub_123',
        'mensual',
        new Date().toISOString(),
        2
      ];
      
      const res = await client.query(query, values);
      console.log("Insert successful! ID:", res.rows[0].id);
      await client.query('ROLLBACK');
      console.log("Rollback done.");
    } catch (e) {
      console.error("Error during insert:", e.message);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
    
  } catch (err) {
    console.error("Connection error:", err);
  } finally {
    await pool.end();
  }
}

run();
