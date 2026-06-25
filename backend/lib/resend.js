const { Resend } = require('resend');

const apiKey = process.env.RESEND_API_KEY || process.env.RESENDAPIKEY || 're_dummy_key_to_prevent_startup_crash';
const resend = new Resend(apiKey);

module.exports = { resend };
