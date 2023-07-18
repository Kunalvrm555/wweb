const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const amqp = require('amqplib');
const amqpUrl = 'amqp://rabbitmq?connection_attempts=5&retry_delay=5';
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
    consumeFromQueue();
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
});

client.on('message', async (message) => {
    const chat = await message.getChat();
    if (message.body === 'hi') {
        chat.sendMessage('Hello');
    }
});

const HTTP_PORT = 8000;
app.listen(HTTP_PORT, () => {
    console.log('Server running on port %PORT%'.replace('%PORT%', HTTP_PORT));
});

app.get('/', (req, res) => {
    res.json({ message: 'API ENDPOINT WORKING' });
});

// RabbitMQ Consumer
const consumeFromQueue = async () => {
    const connection = await amqp.connect(amqpUrl);
    const channel = await connection.createChannel();
    const queueName = 'message_queue';

    await channel.assertQueue(queueName, { durable: true });

    channel.consume(
        queueName,
        async (message) => {
            try {
                const messageContent = message.content.toString();
                await handleMessage(messageContent);
                channel.ack(message); // Acknowledge message after successful processing
            } catch (error) {
                console.error('Error handling message:', error);
                channel.reject(message, false); // Reject message to prevent removal from the queue
            }
        },
        { noAck: false } // Set noAck to false to manually acknowledge or reject messages
    );
};


const handleMessage = async (messageContent) => {
    try {
        const data = JSON.parse(messageContent);

        if (data.base64string && data.caption) {
            const media = new MessageMedia('application/pdf', data.base64string, data.caption);
            await client.sendMessage(chatId, media, { caption: data.caption, sendMediaAsDocument: true });
        } else if (data.message) {
            await client.sendMessage(chatId, data.message);
        }
    } catch (error) {
        console.error('Error handling message:', error);
    }
};

app.use(function (req, res) {
    res.status(404);
});
