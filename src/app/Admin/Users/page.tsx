"use client";

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, orderBy, limit, getDoc, doc } from 'firebase/firestore';
import { isAdmin, setUserAsAdmin, removeUserAsAdmin } from '@/services/adminService';
import { useRouter } from 'next/navigation';
import { app, db } from '@/firebase';
import Link from 'next/link';
import { ChevronLeft, Search } from 'lucide-react';

const auth = getAuth(app);

interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  joinDate: string;
}

export default function UserManagement() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAdminStatus = async (userId: string) => {
      const adminStatus = await isAdmin(userId);
      setAuthorized(adminStatus);

      if (!adminStatus) {
        // Redirect non-admin users to home page
        router.push('/');
      } else {
        // Load users data if admin
        fetchUsers();
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        checkAdminStatus(user.uid);
      } else {
        setLoading(false);
        setAuthorized(false);
        router.push('/Login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const usersCollection = collection(db, 'profiles');
      const q = query(usersCollection, orderBy('createdAt', 'desc'), limit(50));
      const snapshot = await getDocs(q);

      const userData: User[] = [];
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        const userId = docSnapshot.id;
        
        // Check if user is admin either by isAdmin flag or role="admin"
        let adminStatus = data.isAdmin === true || data.role === "admin";
        
        // Also check users collection for role="admin"
        if (!adminStatus) {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists() && userDoc.data().role === "admin") {
            adminStatus = true;
          }
        }

        userData.push({
          id: userId,
          email: data.email || 'No email',
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'No name',
          isAdmin: adminStatus,
          joinDate: data.createdAt || 'Unknown'
        });
      }

      setUsers(userData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (userId: string, makeAdmin: boolean) => {
    try {
      setProcessingUser(userId);
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        alert('You must be logged in to perform this action');
        return;
      }

      if (makeAdmin) {
        await setUserAsAdmin(userId);
      } else {
        await removeUserAsAdmin(userId);
      }

      // Update the users list
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, isAdmin: makeAdmin } 
            : user
        )
      );
    } catch (error) {
      console.error('Error updating admin status:', error);
      alert('Failed to update admin status');
    } finally {
      setProcessingUser(null);
    }
  };

  const handleSetUserRole = async (userId: string, role: "admin" | "user") => {
    try {
      setProcessingUser(userId);
      
      if (role === "admin") {
        await setUserAsAdmin(userId);
      } else {
        await removeUserAsAdmin(userId);
      }
      
      // Refresh the users list
      fetchUsers();
    } catch (error) {
      console.error("Error updating user role:", error);
      alert('Failed to update user role');
    } finally {
      setProcessingUser(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F6EC]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data pengguna...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null; // This will never show as we redirect unauthorized users
  }

  return (
    <div className="min-h-screen bg-[#F6F6EC] pt-16 pb-24">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <Link href="/Admin" className="inline-flex items-center text-amber-800 hover:text-amber-700">
            <ChevronLeft size={20} />
            <span>Kembali ke Dashboard</span>
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-md p-8">
          <h1 className="text-3xl font-bold text-amber-800 mb-8">Manajemen Pengguna</h1>
          
          {/* Search */}
          <div className="relative mb-8">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={20} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Cari pengguna..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal Bergabung</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Admin</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      {searchQuery ? 'Tidak ada pengguna yang cocok dengan pencarian.' : 'Tidak ada pengguna yang ditemukan.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(user.joinDate).toLocaleDateString('id-ID')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.isAdmin 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.isAdmin ? 'Admin' : 'Pengguna'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2">
                          {user.isAdmin ? (
                            <button
                              onClick={() => handleSetUserRole(user.id, "user")}
                              className="text-red-600 hover:text-red-900"
                            >
                              Remove Admin
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSetUserRole(user.id, "admin")}
                              className="text-green-600 hover:text-green-900"
                            >
                              Make Admin
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 