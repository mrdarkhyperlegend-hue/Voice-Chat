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
        if (qr) qrcode.generate(qr, { small: true });
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log("බොට් සාර්ථකව සම්බන්ධ විය (Contacts + Groups) ✅");
        }
    });

    conn.ev.on('messages.upsert', async (m) => {
        await handleMessages(conn, m);
    });
}

startBot();
