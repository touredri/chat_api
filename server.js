import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import { Server } from 'socket.io';

// Initialize express
const app = express();
const server = http.createServer(app);
import messageRoutes from './routes/messageRoutes.js';
import Message from './models/Message.js';
import { Chat } from './models/Message.js';

// Middleware for parsing incoming request bodies
app.use(
  cors({
    origin: ['http://localhost:3000'], // Restrict to specific origins
    methods: ['GET', 'POST'], // Only allow necessary methods
  })
);
app.use(express.json()); // for parsing application/json
app.use('/api/messages', messageRoutes); // Use messageRoutes for all routes starting with /api/messages
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// Configuring socket.io
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
});

let connectedUsers = {};

// Socket.IO : handle connections and events
io.on('connection', (socket) => {
  console.log('Un utilisateur connecté :', socket.id);

  socket.on('register', (userId) => {
    connectedUsers[userId] = socket.id; // Associate userId with socket.id
    console.log('Utilisateur enregistré :', userId, socket.id);
  });

  // Handle sending a real-time message
  socket.on('sendMessage', async (data) => {
    try {
      const { senderId, recipientId, type, message } = data;

      // Check if a conversation exists
      let conversation = await Message.findOne({ senderId, recipientId });
      if (!conversation) {
        conversation = await Message.findOne({
          senderId: recipientId,
          recipientId: senderId,
        });
      }

      const newChat = new Chat();

      if (!conversation) {
        conversation = new Message({
          senderId,
          recipientId,
          lastMessage: message,
          createdAt: new Date(),
          modifiedAt: new Date(),
        });
        await conversation.save();
      } else {
        conversation.lastMessage = message;
        conversation.modifiedAt = new Date();
        await conversation.save();
      }

      newChat.id = new mongoose.Types.ObjectId();
      newChat.type = type;
      newChat.message = message;
      newChat.likeCount = 0;
      newChat.messageId = conversation._id;
      await newChat.save();

      // Notify the recipient in real-time
      const recipientSockets = Object.entries(connectedUsers)
        .filter(([userId]) => userId === recipientId)
        .map(([, socketId]) => socketId);

      recipientSockets.forEach((socketId) => {
        io.to(socketId).emit('receiveMessage', newChat);
      });
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', 'Failed to send message');
    }
  });

  socket.on('error', (err) => {
    console.error(`Erreur socket : ${err}`);
  });

  socket.on('disconnect', () => {
    console.log('Un utilisateur déconnecté :', socket.id);
    for (const [userId, socketId] of Object.entries(connectedUsers)) {
      if (socketId === socket.id) {
        delete connectedUsers[userId];
        break;
      }
    }
  });
});

// Connect to MongoDB
const MONGO_URL =
  process.env.MONGO_URL || 'mongodb://localhost:27017/messaging';
mongoose
  .connect(MONGO_URL, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
  })
  .then(() => console.log('Connecté à MongoDB'))
  .catch((err) => console.error('Erreur de connexion à MongoDB :', err));

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});
