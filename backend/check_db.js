const { db } = require('./config/database');
const rows = db.prepare('SELECT id, usuario, email, plan, plan_activo, stripe_customer_id, stripe_subscription_id FROM usuarios ORDER BY id DESC LIMIT 5').all();
console.log(JSON.stringify(rows, null, 2));
db.close();
