"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getUserConsultations, Consultation } from '@/services/consultationService';
import { useRouter } from 'next/navigation';
import { FiMessageSquare, FiLoader, FiArrowLeft, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import Navbar from '@/components/Navbar';

export default function ConsultationsPage() {
  const { user, loading: authLoading } = useAuth({ redirectToLogin: true });
  const router = useRouter();
  
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load consultations when user auth state is ready
  useEffect(() => {
    if (authLoading) return;
    
    if (user) {
      fetchConsultations();
    }
  }, [user, authLoading]);

  const fetchConsultations = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getUserConsultations(user.uid);
      
      if (result.success) {
        setConsultations(result.consultations);
      } else {
        setError(result.error || 'Gagal mengambil data konsultasi');
      }
    } catch (err) {
      console.error('Error fetching consultations:', err);
      setError('Terjadi kesalahan saat mengambil data konsultasi');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center text-yellow-600 bg-yellow-100 px-2 py-1 rounded text-sm">
            <FiClock className="mr-1" />
            Menunggu Arsitek
          </span>
        );
      case 'active':
        return (
          <span className="flex items-center text-green-600 bg-green-100 px-2 py-1 rounded text-sm">
            <FiCheckCircle className="mr-1" />
            Aktif
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center text-blue-600 bg-blue-100 px-2 py-1 rounded text-sm">
            <FiCheckCircle className="mr-1" />
            Selesai
          </span>
        );
      case 'cancelled':
        return (
          <span className="flex items-center text-red-600 bg-red-100 px-2 py-1 rounded text-sm">
            <FiXCircle className="mr-1" />
            Dibatalkan
          </span>
        );
      default:
        return null;
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
          <h1 className="text-3xl font-bold text-gray-900">Konsultasi Desain</h1>
          <button 
            onClick={() => router.push('/Profile/saved-designs')}
            className="flex items-center px-4 py-2 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg"
          >
            <FiArrowLeft className="mr-2" />
            Kembali ke Desain Tersimpan
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
        ) : consultations.length === 0 ? (
          <div className="bg-white shadow-md rounded-lg p-8 text-center">
            <p className="text-gray-600 mb-4">Anda belum memiliki konsultasi aktif</p>
            <button 
              onClick={() => router.push('/Profile/saved-designs')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Lihat Desain Tersimpan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {consultations.map(consultation => (
              <div 
                key={consultation.id} 
                className="bg-white shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/Profile/consultations/${consultation.id}`)}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold text-gray-900">{consultation.designData.name}</h2>
                    {getStatusBadge(consultation.status)}
                  </div>
                  
                  <p className="text-gray-600 mb-2">
                    {consultation.designData.description.length > 100 
                      ? consultation.designData.description.substring(0, 100) + '...' 
                      : consultation.designData.description}
                  </p>
                  
                  {consultation.architectId ? (
                    <p className="text-green-600 text-sm mb-4">
                      Konsultasi dengan Arsitek
                    </p>
                  ) : (
                    <p className="text-yellow-600 text-sm mb-4">
                      Menunggu arsitek tersedia
                    </p>
                  )}
                  
                  <p className="text-gray-500 text-sm">
                    Dibuat pada: {formatDate(consultation.createdAt)}
                  </p>
                  
                  <div className="flex items-center justify-end mt-4">
                    <button className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                      <FiMessageSquare className="mr-1" />
                      {consultation.status === 'pending' ? 'Lihat Detail' : 'Lanjutkan Chat'}
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