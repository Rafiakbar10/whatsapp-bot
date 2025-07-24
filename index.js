const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');

// Konfigurasi ringan untuk Puppeteer
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--single-process',  // Menghemat RAM
      '--disable-dev-shm-usage',
      '--no-zygote'
    ]
  }
});

// Sederhanakan handler QR
client.on('qr', qr => qrcode.generate(qr, { small: true }));

// Handler ready yang minimalis
client.on('ready', () => console.log('Bot ready ✅'));

// Optimasi handler pesan
client.on('message', async msg => {
  if (!msg.body.startsWith('!download')) return;

  const url = msg.body.split(' ')[1];
  if (!url) return msg.reply('❌ Gunakan: !download [URL]');
  
  try {
    if (!ytdl.validateURL(url)) {
      return msg.reply('❌ URL YouTube tidak valid!');
    }

    const videoPath = path.join(__dirname, 'temp_video.mp4');
    const videoStream = ytdl(url, { 
      quality: 'lowest',  // Gunakan kualitas lebih rendah untuk menghemat bandwidth
      filter: format => format.container === 'mp4'
    });

    // Progress handler yang lebih efisien
    let lastProgress = 0;
    videoStream.on('progress', (_, downloaded, total) => {
      const percent = Math.floor(downloaded / total * 100);
      if (percent >= lastProgress + 25) {  // Laporkan setiap 25% progress
        msg.reply(`📥 ${percent}% downloaded`);
        lastProgress = percent;
      }
    });

    // Stream langsung ke WhatsApp tanpa simpan file
    const chunks = [];
    videoStream.on('data', chunk => chunks.push(chunk));
    videoStream.on('end', async () => {
      try {
        await client.sendMessage(msg.from, {
          media: Buffer.concat(chunks),
          caption: '🎬 Video siap!'
        });
      } catch (error) {
        console.error('Send error:', error);
        msg.reply('❌ Gagal mengirim video');
      }
    });

  } catch (error) {
    console.error('Error:', error);
    msg.reply('❌ Terjadi kesalahan sistem');
  }
});

client.initialize();

// Error handling global
process.on('unhandledRejection', err => console.error('Unhandled rejection:', err));
