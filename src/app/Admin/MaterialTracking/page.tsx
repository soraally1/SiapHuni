"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { isAdmin } from '@/services/adminService';
import { collection, query, getDocs, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '@/firebase';
import Link from 'next/link';
import { 
  ChevronLeft,
  Package,
  Truck,
  CheckCircle,
  Search,
  AlertCircle
} from 'lucide-react';

interface Material {
  name: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  estimatedArrival?: string;
  quantity: number;
  unit: string;
  lastUpdated: Date;
  notes?: string;
  index?: number;
}

interface MaterialTracking {
  id: string;
  purchaseId: string;
  houseName: string;
  customerName: string;
  materials: Material[];
}

interface MaterialStats {
  total: number;
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
}

export default function MaterialTrackingPage() {
  const [materialTrackings, setMaterialTrackings] = useState<MaterialTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const router = useRouter();
  const auth = getAuth();

  // Calculate material statistics
  const stats: MaterialStats = materialTrackings.reduce((acc, tracking) => {
    tracking.materials.forEach(material => {
      acc.total++;
      acc[material.status]++;
    });
    return acc;
  }, {
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0
  });

  useEffect(() => {
    const checkAdminAndLoadData = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push('/Login');
        return;
      }

      const adminStatus = await isAdmin(user.uid);
      if (!adminStatus) {
        router.push('/');
        return;
      }

      try {
        const trackingsRef = collection(db, 'purchases');
        const trackingsQuery = query(trackingsRef, where('status', '!=', 'cancelled'));
        const trackingsSnapshot = await getDocs(trackingsQuery);
        
        const trackingsData: MaterialTracking[] = [];
        trackingsSnapshot.forEach((doc) => {
          const data = doc.data();
          trackingsData.push({
            id: doc.id,
            purchaseId: doc.id,
            houseName: data.houseName,
            customerName: data.userDetails.fullName,
            materials: data.materials || []
          });
        });

        setMaterialTrackings(trackingsData);
      } catch (err) {
        console.error('Error loading material trackings:', err);
        setError('Failed to load material trackings');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndLoadData();
  }, [router, auth]);

  const updateMaterialStatus = async (
    trackingId: string,
    materialIndex: number,
    newStatus: Material['status']
  ) => {
    try {
      const trackingRef = doc(db, 'purchases', trackingId);
      const tracking = materialTrackings.find(t => t.id === trackingId);
      
      if (!tracking) return;

      const updatedMaterials = [...tracking.materials];
      updatedMaterials[materialIndex] = {
        ...updatedMaterials[materialIndex],
        status: newStatus,
        lastUpdated: new Date()
      };

      await updateDoc(trackingRef, {
        materials: updatedMaterials
      });

      // Update local state
      setMaterialTrackings(prev => prev.map(t => {
        if (t.id === trackingId) {
          return { ...t, materials: updatedMaterials };
        }
        return t;
      }));
    } catch (err) {
      console.error('Error updating material status:', err);
      setError('Failed to update material status');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTrackings = materialTrackings.filter(tracking => {
    const matchesSearch = 
      tracking.houseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tracking.customerName.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    
    return matchesSearch && tracking.materials.some(m => m.status === statusFilter);
  });

  const handleBatchStatusUpdate = async (newStatus: Material['status']) => {
    try {
      const updates = Array.from(selectedItems).map(async (itemKey) => {
        const [trackingId, materialIndex] = itemKey.split('-');
        await updateMaterialStatus(trackingId, parseInt(materialIndex), newStatus);
      });

      await Promise.all(updates);
      setSelectedItems(new Set());
    } catch (err) {
      console.error('Error updating batch status:', err);
      setError('Failed to update batch status');
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['House Name', 'Customer Name', 'Material Name', 'Quantity', 'Unit', 'Status', 'Estimated Arrival', 'Last Updated'],
      ...filteredTrackings.flatMap(tracking => 
        tracking.materials.map(material => [
          tracking.houseName,
          tracking.customerName,
          material.name,
          material.quantity.toString(),
          material.unit,
          material.status,
          material.estimatedArrival || '',
          new Date(material.lastUpdated).toLocaleDateString('id-ID')
        ])
      )
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `material_tracking_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const sortedAndFilteredTrackings = filteredTrackings
    .map(tracking => ({
      ...tracking,
      materials: tracking.materials
        .map((material, index) => ({ ...material, index }))
        .sort((a, b) => {
          if (sortBy === 'date') {
            return sortOrder === 'desc'
              ? new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
              : new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
          } else {
            const statusOrder = { delivered: 3, shipped: 2, processing: 1, pending: 0 };
            return sortOrder === 'desc'
              ? statusOrder[b.status] - statusOrder[a.status]
              : statusOrder[a.status] - statusOrder[b.status];
          }
        })
    }))
    .sort((a, b) => {
      const aDate = new Date(a.materials[0]?.lastUpdated || 0).getTime();
      const bDate = new Date(b.materials[0]?.lastUpdated || 0).getTime();
      return sortOrder === 'desc' ? bDate - aDate : aDate - bDate;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F6EC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#594C1A] border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F6F6EC] flex flex-col items-center justify-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => router.back()}
          className="flex items-center text-[#594C1A] hover:text-[#938656]"
        >
          <ChevronLeft size={20} className="mr-2" />
          <span>Kembali</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F6EC]">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/Admin" className="inline-flex items-center text-amber-800 hover:text-amber-700">
              <ChevronLeft size={20} />
              <span>Kembali ke Panel Admin</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tracking Material</h1>
          <p className="mt-2 text-gray-600">Kelola dan pantau status pengiriman material</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total Material</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">Menunggu</p>
            <p className="text-2xl font-semibold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">Diproses</p>
            <p className="text-2xl font-semibold text-blue-600">{stats.processing}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">Dikirim</p>
            <p className="text-2xl font-semibold text-indigo-600">{stats.shipped}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">Terkirim</p>
            <p className="text-2xl font-semibold text-green-600">{stats.delivered}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Cari berdasarkan nama rumah atau pelanggan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#594C1A] focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#594C1A] focus:border-transparent"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Menunggu</option>
                <option value="processing">Diproses</option>
                <option value="shipped">Dikirim</option>
                <option value="delivered">Terkirim</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'status')}
                className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#594C1A] focus:border-transparent"
              >
                <option value="date">Urutkan berdasarkan Tanggal</option>
                <option value="status">Urutkan berdasarkan Status</option>
              </select>
              <button
                onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            <div className="flex gap-2">
              {selectedItems.size > 0 && (
                <div className="flex gap-2">
                  <select
                    onChange={(e) => handleBatchStatusUpdate(e.target.value as Material['status'])}
                    className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#594C1A] focus:border-transparent"
                  >
                    <option value="">Update Status Terpilih</option>
                    <option value="pending">Set Menunggu</option>
                    <option value="processing">Set Diproses</option>
                    <option value="shipped">Set Dikirim</option>
                    <option value="delivered">Set Terkirim</option>
                  </select>
                  <button
                    onClick={() => setSelectedItems(new Set())}
                    className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-600"
                  >
                    Batal ({selectedItems.size})
                  </button>
                </div>
              )}
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-[#594C1A] text-white rounded-lg hover:bg-[#938656] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#594C1A]"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Tracking List */}
        <div className="space-y-6">
          {sortedAndFilteredTrackings.map((tracking) => (
            <div
              key={tracking.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              <div className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{tracking.houseName}</h3>
                    <p className="text-gray-600">Pelanggan: {tracking.customerName}</p>
                  </div>
                  <Link
                    href={`/Admin/MaterialTracking/${tracking.id}`}
                    className="mt-2 sm:mt-0 text-[#594C1A] hover:text-[#938656]"
                  >
                    Kelola Material
                  </Link>
                </div>

                <div className="divide-y">
                  {tracking.materials.map((material, index) => (
                    <div key={index} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(`${tracking.id}-${material.index}`)}
                          onChange={(e) => {
                            const itemKey = `${tracking.id}-${material.index}`;
                            const newSelected = new Set(selectedItems);
                            if (e.target.checked) {
                              newSelected.add(itemKey);
                            } else {
                              newSelected.delete(itemKey);
                            }
                            setSelectedItems(newSelected);
                          }}
                          className="h-4 w-4 text-[#594C1A] focus:ring-[#594C1A] border-gray-300 rounded"
                        />
                        <div className="flex-1 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex items-center">
                            <Package className="w-5 h-5 text-[#594C1A] mr-3" />
                            <div>
                              <h4 className="font-medium text-gray-900">{material.name}</h4>
                              <p className="text-sm text-gray-500">
                                {material.quantity} {material.unit}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <select
                              value={material.status}
                              onChange={(e) => updateMaterialStatus(
                                tracking.id,
                                material.index,
                                e.target.value as Material['status']
                              )}
                              className="px-3 py-1 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#594C1A] focus:border-transparent"
                            >
                              <option value="pending">Menunggu</option>
                              <option value="processing">Diproses</option>
                              <option value="shipped">Dikirim</option>
                              <option value="delivered">Terkirim</option>
                            </select>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(material.status)}`}>
                              {material.status === 'delivered' && <CheckCircle className="w-4 h-4 mr-1 inline" />}
                              {material.status === 'shipped' && <Truck className="w-4 h-4 mr-1 inline" />}
                              {material.status === 'processing' && <Package className="w-4 h-4 mr-1 inline" />}
                              {material.status === 'delivered' ? 'Terkirim' :
                               material.status === 'shipped' ? 'Dalam Pengiriman' :
                               material.status === 'processing' ? 'Diproses' : 'Menunggu'}
                            </span>
                          </div>
                        </div>
                      </div>
                      {material.estimatedArrival && (
                        <p className="mt-2 text-sm text-gray-500">
                          Estimasi tiba: {new Date(material.estimatedArrival).toLocaleDateString('id-ID')}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-gray-500">
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
                </div>
              </div>
            </div>
          ))}

          {sortedAndFilteredTrackings.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Tidak ada material ditemukan</h3>
              <p className="text-gray-600">
                Coba ubah filter atau kata kunci pencarian
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 