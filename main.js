const { voiceMessages } = require('./mydata.js');
const settings = require('./settings.js');
const fs = require('fs');

async function handleMessages(conn, m) {
    try {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us'); // ගෲප් එකක්දැයි බලයි
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase();

        // 1. වෙල්කම් මැසේජ් (ඕනෑම කෙනෙක් 'hi' හෝ 'start' එවූ විට)
        if (text === 'hi' || text === 'start') {
            if (fs.existsSync(settings.welcomeImage)) {
                await conn.sendMessage(from, { 
                    image: fs.readFileSync(settings.welcomeImage), 
                    caption: settings.welcomeMessage 
                });
            } else {
                await conn.sendMessage(from, { text: settings.welcomeMessage });
            }
        }

        // 2. වොයිස් මැසේජ් (Local Path එකෙන් කියවීම)
        if (voiceMessages[text]) {
            const filePath = voiceMessages[text];
            
            if (fs.existsSync(filePath)) {
               await conn.sendMessage(from, { 
                audio: audioBuffer, 
                mimetype: 'audio/mpeg', // 'audio/mp4' වෙනුවට 'audio/mpeg' උත්සාහ කරන්න
                ptt: true 
                }, { quoted: msg });
            }
        }

    } catch (e) {
        console.log("Error in main.js: " + e);
    }
}

module.exports = { handleMessages };
