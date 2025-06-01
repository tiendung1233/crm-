import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  sender: string;
  content: string;
  timestamp: number;
}

interface Chat {
  chatId: string;
  messages: Message[];
}

const MessagesUser = () => {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket, isConnected } = useSocket();
  const dataUser = localStorage.getItem('pendingUserData');
  const user = JSON.parse(dataUser || '{}');
  // Load chat history
  useEffect(() => {
    if (!user) return;

    const chatId = `user_${user.id}_admin`;
    console.log('chatId', chatId);

    const loadChatHistory = async () => {
      try {
        const response = await axios.get(`http://localhost:3000/api/messages/${chatId}`);
        setChat({
          chatId,
          messages: response.data.messages || []
        });
      } catch (err) {
        console.error('Error loading chat history:', err);
        setError('Failed to load chat history');
      } finally {
        setLoading(false);
      }
    };

    loadChatHistory();
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    const handleReceiveMessage = (data: { chatId: string; message: Message }) => {
      if (data.chatId === `user_${user.id}_admin`) {
        setChat(prev => {
          if (!prev) return { chatId: data.chatId, messages: [data.message] };
          return {
            ...prev,
            messages: [...prev.messages, data.message]
          };
        });
      }
    };

    socket.on('receiveMessage', handleReceiveMessage);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
    };
  }, [socket, isConnected, user]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user || !socket) return;

    const chatId = `user_${user.id}_admin`;
    const newMessage: Message = {
      sender: user.id,
      content: message.trim(),
      timestamp: Date.now()
    };

    try {
      // Save message to database
      console.log('newMessage', newMessage);
      await axios.post('http://localhost:3000/api/messages', {
        chatId,
        message: newMessage
      });

      // Update local state
      setChat(prev => {
        if (!prev) return { chatId, messages: [newMessage] };
        return {
          ...prev,
          messages: [...prev.messages, newMessage]
        };
      });

      // Emit socket event
      socket.emit('sendMessage', {
        chatId,
        message: newMessage,
        receiverId: 'admin'
      });

      setMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h3 className="text-lg font-semibold text-gray-900">Chat with Admin</h3>
        <p className="text-sm text-gray-500">
          {isConnected ? 'Connected' : 'Disconnected'}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chat?.messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.sender === user?.id ? 'justify-end' : 'justify-start'
              }`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${msg.sender === user?.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-900'
                }`}
            >
              <p>{msg.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex space-x-4">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!message.trim() || !isConnected}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default MessagesUser; 