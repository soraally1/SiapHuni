"use client"

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { getSupportThread } from '../../../services/supportService';
import { 
  sendAdminSupportMessage,
  sendSupportMessage, 
  subscribeToSupportMessages, 
  markSupportMessagesAsRead 
} from '../../../services/chatService';
import Image from 'next/image';

export default function SupportChatPage() {
  const params = useParams();
  const router = useRouter();
  const threadId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Load thread data
  useEffect(() => {
    const loadThread = async () => {
      if (!user || authLoading) return;
      
      try {
        const { success, thread: threadData, error } = await getSupportThread(threadId);
        
        if (success && threadData) {
          setThread(threadData);
          
          // Verify this user is authorized to view this thread
          if (threadData.userId !== user.uid && user.role !== 'admin') {
            setError('You are not authorized to view this support thread');
            setIsLoading(false);
            return;
          }
        } else {
          setError(error || 'Could not load support thread');
        }
      } catch (err) {
        console.error('Error loading support thread:', err);
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadThread();
  }, [threadId, user, authLoading]);

  // Subscribe to messages
  useEffect(() => {
    if (!user || !thread) return;
    
    const unsubscribe = subscribeToSupportMessages(threadId, (newMessages) => {
      setMessages(newMessages);
      
      // Mark messages as read
      markSupportMessagesAsRead(threadId, user.uid);
    });
    
    // Clean up subscription on unmount
    return () => unsubscribe();
  }, [threadId, user, thread]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || !thread) return;
    
    try {
      setSending(true);
      
      const isAdmin = user.role === 'admin';
      const userName = isAdmin ? 'Admin Support' : (user.displayName || user.email?.split('@')[0] || 'User');
      
      // Use appropriate function based on user role
      const { success, error } = isAdmin
        ? await sendAdminSupportMessage(threadId, user.uid, userName, newMessage)
        : await sendSupportMessage(threadId, user.uid, userName, newMessage);
      
      if (success) {
        setNewMessage('');
      } else {
        setError(error || 'Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('An unexpected error occurred');
    } finally {
      setSending(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center h-[80vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading support chat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-300 text-red-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-3">Error</h2>
          <p>{error}</p>
          <button 
            onClick={() => router.push('/support')}
            className="mt-4 px-4 py-2 bg-amber-700 text-white rounded hover:bg-amber-800"
          >
            Go back to Support
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-3">Login Required</h2>
          <p>You need to be logged in to view this support thread.</p>
          <button 
            onClick={() => router.push('/login')}
            className="mt-4 px-4 py-2 bg-amber-700 text-white rounded hover:bg-amber-800"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }
  
  if (!thread) return null;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-800 p-4 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">{thread.subject}</h1>
              <p className="text-sm opacity-90">Support ID: {threadId.substring(0, 8)}</p>
              {thread.designId && (
                <p className="text-sm opacity-90 mt-1">Related to design: {thread.designId}</p>
              )}
            </div>
            <div className="flex items-center">
              <span className={`px-3 py-1 rounded-full text-xs font-medium 
                ${thread.status === 'open' ? 'bg-green-600' : 
                thread.status === 'in-progress' ? 'bg-blue-600' : 
                'bg-gray-600'}`}
              >
                {thread.status === 'open' ? 'Open' : 
                thread.status === 'in-progress' ? 'In Progress' : 
                'Closed'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Messages */}
        <div className="bg-gray-50 p-4 h-[60vh] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              <p>No messages yet</p>
            </div>
          ) : (
            messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex mb-4 ${message.senderId === user.uid ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`rounded-lg p-3 max-w-[80%] ${
                  message.senderId === user.uid 
                    ? 'bg-amber-700 text-white' 
                    : 'bg-gray-200 text-gray-900'
                }`}>
                  <div className="text-xs mb-1 font-medium">
                    {message.senderName}
                  </div>
                  <div className="whitespace-pre-wrap">{message.message}</div>
                  <div className="text-xs mt-1 opacity-75 text-right">
                    {message.timestamp?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message Input */}
        <div className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message here..."
              className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-700"
              disabled={sending || thread.status === 'closed'}
            />
            <button
              type="submit"
              className="bg-amber-700 text-white px-4 py-2 rounded-lg hover:bg-amber-800 disabled:opacity-50"
              disabled={sending || !newMessage.trim() || thread.status === 'closed'}
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
          {thread.status === 'closed' && (
            <div className="mt-2 text-sm text-red-600">
              This support thread is closed. You cannot send new messages.
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 