"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { isAdmin } from '@/services/adminService';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import Link from 'next/link';
import { 
  ChevronLeft,
  Package,
  Truck,
  CheckCircle,
  Plus,
  Calendar,
  AlertCircle,
  Save,
  Trash2
} from 'lucide-react';

interface Material {
  name: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  estimatedArrival?: string;
  quantity: number;
  unit: string;
  lastUpdated: Date;
  notes?: string;
}

interface PurchaseDetails {
  id: string;
  houseName: string;
  customerName: string;
  userDetails: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
  };
  materials: Material[];
}

export default function MaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const auth = getAuth();
  const [purchase, setPurchase] = useState<PurchaseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newMaterial, setNewMaterial] = useState<Material>({
    name: '',
    status: 'pending',
    quantity: 0,
    unit: '',
    lastUpdated: new Date(),
    notes: ''
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
        const purchaseRef = doc(db, 'purchases', resolvedParams.id);
        const purchaseDoc = await getDoc(purchaseRef);
        
        if (!purchaseDoc.exists()) {
          setError('Purchase not found');
          return;
        }

        const data = purchaseDoc.data();
        setPurchase({
          id: purchaseDoc.id,
          houseName: data.houseName,
          customerName: data.userDetails.fullName,
          userDetails: data.userDetails,
          materials: data.materials || []
        });
      } catch (err) {
        console.error('Error loading purchase:', err);
        setError('Failed to load purchase details');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndLoadData();
  }, [router, auth, resolvedParams.id]);

  const handleAddMaterial = async () => {
    if (!purchase || !newMaterial.name || !newMaterial.unit || newMaterial.quantity <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      const updatedMaterials = [...purchase.materials, { ...newMaterial, lastUpdated: new Date() }];
      
      await updateDoc(doc(db, 'purchases', purchase.id), {
        materials: updatedMaterials
      });

      setPurchase(prev => prev ? {
        ...prev,
        materials: updatedMaterials
      } : null);

      setNewMaterial({
        name: '',
        status: 'pending',
        quantity: 0,
        unit: '',
        lastUpdated: new Date(),
        notes: ''
      });
    } catch (err) {
      console.error('Error adding material:', err);
      setError('Failed to add material');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMaterial = async (index: number, updatedMaterial: Material) => {
    if (!purchase) return;

    try {
      setSaving(true);
      const updatedMaterials = [...purchase.materials];
      updatedMaterials[index] = {
        ...updatedMaterial,
        lastUpdated: new Date()
      };

      await updateDoc(doc(db, 'purchases', purchase.id), {
        materials: updatedMaterials
      });

      setPurchase(prev => prev ? {
        ...prev,
        materials: updatedMaterials
      } : null);
    } catch (err) {
      console.error('Error updating material:', err);
      setError('Failed to update material');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMaterial = async (index: number) => {
    if (!purchase) return;

    try {
      setSaving(true);
      const updatedMaterials = purchase.materials.filter((_, i) => i !== index);

      await updateDoc(doc(db, 'purchases', purchase.id), {
        materials: updatedMaterials
      });

      setPurchase(prev => prev ? {
        ...prev,
        materials: updatedMaterials
      } : null);
    } catch (err) {
      console.error('Error deleting material:', err);
      setError('Failed to delete material');
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F6EC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#594C1A] border-t-transparent"></div>
      </div>
    );
  }

  if (error || !purchase) {
    return (
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
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F6EC]">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/Admin/MaterialTracking" className="inline-flex items-center text-amber-800 hover:text-amber-700">
              <ChevronLeft size={20} />
              <span>Kembali ke Daftar Material</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Detail Material</h1>
          <div className="mt-2 space-y-1">
            <p className="text-lg text-gray-600">{purchase.houseName}</p>
            <p className="text-gray-600">Pelanggan: {purchase.customerName}</p>
            <p className="text-gray-600">Alamat: {purchase.userDetails.address}</p>
          </div>
        </div>

        {/* Add New Material Form */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Tambah Material Baru</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Material</label>
              <input
                type="text"
                value={newMaterial.name}
                onChange={(e) => setNewMaterial(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#594C1A] focus:border-transparent"
                placeholder="Contoh: Semen Portland"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah</label>
              <input
                type="number"
                value={newMaterial.quantity}
                onChange={(e) => setNewMaterial(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#594C1A] focus:border-transparent"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Satuan</label>
              <input
                type="text"
                value={newMaterial.unit}
                onChange={(e) => setNewMaterial(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#594C1A] focus:border-transparent"
                placeholder="Contoh: sak, batang"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimasi Tiba</label>
              <input
                type="date"
                value={newMaterial.estimatedArrival || ''}
                onChange={(e) => setNewMaterial(prev => ({ ...prev, estimatedArrival: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#594C1A] focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea
              value={newMaterial.notes || ''}
              onChange={(e) => setNewMaterial(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#594C1A] focus:border-transparent"
              rows={2}
              placeholder="Tambahkan catatan jika diperlukan"
            />
          </div>
          <div className="mt-4">
            <button
              onClick={handleAddMaterial}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 bg-[#594C1A] text-white rounded-lg hover:bg-[#938656] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#594C1A] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={20} className="mr-2" />
              <span>Tambah Material</span>
            </button>
          </div>
        </div>

        {/* Material List */}
        <div className="space-y-4">
          {purchase.materials.map((material, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              <div className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
                      onChange={(e) => handleUpdateMaterial(index, {
                        ...material,
                        status: e.target.value as Material['status']
                      })}
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
                    <button
                      onClick={() => handleDeleteMaterial(index)}
                      className="p-1 text-red-600 hover:text-red-800 focus:outline-none"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimasi Tiba</label>
                    <input
                      type="date"
                      value={material.estimatedArrival || ''}
                      onChange={(e) => handleUpdateMaterial(index, {
                        ...material,
                        estimatedArrival: e.target.value
                      })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#594C1A] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                    <input
                      type="text"
                      value={material.notes || ''}
                      onChange={(e) => handleUpdateMaterial(index, {
                        ...material,
                        notes: e.target.value
                      })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#594C1A] focus:border-transparent"
                      placeholder="Tambahkan catatan"
                    />
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Terakhir diupdate: {new Date(material.lastUpdated).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}

          {purchase.materials.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Belum ada material</h3>
              <p className="text-gray-600">
                Tambahkan material menggunakan form di atas
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 