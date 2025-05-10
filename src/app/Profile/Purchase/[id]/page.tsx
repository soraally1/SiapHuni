"use client";

import { useState, useEffect, use } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import Navbar from '@/components/Navbar';
import {
  FileText,
  Package,
  Truck,
  CheckCircle,
  Download,
  ChevronLeft,
  Home as HomeIcon,
  Ruler,
  Users,
  Clock,
  AlertCircle
} from 'lucide-react';
import { createSupportThread } from '@/services/supportService';

interface FirestoreMaterial {
  name: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  estimatedArrival?: string;
  quantity: number;
  unit: string;
  lastUpdated: Timestamp;
  notes?: string;
}

interface Material extends Omit<FirestoreMaterial, 'lastUpdated'> {
  lastUpdated: Date;
}

interface Blueprint {
  name: string;
  fileUrl: string;
  description?: string;
}

interface PurchaseDetails {
  id: string;
  status: 'pending' | 'completed' | 'cancelled';
  purchaseDate: Timestamp;
  totalAmount: number;
  houseId: string;
  houseName: string;
  houseImage: string;
  userDetails: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
  };
  materials: Material[];
  constructionGuide?: {
    title: string;
    fileUrl: string;
  };
  blueprints: Blueprint[];
  houseDetails?: {
    type: string;
    area: string;
    capacity: string;
    buildTime: string;
  };
}

export default function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [purchase, setPurchase] = useState<PurchaseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supportLoading, setSupportLoading] = useState(false);

  useEffect(() => {
    const loadPurchaseDetails = async () => {
      if (!user) {
        router.push('/Login');
        return;
      }

      try {
        // Get purchase details
        const purchaseRef = doc(db, 'purchases', resolvedParams.id);
        const purchaseDoc = await getDoc(purchaseRef);
        
        if (!purchaseDoc.exists()) {
          setError('Purchase not found');
          return;
        }

        const data = purchaseDoc.data();

        // Get house details to fetch blueprints
        const houseRef = doc(db, 'houses', data.houseId);
        const houseDoc = await getDoc(houseRef);
        
        if (!houseDoc.exists()) {
          setError('House details not found');
          return;
        }

        const houseData = houseDoc.data();
        
        // Convert Firestore Timestamp to Date for materials
        const materials = data.materials?.map((material: FirestoreMaterial) => ({
          ...material,
          lastUpdated: material.lastUpdated?.toDate() || new Date()
        })) || [];

        // Get blueprints from house data
        const blueprints = houseData.blueprints?.map((blueprint: Blueprint) => ({
          ...blueprint,
          fileUrl: blueprint.fileUrl || '',
          name: blueprint.name || 'Untitled Blueprint'
        })) || [];

        setPurchase({
          ...data as PurchaseDetails,
          id: purchaseDoc.id,
          materials,
          blueprints,
          houseDetails: {
            type: houseData.tipe || 'Modern',
            area: `${houseData.luas || 0} m²`,
            capacity: `${houseData.specifications?.bedroomCount || 0} Kamar`,
            buildTime: `${houseData.durasi || 0} Hari`
          }
        });
      } catch (err) {
        console.error('Error loading purchase:', err);
        setError('Failed to load purchase details');
      } finally {
        setLoading(false);
      }
    };

    loadPurchaseDetails();
  }, [resolvedParams.id, router, user]);

  const getStatusColor = (status: FirestoreMaterial['status']) => {
    switch (status) {
      case 'delivered':
        return 'text-green-500';
      case 'shipped':
        return 'text-blue-500';
      case 'processing':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = (status: FirestoreMaterial['status']) => {
    switch (status) {
      case 'delivered':
        return 'Terkirim';
      case 'shipped':
        return 'Dalam Pengiriman';
      case 'processing':
        return 'Sedang Diproses';
      default:
        return 'Menunggu';
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleContactSupport = async () => {
    if (!user || !purchase) return;
    
    try {
      setSupportLoading(true);
      
      // Get user name from appropriate properties
      const userName = user.displayName || 
                       (user.email ? user.email.split('@')[0] : 'User');
      
      // Create a support thread for this purchased house
      const { success, threadId, error: supportError } = await createSupportThread(
        user.uid,
        userName,
        user.email || '',
        `Support Request: ${purchase.houseName}`,
        `I need help with my purchased house "${purchase.houseName}" (Purchase ID: ${purchase.id})`,
        purchase.houseId
      );
      
      if (success && threadId) {
        // Redirect to the support thread
        router.push(`/support/${threadId}`);
      } else {
        setError(supportError || 'Failed to create support thread');
      }
    } catch (err) {
      console.error('Error creating support thread:', err);
      setError('An unexpected error occurred while contacting support');
    } finally {
      setSupportLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#F6F6EC] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#594C1A] border-t-transparent"></div>
        </div>
      </>
    );
  }

  if (error || !purchase) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#F6F6EC] flex flex-col items-center justify-center">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <p className="text-red-600 mb-4">{error || 'Purchase not found'}</p>
          <button
            onClick={() => router.back()}
            className="flex items-center text-[#594C1A] hover:text-[#938656]"
          >
            <ChevronLeft size={20} className="mr-2" />
            <span>Kembali</span>
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F6F6EC] pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center text-[#594C1A] hover:text-[#938656]"
            >
              <ChevronLeft size={20} className="mr-2" />
              <span>Kembali ke Profil</span>
            </button>
            <div className="flex items-center">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                purchase.status === 'completed' 
                  ? 'bg-green-500 text-white' 
                  : purchase.status === 'pending'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-red-500 text-white'
              }`}>
                {purchase.status === 'completed' ? 'Selesai' : 
                 purchase.status === 'pending' ? 'Menunggu' : 'Dibatalkan'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* House Details */}
            <div className="lg:col-span-2 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-lg overflow-hidden"
              >
                <div className="relative h-64">
                  <img
                    src={purchase.houseImage}
                    alt={purchase.houseName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-6 left-6">
                    <h1 className="text-2xl font-bold text-white">{purchase.houseName}</h1>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="flex items-center">
                      <HomeIcon className="w-5 h-5 text-[#594C1A] mr-2" />
                      <span className="text-gray-600">Type {purchase.houseDetails?.type}</span>
                    </div>
                    <div className="flex items-center">
                      <Ruler className="w-5 h-5 text-[#594C1A] mr-2" />
                      <span className="text-gray-600">{purchase.houseDetails?.area}</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-[#594C1A] mr-2" />
                      <span className="text-gray-600">{purchase.houseDetails?.capacity}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-5 h-5 text-[#594C1A] mr-2" />
                      <span className="text-gray-600">{purchase.houseDetails?.buildTime}</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Material Tracking */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-lg p-6"
              >
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Status Material</h2>
                <div className="space-y-6">
                  {purchase.materials?.map((material, index) => (
                    <div key={index} className="border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <Package className="w-5 h-5 text-[#594C1A] mr-3" />
                          <div>
                            <h3 className="font-medium text-gray-800">{material.name}</h3>
                            <p className="text-sm text-gray-500">
                              {material.quantity} {material.unit}
                            </p>
                          </div>
                        </div>
                        <span className={`flex items-center ${getStatusColor(material.status)}`}>
                          {material.status === 'delivered' && <CheckCircle className="w-4 h-4 mr-2" />}
                          {material.status === 'shipped' && <Truck className="w-4 h-4 mr-2" />}
                          {material.status === 'processing' && <Package className="w-4 h-4 mr-2" />}
                          {getStatusText(material.status)}
                        </span>
                      </div>
                      {material.estimatedArrival && (
                        <p className="text-sm text-gray-500">
                          Estimasi tiba: {new Date(material.estimatedArrival).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      )}
                      {material.notes && (
                        <p className="text-sm text-gray-500 mt-1">
                          Catatan: {material.notes}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        Terakhir diupdate: {new Date(material.lastUpdated).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  ))}

                  {(!purchase.materials || purchase.materials.length === 0) && (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">Belum ada material yang ditambahkan</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Construction Guide */}
              {purchase.constructionGuide && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-2xl shadow-lg p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Panduan Konstruksi</h2>
                  <div className="p-4 bg-[#594C1A]/5 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-[#594C1A] mr-3" />
                        <span className="text-gray-700">{purchase.constructionGuide.title}</span>
                      </div>
                      <button 
                        onClick={() => handleDownload(purchase.constructionGuide!.fileUrl, 'panduan-konstruksi.pdf')}
                        className="p-2 text-[#594C1A] hover:text-[#938656]"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Blueprints */}
              {purchase.blueprints && purchase.blueprints.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-2xl shadow-lg p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Blueprint</h2>
                  <div className="space-y-3">
                    {purchase.blueprints.map((blueprint, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-[#594C1A]/5 rounded-xl">
                        <div className="flex items-center flex-1">
                          <FileText className="w-5 h-5 text-[#594C1A] mr-3" />
                          <div>
                            <span className="text-gray-700 font-medium">{blueprint.name}</span>
                            {blueprint.description && (
                              <p className="text-sm text-gray-500 mt-1">{blueprint.description}</p>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDownload(blueprint.fileUrl, `${blueprint.name.toLowerCase().replace(/\s+/g, '-')}.pdf`)}
                          className="p-2 text-[#594C1A] hover:text-[#938656] ml-4"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Contact Support */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-2xl shadow-lg p-6"
              >
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Butuh Bantuan?</h2>
                <p className="text-gray-600 mb-4">
                  Tim support kami siap membantu Anda dengan pertanyaan seputar material dan konstruksi
                </p>
                <button 
                  onClick={handleContactSupport}
                  disabled={supportLoading}
                  className="w-full py-3 bg-[#594C1A] text-white rounded-xl font-medium hover:bg-[#938656] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {supportLoading ? 'Memproses...' : 'Hubungi Support'}
                </button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 