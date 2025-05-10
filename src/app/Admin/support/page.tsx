"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { getAllOpenSupportThreads, updateSupportThreadStatus } from '../../../services/supportService';
import Link from 'next/link';

export default function AdminSupportPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [threads, setThreads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(null);

  useEffect(() => {
    const loadSupportThreads = async () => {
      if (!user || authLoading) return;
      
      // Verify user is admin
      if (!user.role === 'admin') {
        setError('You do not have permission to access this page');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const { success, threads: supportThreads, error } = await getAllOpenSupportThreads();
        
        if (success) {
          setThreads(supportThreads);
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

  const handleUpdateStatus = async (threadId, newStatus) => {
    try {
      setStatusUpdating(threadId);
      
      const { success, error } = await updateSupportThreadStatus(
        threadId, 
        newStatus,
        user.uid,
        'Admin Support'
      );
      
      if (success) {
        // Update the thread status in the local state
        setThreads(prevThreads => 
          prevThreads.map(thread => 
            thread.id === threadId 
              ? { ...thread, status: newStatus } 
              : thread
          )
        );
      } else {
        setError(error || `Failed to update thread ${threadId} status`);
      }
    } catch (err) {
      console.error('Error updating thread status:', err);
      setError('An unexpected error occurred');
    } finally {
      setStatusUpdating(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading support threads...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-3">Login Required</h2>
          <p>You need to be logged in as an admin to view this page.</p>
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

  if (error && error === 'You do not have permission to access this page') {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-300 text-red-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-3">Access Denied</h2>
          <p>You do not have permission to access the admin support dashboard.</p>
          <button 
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-700 to-indigo-800 p-4 text-white">
          <h1 className="text-2xl font-bold">Admin Support Dashboard</h1>
          <p className="text-sm opacity-90">Manage user support requests</p>
        </div>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
            <p>{error}</p>
          </div>
        )}
        
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-3">Open Support Threads</h2>
          
          {threads.length === 0 ? (
            <div className="p-6 text-center text-gray-500 border rounded">
              <p>There are no open support threads at this time.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {threads.map((thread) => (
                    <tr key={thread.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          <Link href={`/support/${thread.id}`} className="hover:underline text-blue-600">
                            {thread.subject}
                          </Link>
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {thread.lastMessage || 'No messages yet'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{thread.userName}</div>
                        <div className="text-sm text-gray-500">{thread.userEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${thread.status === 'open' ? 'bg-green-100 text-green-800' : 
                          thread.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'}`}
                        >
                          {thread.status === 'open' ? 'Open' : 
                          thread.status === 'in-progress' ? 'In Progress' : 
                          'Closed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${thread.priority === 'high' ? 'bg-red-100 text-red-800' : 
                          thread.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'}`}
                        >
                          {thread.priority === 'high' ? 'High' : 
                          thread.priority === 'medium' ? 'Medium' : 
                          'Low'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {thread.createdAt?.toDate().toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link 
                            href={`/support/${thread.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </Link>
                          
                          {statusUpdating === thread.id ? (
                            <span className="text-gray-400">Updating...</span>
                          ) : thread.status === 'open' ? (
                            <button 
                              onClick={() => handleUpdateStatus(thread.id, 'in-progress')}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Take
                            </button>
                          ) : thread.status === 'in-progress' ? (
                            <button 
                              onClick={() => handleUpdateStatus(thread.id, 'closed')}
                              className="text-red-600 hover:text-red-900"
                            >
                              Close
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 