const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require('pino');
const { handleMessages } = require('./main.js');
const qrcode = require('qrcode-terminal');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_session');

    const conn = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ["Voice Bot", "Safari", "1.0.0"]
    });

    conn.ev.on('creds.update', saveCreds);

   conn.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    // QR එක පෙන්වීමට මෙය අනිවාර්යයි
    if (qr) {
        console.log("-----------------------------------------");
        console.log("කරුණාකර පහත QR Code එක Scan කරන්න:");
        qrcode.generate(qr, { small: true });
        console.log("-----------------------------------------");
    }

    if (connection === 'close') {
        const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('සම්බන්ධතාවය බිඳ වැටුණි. නැවත සම්බන්ධ වෙමින්: ', shouldReconnect);
        if (shouldReconnect) startBot();
    } else if (connection === 'open') {
        console.log("බොට් සාර්ථකව සම්බන්ධ විය! ✅");
    }
});

    conn.ev.on('messages.upsert', async (m) => {
        await handleMessages(conn, m);
    });
}

startBot();
