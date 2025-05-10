"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getUserGeneratedDesigns, deleteGeneratedDesign, GeneratedDesign } from '@/services/designService';
import { createConsultation } from '@/services/consultationService';
import { useRouter } from 'next/navigation';
import { FiHome, FiTrash2, FiEye, FiLoader, FiMessageSquare } from 'react-icons/fi';
import Navbar from '@/components/Navbar';

export default function SavedDesignsPage() {
  const { user, loading: authLoading } = useAuth({ redirectToLogin: true });
  const router = useRouter();
  
  const [designs, setDesigns] = useState<GeneratedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [consultingId, setConsultingId] = useState<string | null>(null);

  // Load saved designs when user auth state is ready
  useEffect(() => {
    if (authLoading) return;
    
    if (user) {
      fetchDesigns();
    }
  }, [user, authLoading]);

  const fetchDesigns = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getUserGeneratedDesigns(user.uid);
      
      if (result.success) {
        setDesigns(result.designs);
      } else {
        setError(result.error || 'Gagal mengambil data desain');
      }
    } catch (err) {
      console.error('Error fetching designs:', err);
      setError('Terjadi kesalahan saat mengambil data desain');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (designId: string) => {
    if (!user || !designId) return;
    
    setDeletingId(designId);
    
    try {
      const result = await deleteGeneratedDesign(user.uid, designId);
      
      if (result.success) {
        // Remove the deleted design from the local state
        setDesigns(designs.filter(design => design.id !== designId));
      } else {
        throw new Error(result.error || 'Gagal menghapus desain');
      }
    } catch (err) {
      console.error('Error deleting design:', err);
      alert('Gagal menghapus desain. Silakan coba lagi.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewDesign = (designId: string) => {
    router.push(`/Profile/saved-designs/${designId}`);
  };

  const handleConsultArchitect = async (design: GeneratedDesign) => {
    if (!user || !design.id) return;
    
    setConsultingId(design.id);
    
    try {
      const result = await createConsultation(user.uid, design.id, design);
      
      if (result.success) {
        // Redirect to the consultation chat page
        router.push(`/Profile/consultations/${result.consultationId}`);
      } else {
        throw new Error(result.error || 'Gagal membuat permintaan konsultasi');
      }
    } catch (err) {
      console.error('Error creating consultation:', err);
      alert('Gagal membuat permintaan konsultasi. Silakan coba lagi.');
    } finally {
      setConsultingId(null);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Desain Tersimpan</h1>
          <button 
            onClick={() => router.push('/custom-design')}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <FiHome className="mr-2" />
            Buat Desain Baru
          </button>
        </div>
        
        {authLoading || loading ? (
          <div className="flex items-center justify-center h-64">
            <FiLoader className="animate-spin text-blue-600 w-10 h-10" />
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        ) : designs.length === 0 ? (
          <div className="bg-white shadow-md rounded-lg p-8 text-center">
            <p className="text-gray-600 mb-4">Anda belum memiliki desain yang tersimpan</p>
            <button 
              onClick={() => router.push('/custom-design')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Buat Desain Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {designs.map(design => (
              <div key={design.id} className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{design.name}</h2>
                  <p className="text-gray-600 mb-2">Gaya: {design.style}</p>
                  <p className="text-gray-600 mb-2">Harga: {design.estimatedPrice}</p>
                  <p className="text-gray-500 text-sm mb-4">
                    Dibuat pada: {formatDate(design.createdAt)}
                  </p>
                  
                  <div className="flex items-center justify-between gap-2 mt-4 flex-wrap">
                    <button
                      onClick={() => handleViewDesign(design.id!)}
                      className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      <FiEye className="mr-1" />
                      Detail
                    </button>
                    
                    <button
                      onClick={() => handleConsultArchitect(design)}
                      disabled={consultingId === design.id}
                      className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                    >
                      {consultingId === design.id ? (
                        <FiLoader className="animate-spin mr-1" />
                      ) : (
                        <FiMessageSquare className="mr-1" />
                      )}
                      Konsultasi
                    </button>
                    
                    <button
                      onClick={() => handleDelete(design.id!)}
                      disabled={deletingId === design.id}
                      className="flex items-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                    >
                      {deletingId === design.id ? (
                        <FiLoader className="animate-spin mr-1" />
                      ) : (
                        <FiTrash2 className="mr-1" />
                      )}
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 