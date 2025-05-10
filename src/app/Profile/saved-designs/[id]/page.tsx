"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getGeneratedDesign, GeneratedDesign } from '@/services/designService';
import { createConsultation } from '@/services/consultationService';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiLoader, FiHome, FiDollarSign, FiFeather, FiCheck, FiLayers, FiMessageSquare } from 'react-icons/fi';
import Navbar from '@/components/Navbar';

export default function DesignDetailPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth({ redirectToLogin: true });
  const router = useRouter();
  const designId = params.id;
  
  const [design, setDesign] = useState<GeneratedDesign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consultLoading, setConsultLoading] = useState(false);
  const [consultError, setConsultError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (user && designId) {
      fetchDesignDetails();
    }
  }, [user, authLoading, designId]);

  const fetchDesignDetails = async () => {
    if (!user || !designId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getGeneratedDesign(user.uid, designId);
      
      if (result.success && result.design) {
        setDesign(result.design);
      } else {
        setError(result.error || 'Desain tidak ditemukan');
      }
    } catch (err) {
      console.error('Error fetching design:', err);
      setError('Terjadi kesalahan saat mengambil data desain');
    } finally {
      setLoading(false);
    }
  };

  const handleConsultArchitect = async () => {
    if (!user || !design) return;
    
    setConsultLoading(true);
    setConsultError(null);
    
    try {
      const result = await createConsultation(user.uid, designId, design);
      
      if (result.success) {
        // Redirect to the consultation chat page
        router.push(`/Profile/consultations/${result.consultationId}`);
      } else {
        setConsultError(result.error || 'Gagal membuat permintaan konsultasi');
      }
    } catch (err) {
      console.error('Error creating consultation:', err);
      setConsultError('Terjadi kesalahan saat membuat permintaan konsultasi');
    } finally {
      setConsultLoading(false);
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
        <button 
          onClick={() => router.back()}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          <FiArrowLeft className="mr-2" />
          Kembali ke Daftar Desain
        </button>
        
        {authLoading || loading ? (
          <div className="flex items-center justify-center h-64">
            <FiLoader className="animate-spin text-blue-600 w-10 h-10" />
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        ) : design ? (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="p-8">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold text-gray-900">{design.name}</h1>
                
                <button
                  onClick={handleConsultArchitect}
                  disabled={consultLoading}
                  className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  {consultLoading ? (
                    <FiLoader className="animate-spin mr-2" />
                  ) : (
                    <FiMessageSquare className="mr-2" />
                  )}
                  Konsultasi dengan Arsitek
                </button>
              </div>
              
              {consultError && (
                <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {consultError}
                </div>
              )}
              
              <p className="text-gray-600 mb-6">Gaya: {design.style}</p>
              
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">Deskripsi</h2>
                <p className="text-gray-700">{design.description}</p>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center mb-3">
                  <FiDollarSign className="text-blue-600 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-800">Estimasi Harga</h2>
                </div>
                <p className="text-gray-700">{design.estimatedPrice}</p>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center mb-3">
                  <FiFeather className="text-blue-600 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-800">Fitur Utama</h2>
                </div>
                <ul className="list-disc pl-5 text-gray-700">
                  {design.keyFeatures.map((feature, index) => (
                    <li key={index} className="mb-1">{feature}</li>
                  ))}
                </ul>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="flex items-center mb-3">
                    <FiHome className="text-blue-600 mr-2" />
                    <h2 className="text-xl font-semibold text-gray-800">Eksterior</h2>
                  </div>
                  <ul className="list-disc pl-5 text-gray-700">
                    {design.characteristics.exterior.map((item, index) => (
                      <li key={index} className="mb-1">{item}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <div className="flex items-center mb-3">
                    <FiLayers className="text-blue-600 mr-2" />
                    <h2 className="text-xl font-semibold text-gray-800">Interior</h2>
                  </div>
                  <ul className="list-disc pl-5 text-gray-700">
                    {design.characteristics.interior.map((item, index) => (
                      <li key={index} className="mb-1">{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="flex items-center mb-3">
                    <FiLayers className="text-blue-600 mr-2" />
                    <h2 className="text-xl font-semibold text-gray-800">Material</h2>
                  </div>
                  <ul className="list-disc pl-5 text-gray-700">
                    {design.characteristics.materials.map((item, index) => (
                      <li key={index} className="mb-1">{item}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <div className="flex items-center mb-3">
                    <FiCheck className="text-blue-600 mr-2" />
                    <h2 className="text-xl font-semibold text-gray-800">Keberlanjutan</h2>
                  </div>
                  <ul className="list-disc pl-5 text-gray-700">
                    {design.characteristics.sustainability.map((item, index) => (
                      <li key={index} className="mb-1">{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center mb-3">
                  <FiCheck className="text-blue-600 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-800">Cocok Untuk</h2>
                </div>
                <ul className="list-disc pl-5 text-gray-700">
                  {design.suitability.map((item, index) => (
                    <li key={index} className="mb-1">{item}</li>
                  ))}
                </ul>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-500">Dibuat pada: {formatDate(design.createdAt)}</h3>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Prompt yang digunakan:</h3>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <p className="text-gray-700">{design.prompt}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
            Desain tidak ditemukan
          </div>
        )}
      </div>
    </div>
  );
} 