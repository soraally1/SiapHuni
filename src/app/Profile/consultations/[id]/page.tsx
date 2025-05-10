"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getConsultation, Consultation } from '@/services/consultationService';
import { getMessages, sendMessage, markMessagesAsRead, ChatMessage } from '@/services/chatService';
import { getUserData } from '@/services/userService';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiLoader, FiSend, FiInfo, FiClock, FiUser } from 'react-icons/fi';
import Navbar from '@/components/Navbar';

export default function ConsultationChatPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth({ redirectToLogin: true });
  const router = useRouter();
  const consultationId = params.id;
  
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Fetch consultation and initial messages
  useEffect(() => {
    if (authLoading) return;
    
    if (user && consultationId) {
      fetchConsultationAndMessages();
      fetchUserName();
    }
  }, [user, authLoading, consultationId]);
  
  // Set up polling for new messages
  useEffect(() => {
    if (!user || !consultationId) return;
    
    const intervalId = setInterval(() => {
      fetchMessages();
      markAllMessagesAsRead();
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(intervalId);
  }, [user, consultationId]);
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchUserName = async () => {
    if (!user) return;
    
    try {
      const result = await getUserData(user.uid);
      
      if (result.success && result.userData) {
        setUserName(result.userData.displayName || user.email || 'Pengguna');
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  const fetchConsultationAndMessages = async () => {
    if (!user || !consultationId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch consultation details
      const consultResult = await getConsultation(consultationId);
      
      if (consultResult.success && consultResult.consultation) {
        setConsultation(consultResult.consultation);
        
        // Fetch messages
        await fetchMessages();
        
        // Mark messages as read
        await markAllMessagesAsRead();
      } else {
        setError(consultResult.error || 'Konsultasi tidak ditemukan');
      }
    } catch (err) {
      console.error('Error fetching consultation:', err);
      setError('Terjadi kesalahan saat mengambil data konsultasi');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchMessages = async () => {
    if (!user || !consultationId) return;
    
    try {
      const result = await getMessages(consultationId);
      
      if (result.success) {
        setMessages(result.messages);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };
  
  const markAllMessagesAsRead = async () => {
    if (!user || !consultationId) return;
    
    try {
      await markMessagesAsRead(consultationId, user.uid);
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !consultationId || !newMessage.trim() || !consultation) return;
    
    if (consultation.status !== 'active') {
      alert('Anda tidak dapat mengirim pesan karena konsultasi belum aktif');
      return;
    }
    
    setSendingMessage(true);
    
    try {
      // Use current user's name or email as sender name
      const senderName = userName || user.email || 'Pengguna';
      
      const result = await sendMessage(
        consultationId,
        user.uid,
        senderName,
        newMessage.trim()
      );
      
      if (result.success) {
        setNewMessage('');
        fetchMessages(); // Refresh messages
      } else {
        throw new Error(result.error || 'Gagal mengirim pesan');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Gagal mengirim pesan. Silakan coba lagi.');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <div className="flex-grow container max-w-6xl mx-auto px-4 py-6 flex flex-col">
        <button 
          onClick={() => router.push('/Profile/consultations')}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <FiArrowLeft className="mr-2" />
          Kembali ke Daftar Konsultasi
        </button>
        
        {authLoading || loading ? (
          <div className="flex items-center justify-center h-64">
            <FiLoader className="animate-spin text-blue-600 w-10 h-10" />
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        ) : consultation ? (
          <div className="bg-white shadow-md rounded-lg overflow-hidden flex-grow flex flex-col">
            {/* Chat Header */}
            <div className="bg-blue-600 text-white p-4">
              <h1 className="text-xl font-bold">{consultation.designData.name}</h1>
              <p className="text-sm text-blue-100">
                {consultation.status === 'pending' ? (
                  <span className="flex items-center">
                    <FiClock className="mr-1" />
                    Menunggu arsitek tersedia
                  </span>
                ) : consultation.status === 'active' ? (
                  <span className="flex items-center">
                    <FiUser className="mr-1" />
                    Konsultasi dengan Arsitek
                  </span>
                ) : null}
              </p>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-grow p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              {consultation.status === 'pending' ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-6 bg-yellow-50 rounded-lg">
                    <FiClock className="mx-auto text-yellow-500 text-3xl mb-3" />
                    <h3 className="font-bold text-xl text-gray-800 mb-2">Menunggu Arsitek</h3>
                    <p className="text-gray-600">
                      Permintaan konsultasi Anda sedang menunggu arsitek yang tersedia.
                      Anda akan mendapatkan notifikasi saat arsitek tersedia untuk konsultasi.
                    </p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-6 bg-blue-50 rounded-lg">
                    <FiInfo className="mx-auto text-blue-500 text-3xl mb-3" />
                    <h3 className="font-bold text-xl text-gray-800 mb-2">Mulai Konsultasi</h3>
                    <p className="text-gray-600">
                      Silakan mulai konsultasi dengan mengirimkan pesan kepada arsitek.
                      Anda bisa bertanya tentang detail desain, saran, atau hal lain terkait desain rumah Anda.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <div 
                      key={message.id || index} 
                      className={`mb-3 ${message.senderId === user?.uid ? 'text-right' : 'text-left'}`}
                    >
                      <div 
                        className={`inline-block px-4 py-2 rounded-lg ${
                          message.senderId === user?.uid 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        <p className="text-sm font-semibold mb-1">
                          {message.senderId === user?.uid ? 'Anda' : message.senderName}
                        </p>
                        <p>{message.message}</p>
                        <p className={`text-xs ${message.senderId === user?.uid ? 'text-blue-200' : 'text-gray-500'} mt-1`}>
                          {formatMessageTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
            
            {/* Chat Input */}
            <div className="border-t border-gray-200 p-4">
              {consultation.status === 'active' ? (
                <form onSubmit={handleSendMessage} className="flex">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Ketik pesan Anda disini..."
                    className="flex-grow px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={sendingMessage}
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage || !newMessage.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg flex items-center"
                  >
                    {sendingMessage ? (
                      <FiLoader className="animate-spin" />
                    ) : (
                      <>
                        <FiSend className="mr-1" />
                        Kirim
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="bg-gray-100 p-3 rounded-lg text-center">
                  <p className="text-gray-600">
                    Anda tidak dapat mengirim pesan karena konsultasi belum aktif
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
            Konsultasi tidak ditemukan
          </div>
        )}
      </div>
    </div>
  );
} 