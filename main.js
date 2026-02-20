const { voiceMessages } = require('./mydata.js');
const settings = require('./settings.js');
const fs = require('fs');

async function handleMessages(conn, m) {
    try {
        const msg = m.messages[0];
        // මැසේජ් එකක් නැත්නම් හෝ බොට් විසින්ම යැවූ එකක් නම් නතර කරන්න
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase().trim();

        // 1. වෙල්කම් මැසේජ් පරීක්ෂාව
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

        // 2. වොයිස් මැසේජ් පරීක්ෂාව
        if (voiceMessages[text]) {
            const filePath = voiceMessages[text];

            if (fs.existsSync(filePath)) {
                // මෙන්න මෙතැනදී අපි audioBuffer එක define කරනවා
                const audioBuffer = fs.readFileSync(filePath); 

                await conn.sendMessage(from, { 
                    audio: audioBuffer, // මෙතැනදී ඉහත define කළ එක භාවිතා වේ
                    mimetype: 'audio/mpeg', 
                    ptt: true 
                }, { quoted: msg });

                console.log(`සාර්ථකව යැවුවා: ${filePath}`);
            } else {
                console.log(`ගොනුව හමුනොවුනි: ${filePath}`);
            }
        }

    } catch (e) {
        console.log("Error in main.js: " + e);
    }
}

module.exports = { handleMessages };
