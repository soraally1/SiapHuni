"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getArchitectConsultations, updateConsultationStatus, Consultation, ConsultationStatus } from '@/services/consultationService';
import { getUserData, setArchitectAvailability } from '@/services/userService';
import { useRouter } from 'next/navigation';
import { FiMessageSquare, FiLoader, FiUser, FiToggleLeft, FiToggleRight, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import Navbar from '@/components/Navbar';

export default function ArchitectDashboard() {
  const { user, loading: authLoading } = useAuth({ redirectToLogin: true });
  const router = useRouter();
  
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  // Check if the user is an architect
  useEffect(() => {
    if (authLoading) return;
    
    if (user) {
      checkArchitectRole();
    }
  }, [user, authLoading]);

  const checkArchitectRole = async () => {
    if (!user) return;
    
    try {
      const result = await getUserData(user.uid);
      
      if (result.success && result.userData) {
        if (result.userData.role !== 'architect') {
          // Redirect non-architects
          alert('Halaman ini hanya untuk arsitek');
          router.push('/Profile');
          return;
        }
        
        // Set availability state
        setIsAvailable(result.userData.isAvailable || false);
        
        // Fetch consultations
        fetchConsultations();
      } else {
        setError('Gagal memuat data pengguna');
      }
    } catch (err) {
      console.error('Error checking architect role:', err);
      setError('Terjadi kesalahan saat memeriksa peran pengguna');
    }
  };

  const fetchConsultations = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getArchitectConsultations(user.uid);
      
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

  const toggleAvailability = async () => {
    if (!user) return;
    
    setUpdatingAvailability(true);
    
    try {
      const newAvailability = !isAvailable;
      const result = await setArchitectAvailability(user.uid, newAvailability);
      
      if (result.success) {
        setIsAvailable(newAvailability);
      } else {
        throw new Error(result.error || 'Gagal mengubah status ketersediaan');
      }
    } catch (err) {
      console.error('Error updating availability:', err);
      alert('Gagal mengubah status ketersediaan. Silakan coba lagi.');
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const updateStatus = async (consultationId: string, status: ConsultationStatus) => {
    if (!user) return;
    
    setUpdatingStatus(consultationId);
    
    try {
      const result = await updateConsultationStatus(consultationId, status);
      
      if (result.success) {
        // Update local state
        setConsultations(consultations.map(c => 
          c.id === consultationId ? { ...c, status } : c
        ));
      } else {
        throw new Error(result.error || 'Gagal mengubah status konsultasi');
      }
    } catch (err) {
      console.error('Error updating consultation status:', err);
      alert('Gagal mengubah status konsultasi. Silakan coba lagi.');
    } finally {
      setUpdatingStatus(null);
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Arsitek</h1>
            <p className="text-gray-600">Kelola konsultasi desain pengguna</p>
          </div>
          
          <button 
            onClick={toggleAvailability}
            disabled={updatingAvailability}
            className={`flex items-center px-4 py-2 rounded-lg text-white ${
              isAvailable ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            {updatingAvailability ? (
              <FiLoader className="animate-spin mr-2" />
            ) : isAvailable ? (
              <FiToggleRight className="mr-2" />
            ) : (
              <FiToggleLeft className="mr-2" />
            )}
            {isAvailable ? 'Tersedia' : 'Tidak Tersedia'}
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
            <div className="text-center mt-4">
              <p className="text-gray-500">
                Pastikan status Anda diatur ke "Tersedia" untuk menerima konsultasi baru
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {consultations.map(consultation => (
              <div 
                key={consultation.id} 
                className="bg-white shadow-md rounded-lg overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold text-gray-900">{consultation.designData.name}</h2>
                    {getStatusBadge(consultation.status)}
                  </div>
                  
                  <p className="text-gray-600 mb-4">
                    {consultation.designData.description.length > 150 
                      ? consultation.designData.description.substring(0, 150) + '...' 
                      : consultation.designData.description}
                  </p>
                  
                  <div className="flex items-center text-gray-500 text-sm mb-4">
                    <FiUser className="mr-1" />
                    <span>Pengguna: {consultation.userId}</span>
                  </div>
                  
                  <p className="text-gray-500 text-sm mb-4">
                    Dibuat pada: {formatDate(consultation.createdAt)}
                  </p>
                  
                  <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
                    <button
                      onClick={() => router.push(`/Profile/consultations/${consultation.id}`)}
                      className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      <FiMessageSquare className="mr-1" />
                      {consultation.status === 'active' ? 'Lanjutkan Chat' : 'Lihat Detail'}
                    </button>
                    
                    {consultation.status === 'active' && (
                      <button
                        onClick={() => updateStatus(consultation.id!, 'completed')}
                        disabled={updatingStatus === consultation.id}
                        className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                      >
                        {updatingStatus === consultation.id ? (
                          <FiLoader className="animate-spin mr-1" />
                        ) : (
                          <FiCheckCircle className="mr-1" />
                        )}
                        Tandai Selesai
                      </button>
                    )}
                    
                    {consultation.status === 'pending' && (
                      <button
                        onClick={() => updateStatus(consultation.id!, 'active')}
                        disabled={updatingStatus === consultation.id}
                        className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                      >
                        {updatingStatus === consultation.id ? (
                          <FiLoader className="animate-spin mr-1" />
                        ) : (
                          <FiCheckCircle className="mr-1" />
                        )}
                        Terima Konsultasi
                      </button>
                    )}
                    
                    {(consultation.status === 'pending' || consultation.status === 'active') && (
                      <button
                        onClick={() => updateStatus(consultation.id!, 'cancelled')}
                        disabled={updatingStatus === consultation.id}
                        className="flex items-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                      >
                        {updatingStatus === consultation.id ? (
                          <FiLoader className="animate-spin mr-1" />
                        ) : (
                          <FiXCircle className="mr-1" />
                        )}
                        Batalkan
                      </button>
                    )}
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