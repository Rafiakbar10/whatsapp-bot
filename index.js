const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// QR Code handler
client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('Scan QR code di atas dengan WhatsApp Anda!');
});

// Bot ready handler
client.on('ready', () => {
  console.log('Bot berhasil terhubung!');
});

// Message handler
client.on('message', async msg => {
  if (msg.body.startsWith('!download')) {
    const url = msg.body.split(' ')[1];

    // Validasi URL
    if (!url) {
      return msg.reply('❌ Format salah. Gunakan: !download [URL YouTube]');
    }

    if (!ytdl.validateURL(url)) {
      return msg.reply('❌ URL YouTube tidak valid!');
    }

    try {
      await msg.reply('⏳ Sedang memproses video...');

      const videoPath = path.join(__dirname, 'temp_video.mp4');
      const videoStream = ytdl(url, { 
        quality: 'highestvideo',
        filter: format => format.container === 'mp4'
      });
      
      const writeStream = fs.createWriteStream(videoPath);
      videoStream.pipe(writeStream);

      // Progress handler
      let progressMessageSent = false;
      videoStream.on('progress', (chunkLength, downloaded, total) => {
        const percent = (downloaded / total * 100).toFixed(2);
        if (!progressMessageSent && percent > 50) {
          msg.reply(`📥 ${percent}% terdownload...`);
          progressMessageSent = true;
        }
      });

      // Ketika download selesai
      writeStream.on('finish', async () => {
        try {
          await msg.reply('✅ Download selesai! Mengirim video...');
          
          await client.sendMessage(msg.from, {
            media: fs.readFileSync(videoPath),
            caption: 'Video YouTube - Downloaded via Bot'
          });

          // Hapus file temporary
          fs.unlinkSync(videoPath);
        } catch (sendError) {
          console.error('Gagal mengirim video:', sendError);
          msg.reply('❌ Gagal mengirim video. Coba lagi nanti.');
        }
      });

      // Error handler
      writeStream.on('error', (error) => {
        console.error('Error saat download:', error);
        msg.reply('❌ Gagal mendownload video. Pastikan URL benar dan coba lagi.');
        if (fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
        }
      });

    } catch (error) {
      console.error('Error:', error);
      msg.reply('❌ Terjadi kesalahan. Coba lagi nanti.');
    }
  }
});

// Start bot
client.initialize();

// Handler untuk error tidak terduga
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});