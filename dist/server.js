"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ws_1 = require("ws");
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const Message_1 = require("./models/Message");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Update mongoose connection
mongoose_1.default.connect('mongodb+srv://prakhar20jan:Z3HpriiqWGkREuS1@cluster0.wulrz.mongodb.net/chat-app')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
const wss = new ws_1.WebSocketServer({ port: 8080 });
let allSockets = [];
// REST API endpoints
app.get('/api/messages/:room', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const messages = yield Message_1.Message.find({ room: req.params.room })
            .sort({ timestamp: -1 })
            .limit(50);
        res.json(messages);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
}));
wss.on("connection", (socket) => {
    socket.on("message", (message) => __awaiter(void 0, void 0, void 0, function* () {
        const parsedMessage = JSON.parse(message.toString());
        if (parsedMessage.type === "join") {
            allSockets.push({
                socket,
                room: parsedMessage.payload.roomId,
                username: parsedMessage.payload.username
            });
            // Send last 50 messages when joining
            const messages = yield Message_1.Message.find({ room: parsedMessage.payload.roomId })
                .sort({ timestamp: -1 })
                .limit(50);
            socket.send(JSON.stringify({
                type: 'history',
                payload: messages
            }));
        }
        if (parsedMessage.type === "chat") {
            const currentUser = allSockets.find(user => user.socket === socket);
            if (!currentUser)
                return;
            // Save message to database
            const newMessage = new Message_1.Message({
                room: currentUser.room,
                content: parsedMessage.payload.message,
                sender: currentUser.username
            });
            yield newMessage.save();
            // Broadcast to room
            const messageToSend = {
                content: parsedMessage.payload.message,
                sender: currentUser.username,
                timestamp: new Date()
            };
            allSockets
                .filter(user => user.room === currentUser.room)
                .forEach(user => {
                user.socket.send(JSON.stringify({
                    type: 'message',
                    payload: messageToSend
                }));
            });
        }
    }));
    socket.on('close', () => {
        allSockets = allSockets.filter(user => user.socket !== socket);
    });
});
app.listen(3000, () => {
    console.log('REST API server running on port 3000');
});
