import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Message {
  sender: string;
  content: string;
  timestamp: number;
}

interface Chat {
  chatId: string;
  messages: Message[];
}


const Messages = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [chats, setChats] = useState<{ [key: string]: Chat }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();

  // Fetch users
  const getCurrentUserToken = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const auth = getAuth();
      onAuthStateChanged(auth, async (user: any | null) => {
        if (user) {
          const token = await user.getIdToken();
          resolve(token);
        } else {
          reject('User not logged in');
        }
      });
    });
  };
  useEffect(() => {

    const fetchUsers = async () => {
      const auth = getAuth();

      onAuthStateChanged(auth, async (user: any | null) => {
        if (user) {
          try {
            const idToken = await getCurrentUserToken();

            const response = await axios.get('http://localhost:3000/api/admin/users', {
              headers: {
                Authorization: `Bearer ${idToken}`
              }
            });
            console.log('response', response.data.users);
            setUsers(response.data.users);
            setLoading(false);
          } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch users');
            setLoading(false);
          } finally {
            setLoading(false);
          }
        } else {
        }
      });
    };


    fetchUsers();
  }, []);

  // Load chat history when selecting a user
  useEffect(() => {
    if (!selectedUser || !user) return;

    const chatId = `user_${selectedUser.id}_admin`;
    console.log('chatId', chatId);

    const loadChatHistory = async () => {
      try {
        const response = await axios.get(`http://localhost:3000/api/messages/${chatId}`);
        setChats(prev => ({
          ...prev,
          [chatId]: {
            chatId,
            messages: response.data.messages || []
          }
        }));
      } catch (err) {
        console.error('Error loading chat history:', err);
      }
    };

    loadChatHistory();
  }, [selectedUser, user]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleReceiveMessage = (data: { chatId: string; message: Message }) => {
      setChats(prev => {
        const chat = prev[data.chatId] || { chatId: data.chatId, messages: [] };
        return {
          ...prev,
          [data.chatId]: {
            ...chat,
            messages: [...chat.messages, data.message]
          }
        };
      });
    };

    socket.on('receiveMessage', handleReceiveMessage);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
    };
  }, [socket, isConnected]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedUser || !user || !socket) return;

    const chatId = `user_${selectedUser.id}_admin`;
    const newMessage: Message = {
      sender: user.uid,
      content: message.trim(),
      timestamp: Date.now()
    };

    try {
      // Save message to database
      await axios.post('http://localhost:3000/api/messages', {
        chatId,
        message: newMessage
      });

      // Update local state
      setChats(prev => ({
        ...prev,
        [chatId]: {
          chatId,
          messages: [...(prev[chatId]?.messages || []), newMessage]
        }
      }));

      // Emit socket event
      socket.emit('sendMessage', {
        chatId,
        message: newMessage,
        receiverId: selectedUser.id
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
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Users List */}
      <div className="w-1/4 border-r border-gray-200 bg-white overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Users</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={`w-full p-4 text-left hover:bg-gray-50 ${selectedUser?.id === user.id ? 'bg-blue-50' : ''
                }`}
            >
              <div className="font-medium text-gray-900">{user.name}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">{selectedUser.name}</h3>
              <p className="text-sm text-gray-500">{selectedUser.email}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chats[`user_${selectedUser.id}_admin`]?.messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.sender === user?.uid ? 'justify-end' : 'justify-start'
                    }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${msg.sender === user?.uid
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a user to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages; 