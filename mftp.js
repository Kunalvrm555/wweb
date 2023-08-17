var express = require('express');
var app = express();
var bodyParser = require('body-parser');

// Middleware setup to parse incoming request bodies
app.use(bodyParser.json({ limit: '50mb', extended: true }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));
app.use(bodyParser.text({ limit: '200mb' }));

// Static chat ID
const chatId = '919354817605@c.us';

// Import necessary modules
const { Client, MessageMedia, LocalAuth } = require('./index');
const qrcode = require('qrcode-terminal');

// Initialize the client with specific options
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ['--no-sandbox'] },
});

client.initialize();

// Event handlers for the WhatsApp client

// Generate QR code for authentication
client.on('qr', (qr) => {
    console.log('QR RECEIVED');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', (msg) => {
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('ready', () => {
    console.log('READY');
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
});

// Handling incoming messages
client.on('message', async (message) => {
    try {
        const chat = await message.getChat();
        if (message.body == 'hi') {
            chat.sendMessage('Hello');
        } else if (message.body.startsWith('+91')) {
            if (chat.id._serialized == chatId) {
                const groupId = '120363148894935956@g.us';
                try {
                    const group = await client.getChatById(groupId);
                    const number = message.body.replace(/\s/g, '').slice(1);
                    
                    // const participantId = `${number}@c.us`;
                    // const result = await group.addParticipants([participantId]);
                    // message.reply(result[participantId].message);
                    message.reply(number);
                } catch (error) {
                    console.error('Error while adding participant:', error);
                    message.reply(error.message);
                }
            } else {
                chat.sendMessage('You are not authorized to add participants');
            }
        }
    } catch (error) {
        console.error('Error in message handler:', error);
    }
});

// Server configuration
var HTTP_PORT = 8000;

// Start the server
app.listen(HTTP_PORT, () => {
    console.log('Server running on port %PORT%'.replace('%PORT%', HTTP_PORT));
});

// Basic endpoint to test if API is working
app.get('/', (req, res) => {
    res.json({ message: 'API ENDPOINT WORKING' });
});

// Endpoint to send message
app.post('/sendmessage/', async (req, res) => {
    try {
        var data = { message: req.body.message };
        await client.sendMessage(chatId, data.message);
        const chats = await client.getChats();
        chats.forEach(async (chat) => {
            if (chat.isGroup) {
                chat.sendMessage(data.message);
            }
        });
        res.sendStatus(200);
    } catch (error) {
        console.error('Error in sendmessage endpoint:', error);
        res.sendStatus(500);
    }
});

// Function to send media message
const sendmedia = async (string_base64, caption_text) => {
    try {
        const media = new MessageMedia('application/pdf', string_base64, caption_text);
        media.filename = 'attachment.pdf';
        await client.sendMessage(chatId, media, {
            caption: caption_text,
            attachment: media,
            sendMediaAsDocument: true,
        });
        const chats = await client.getChats();
        chats.forEach(async (chat) => {
            if (chat.isGroup) {
                await chat.sendMessage(media, {
                    caption: caption_text,
                    attachment: media,
                    sendMediaAsDocument: true,
                });
            }
        });
    } catch (error) {
        console.error('Error in sendmedia:', error);
    }
};

// Endpoint to send a file
app.post('/sendfile/', (req, res) => {
    try {
        var data = {
            base64string: req.body.base64string,
            caption: req.body.caption,
        };
        setTimeout(sendmedia, 500, data.base64string, data.caption);
        res.sendStatus(200);
    } catch (error) {
        console.error('Error in sendfile endpoint:', error);
        res.sendStatus(500);
    }
});

// Catch-all middleware for unhandled routes
app.use(function (req, res) {
    res.status(404);
});
