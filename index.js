const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require('pino');
const { handleMessages } = require('./main.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

async function startBot() {
    // 1. Session ගබඩා කරන තැන සකසමු
    const { state, saveCreds } = await useMultiFileAuthState('auth_session');
    
    // 2. අලුත්ම Baileys version එක ගනිමු
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true, // මෙය true විය යුතුය
        logger: pino({ level: 'silent' }),
        browser: ["Chrome", "Windows", "10.0.0"] // Browser එක නිවැරදිව ලබා දීම
    });

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        // QR එකක් ආවොත් එය පෙන්වන්න
        if (qr) {
            console.log("-----------------------------------------");
            console.log("කරුණාකර පහත QR Code එක Scan කරන්න:");
            qrcode.generate(qr, { small: true });
            console.log("-----------------------------------------");
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.log(`සම්බන්ධතාවය බිඳ වැටුණි (Reason: ${statusCode}). නැවත සම්බන්ධ වෙමින්: ${shouldReconnect}`);

            // සෙෂන් එක අවුල් නම්, ෆෝල්ඩරය මකා අලුතින් පටන් ගනී
            if (statusCode === DisconnectReason.restartRequired || statusCode === 401) {
                console.log("සෙෂන් එකේ දෝෂයක්. කරුණාකර නැවත රන් කරන්න.");
                // fs.rmSync('./auth_session', { recursive: true, force: true }); // අවශ්‍ය නම් මෙය භාවිතා කරන්න
                startBot();
            } else if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log("බොට් සාර්ථකව සම්බන්ධ විය! ✅");
        }
    });

    conn.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const msg = chatUpdate.messages[0];
            if (!msg.message) return;

            const from = msg.key.remoteJid;
            const settings = require('./settings.js');

            // --- 1. Auto Status View + Emoji Like + Downloader ---
            if (from === 'status@broadcast') {
                await conn.readMessages([msg.key]);
                await conn.sendMessage(from, { react: { key: msg.key, text: '❤️' } }, { statusJidList: [msg.key.participant] });
                await conn.copyNForward(settings.ownerNumber, msg, true);
                return; // ස්ටේටස් එකක් නම් මෙතනින් නවතින්න
            }

            // --- 2. Anti-Delete පහසුකම ---
            if (msg.message.protocolMessage && msg.message.protocolMessage.type === 0) {
                const key = msg.message.protocolMessage.key;
                const messageId = key.id;
                
                // මකා දැමූ මැසේජ් එකේ විස්තර ලබා ගැනීම
                console.log(`මැසේජ් එකක් මකා දමන ලදී: ${messageId}`);

                // මකා දැමූ මැසේජ් එක නැවත ඔබට එවීමට (Forward)
                // සටහන: මෙය ක්‍රියා කරන්නේ මැසේජ් එක මකන අවස්ථාවේ බොට් ඔන්ලයින් සිටියේ නම් පමණි
                await conn.sendMessage(settings.ownerNumber, { text: `⚠️ *Anti-Delete හඳුනාගත්තා!*\n\n*පුද්ගලයා:* @${key.remoteJid.split('@')[0]}\n*මැසේජ් එක මකා දමන ලදී.*`, mentions: [key.remoteJid] });
                await conn.copyNForward(settings.ownerNumber, chatUpdate.messages[0], true);
            }

            // --- 3. සාමාන්‍ය මැසේජ් හැසිරවීම (Voice Bot logic) ---
            if (!msg.key.fromMe) {
                await handleMessages(conn, chatUpdate);
            }

        } catch (err) {
            console.log("Main Logic Error: " + err);
        }
    });

            // --- 2. සාමාන්‍ය මැසේජ් හැසිරවීම (Voice Bot logic) ---
            await handleMessages(conn, chatUpdate);

        } catch (err) {
            console.log("Status Logic Error: " + err);
        }
    });
}

// දෝෂයක් ආවොත් ප්‍රධාන ක්‍රියාවලිය නතර වීම වැළැක්වීමට
startBot().catch(err => console.log("වැරදීමක්: " + err));
