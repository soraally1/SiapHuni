"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { getUserSupportThreads, createSupportThread } from '../../services/supportService';
import Link from 'next/link';

export default function SupportPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [threads, setThreads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state for new support thread
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [showNewThreadForm, setShowNewThreadForm] = useState(false);

  useEffect(() => {
    const loadSupportThreads = async () => {
      if (!user || authLoading) return;
      
      try {
        setIsLoading(true);
        const { success, threads: userThreads, error } = await getUserSupportThreads(user.uid);
        
        if (success) {
          setThreads(userThreads);
        } else {
          setError(error || 'Failed to load support threads');
        }
      } catch (err) {
        console.error('Error loading support threads:', err);
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSupportThreads();
  }, [user, authLoading]);

  const handleCreateThread = async (e) => {
    e.preventDefault();
    
    if (!subject.trim() || !message.trim() || !user) return;
    
    try {
      setIsCreating(true);
      const userName = user.displayName || user.email?.split('@')[0] || 'User';
      
      const { success, threadId, error } = await createSupportThread(
        user.uid,
        userName,
        user.email || '',
        subject,
        message
      );
      
      if (success && threadId) {
        router.push(`/support/${threadId}`);
      } else {
        setError(error || 'Failed to create support thread');
        setIsCreating(false);
      }
    } catch (err) {
      console.error('Error creating support thread:', err);
      setError('An unexpected error occurred');
      setIsCreating(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your support threads...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-3">Login Required</h2>
          <p>You need to be logged in to view your support threads.</p>
          <button 
            onClick={() => router.push('/login')}
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-primary-dark p-4 text-white">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Support Threads</h1>
            {!showNewThreadForm && (
              <button
                onClick={() => setShowNewThreadForm(true)}
                className="bg-white text-primary px-4 py-2 rounded hover:bg-gray-100"
              >
                New Support Request
              </button>
            )}
          </div>
        </div>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
            <p>{error}</p>
          </div>
        )}
        
        {showNewThreadForm && (
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold mb-3">Create New Support Request</h2>
            <form onSubmit={handleCreateThread}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="subject">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="What is your issue about?"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-32"
                  placeholder="Describe your issue in detail..."
                  required
                ></textarea>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Support Thread'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewThreadForm(false)}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        
        <div className="divide-y">
          {threads.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p className="mb-4">You don't have any support threads yet.</p>
              {!showNewThreadForm && (
                <button
                  onClick={() => setShowNewThreadForm(true)}
                  className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark inline-block"
                >
                  Create Your First Support Request
                </button>
              )}
            </div>
          ) : (
            threads.map((thread) => (
              <Link href={`/support/${thread.id}`} key={thread.id}>
                <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-lg">{thread.subject}</h3>
                      <p className="text-gray-600 text-sm mt-1 line-clamp-1">
                        {thread.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium 
                        ${thread.status === 'open' ? 'bg-green-100 text-green-800' : 
                        thread.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 
                        'bg-gray-100 text-gray-800'}`}
                      >
                        {thread.status === 'open' ? 'Open' : 
                        thread.status === 'in-progress' ? 'In Progress' : 
                        'Closed'}
                      </span>
                      {thread.unreadMessages && (
                        <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          !
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-gray-500">
                    <span>
                      Created: {thread.createdAt?.toDate().toLocaleDateString()}
                    </span>
                    {thread.lastMessageTime && (
                      <span>
                        Last update: {thread.lastMessageTime.toDate().toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 