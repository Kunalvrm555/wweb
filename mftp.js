var express = require('express');
var app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.json({ limit: '50mb', extended: true }));
app.use(
    bodyParser.urlencoded({
        limit: '50mb',
        extended: true,
        parameterLimit: 50000,
    })
);
app.use(bodyParser.text({ limit: '200mb' }));

const chatId = '919354817605@c.us';

const { Client, MessageMedia, LocalAuth } = require('./index');
const qrcode = require('qrcode-terminal');
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ['--no-sandbox'] },
});
client.initialize();
client.on('qr', (qr) => {
    // NOTE: This event will not be fired if a session is specified.
    console.log('QR RECEIVED');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', (msg) => {
    // Fired if session restore was unsuccessful
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('ready', () => {
    console.log('READY');
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
});
client.on('message', async (message) => {
    //a new message is received
    const chat = await message.getChat(); //obtain chat details in which message is received
    if (message.body == 'hi') {
        chat.sendMessage('Hello');
    }
});

// Server port
var HTTP_PORT = 8000;
// Start server
app.listen(HTTP_PORT, () => {
    console.log('Server running on port %PORT%'.replace('%PORT%', HTTP_PORT));
});
// Root endpoint
app.get('/', (req, res) => {
    res.json({ message: 'API ENDPOINT WORKING' });
});

// Insert here other API endpoints
app.post('/sendmessage/', async (req, res) => {
    var data = {
        message: req.body.message,
    };
    await client.sendMessage(chatId, data.message);
    const chats = await client.getChats();
    // console.log(chats);
    chats.forEach(async (chat) => {
        if (chat.isGroup) {
            chat.sendMessage(data.message);
            // console.log('sent to chat', chat.id);
        }
    });
    res.sendStatus(200);
});

const sendmedia = async (string_base64, caption_text) => {
    const media = new MessageMedia('application/pdf', string_base64, caption_text);
    media.filename = 'attachment.pdf';
    await client.sendMessage(chatId, media, { caption: caption_text, attachment: media, sendMediaAsDocument: true });  
    const chats = await client.getChats();
    chats.forEach(async (chat) => {
        if (chat.isGroup) {
            await chat.sendMessage(media, { caption: caption_text, attachment: media, sendMediaAsDocument: true });  
            // console.log('sent to chat', chat.id);
        }
    });
};

app.post('/sendfile/', (req, res) => {
    var data = {
        base64string: req.body.base64string,
        caption: req.body.caption,
    };
    // console.log(data.base64string.slice(0, 50));
    setTimeout(sendmedia, 500, data.base64string, data.caption);
    res.sendStatus(200);
});

app.use(function (req, res) {
    res.status(404);
});
