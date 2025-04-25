import express from 'express';
import { WebSocketServer, WebSocket } from "ws";
import mongoose from 'mongoose';
import cors from 'cors';
import { Message } from './models/Message';
import dotenv from 'dotenv';

dotenv.config();
const connectDB = async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI as string);
      console.log("MongoDB Connected");
    } catch (error) {
      console.error("MongoDB Connection Failed:", error);
      process.exit(1);
  }
  };




connectDB();

const app = express();
app.use(cors());
app.use(express.json());


const wss = new WebSocketServer({ port: 8080 });

interface User {
    socket: WebSocket;
    room: string;
    username: string;
}

let allSockets: User[] = [];
const port = process.env.PORT || 4000 

app.get('/', (req, res) => {
  res.send('Hello World!')
})



// REST API endpoints
app.get('/api/messages/:room', async (req, res) => {
    try {
        const messages = await Message.find({ room: req.params.room })
            .sort({ timestamp: -1 })
            .limit(50);
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

wss.on("connection", (socket) => {
    socket.on("message", async (message) => {
        const parsedMessage = JSON.parse(message.toString());

        if (parsedMessage.type === "join") {
            allSockets.push({
                socket,
                room: parsedMessage.payload.roomId,
                username: parsedMessage.payload.username
            });

            // Send last 50 messages when joining
            const messages = await Message.find({ room: parsedMessage.payload.roomId })
                .sort({ timestamp: -1 })
                .limit(50);
            
            socket.send(JSON.stringify({
                type: 'history',
                payload: messages
            }));
        }

        if (parsedMessage.type === "chat") {
            const currentUser = allSockets.find(user => user.socket === socket);
            if (!currentUser) return;

            // Save message to database
            const newMessage = new Message({
                room: currentUser.room,
                content: parsedMessage.payload.message,
                sender: currentUser.username
            });
            await newMessage.save();

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
    });

    socket.on('close', () => {
        allSockets = allSockets.filter(user => user.socket !== socket);
    });
});

app.listen(port, () => {
    console.log('REST API server running on port 3000');
});