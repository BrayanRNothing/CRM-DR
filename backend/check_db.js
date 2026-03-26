require('dotenv').config();
const { db } = require('./config/database');
const bcrypt = require('bcryptjs');

async function main() {
  try {
    await new Promise(r => setTimeout(r, 3000));
    
    // Simulate the EXACT query the login route uses
    const query = 'SELECT * FROM usuarios WHERE LOWER(usuario) = LOWER(?) OR LOWER(email) = LOWER(?)';
    const row = await db.prepare(query).get('vendedor', 'vendedor');
    
    console.log('=== ROW RETURNED BY DB WRAPPER ===');
    console.log('Row keys:', Object.keys(row));
    
    // Check every key's hex encoding
    for (const k of Object.keys(row)) {
      const hex = Buffer.from(k, 'utf8').toString('hex');
      console.log(`  key: "${k}" hex: ${hex}`);
    }
    
    // Test destructuring like the login route does
    const { contraseña } = row;
    console.log('\nDestructured contraseña exists:', !!contraseña);
    
    // Also check direct access
    console.log('row["contraseña"] exists:', !!row['contraseña']);
    console.log('row["contrase\\u00f1a"] exists:', !!row['contrase\u00f1a']);
    
    // Now simulate what happens with req.body
    // When Express parses JSON with ñ in key names
    const fakeReqBody = JSON.parse(JSON.stringify({ usuario: 'vendedor', 'contraseña': '123456' }));
    console.log('\nfakeReqBody keys:', Object.keys(fakeReqBody));
    const bodyPwd = fakeReqBody['contraseña'] || fakeReqBody['contrase\u00f1a'];
    console.log('Body password exists:', !!bodyPwd);
    
    // Final test: full bcrypt compare
    if (contraseña && bodyPwd) {
      const match = await bcrypt.compare(bodyPwd, contraseña);
      console.log('\nFULL LOGIN SIMULATION RESULT:', match ? 'SUCCESS' : 'FAILURE');
    } else {
      console.log('\nCANNOT COMPARE: contraseña from row:', !!contraseña, '| password from body:', !!bodyPwd);
    }
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    process.exit(0);
  }
}

main();
