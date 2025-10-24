"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, LogOut, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function ManageUsers() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    sellerUsers: 0,
    buyerUsers: 0,
  });
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      router.replace("/");
      return;
    }

    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/profiles"); // Removed x-user-role header
        const data = await res.json();
        console.log("API Response for /api/profiles:", data); // Debug log
        if (data.success) {
          const usersData = data.data.profiles || [];
          setUsers(usersData);
          setStats({
            totalUsers: usersData.length,
            sellerUsers: usersData.filter((u: any) => u.role === "seller" || u.role === "both").length,
            buyerUsers: usersData.filter((u: any) => u.role === "buyer" || u.role === "both").length,
          });
        } else {
          console.error("API error:", data.error);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user, router]);

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const handleDelete = (id: string) => {
    setDeleteUserId(id);
    setIsDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteUserId) return;

    try {
      const res = await fetch(`/api/profiles/${deleteUserId}`, {
        method: "DELETE",
      }); // Removed x-user-role header
      const data = await res.json();
      console.log("Delete API Response:", data); // Debug log
      if (data.success) {
        setUsers(users.filter((user) => user.id !== deleteUserId));
        const userToDelete = users.find((u) => u.id === deleteUserId);
        setStats((prev) => ({
          ...prev,
          totalUsers: prev.totalUsers - 1,
          sellerUsers: prev.sellerUsers - (userToDelete?.role === "seller" || userToDelete?.role === "both" ? 1 : 0),
          buyerUsers: prev.buyerUsers - (userToDelete?.role === "buyer" || userToDelete?.role === "both" ? 1 : 0),
        }));
        setIsDialogOpen(false);
        setDeleteUserId(null);
      } else {
        console.error("Delete error:", data.error);
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  const cancelDelete = () => {
    setIsDialogOpen(false);
    setDeleteUserId(null);
  };

  const filteredUsers = users.filter((user) => {
    if (filter === "all") return true;
    if (filter === "seller") return user.role === "seller" || user.role === "both";
    if (filter === "buyer") return user.role === "buyer" || user.role === "both";
    return true;
  });

  const displayName = user?.fname || user?.email?.split("@")[0] || "Admin";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-corporate-700 via-corporate-600 to-corporate-500 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo + Branding */}
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                <img
                  src="/briskon-auction-horizontal-logo-white.png"
                  alt="Briskon Auction Logo"
                  className="h-10 w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder-logo.png";
                  }}
                />
              </div>
              <div className="text-white font-semibold text-xl tracking-tight">
                Auction Wizard
              </div>
            </div>

            {/* User Info + Logout + Dashboard */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-white">
                  Welcome, {displayName}
                </span>
                <span className="px-3 py-1 text-xs font-medium bg-gradient-to-r from-corporate-100 to-corporate-200 text-corporate-800 dark:from-gray-700 dark:to-gray-600 dark:text-gray-200 rounded-full shadow-sm">
                  {user?.role.charAt(0).toUpperCase() + user?.role.slice(1) || "Admin"}
                </span>
              </div>
              <Button
                variant="outline"
                onClick={() => handleNavigate("/admin-panel")}
                className="flex items-center text-sm font-medium text-white border-corporate-300 dark:border-gray-600 bg-transparent hover:bg-corporate-800/20 dark:hover:bg-gray-700/20 rounded-lg transition-all duration-200"
              >
                <Eye className="w-5 h-5 mr-2" />
                Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center text-sm font-medium text-white border-corporate-300 dark:border-gray-600 bg-transparent hover:bg-corporate-800/20 dark:hover:bg-gray-700/20 rounded-lg transition-all duration-200"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Manage Users
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              View and manage user accounts
            </p>
          </div>
          <div className="flex space-x-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All</option>
              <option value="seller">Sellers</option>
              <option value="buyer">Buyers</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Users
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.totalUsers}
                  </p>
                </div>
                <Eye className="w-8 h-8 text-corporate-600 dark:text-corporate-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Seller Users
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.sellerUsers}
                  </p>
                </div>
                <Eye className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Buyer Users
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.buyerUsers}
                  </p>
                </div>
                <Eye className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <p className="text-center text-gray-600 dark:text-gray-400">Loading...</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                        Name
                      </th>
                      <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                        Email
                      </th>
                      <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                        Role
                      </th>
                      <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                        Bid Count
                      </th>
                      <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                        Auctions
                      </th>
                      <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="p-4">{user.fname}</td>
                        <td className="p-4">{user.email}</td>
                        <td className="p-4">{user.role}</td>
                        <td className="p-4">{user.role === "seller" ? "N/A" : user.bidCount}</td>
                        <td className="p-4">{user.role === "buyer" ? "N/A" : user.auctionCount}</td>
                        <td className="p-4">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredUsers.length === 0 && (
                <p className="text-center text-gray-600 dark:text-gray-400 p-4">
                  No users found.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to delete this user? This action will also delete all associated
            auctions and bids, including their images and documents. This cannot be undone.
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
