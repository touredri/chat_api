import express from 'express';
import Message from '../models/Message.js';
import mongoose from 'mongoose';
import { Chat } from '../models/Message.js';

const router = express.Router();

// Helper function to find or create a conversation
const findOrCreateConversation = async (senderId, recipientId, message) => {
  let conversation = await Message.findOne({ senderId, recipientId });
  if (!conversation) {
    conversation = await Message.findOne({
      senderId: recipientId,
      recipientId: senderId,
    });
  }

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

  return conversation;
};

// Create a new chat or send a message
router.post('/', async (req, res) => {
  try {
    const { senderId, recipientId, message, type } = req.body;

    if (!senderId || !recipientId || !message || !type) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const conversation = await findOrCreateConversation(senderId, recipientId, message);

    const newChat = new Chat({
      type,
      message,
      likeCount: 0,
      messageId: conversation._id,
    });

    await newChat.save();

    const responseChat = newChat.toObject();
    responseChat.id = responseChat._id;
    delete responseChat._id;

    res.status(201).json(responseChat);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Erreur lors de l’envoi du message', error });
  }
});

// Get all messages between two users
router.get('/:senderId/:recipientId', async (req, res) => {
  try {
    const { senderId, recipientId } = req.params;

    const conversation = await findOrCreateConversation(senderId, recipientId, '');

    if (!conversation) {
      return res.status(404).json({
        message: 'Aucune conversation trouvée entre ces utilisateurs.',
      });
    }

    const messages = await Chat.find({ messageId: conversation._id });

    const responseMessages = messages.map((msg) => {
      const msgObj = msg.toObject();
      msgObj.id = msgObj._id;
      delete msgObj._id;
      return msgObj;
    });

    res.status(200).json(responseMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des messages', error });
  }
});

// Get all conversations for a user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const conversations = await Message.find({
      $or: [{ senderId: userId }, { recipientId: userId }],
    });

    const responseConversations = conversations.map((conv) => {
      const convObj = conv.toObject();
      convObj.id = convObj._id;
      delete convObj._id;
      return convObj;
    });

    res.status(200).json(responseConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des conversations',
      error,
    });
  }
});

export default router;