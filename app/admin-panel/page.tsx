"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Eye,
  Edit,
  LogOut,
  Users,
  Home,
  Building,
  Package,
  Gavel,
  Trophy,
  ShoppingCart,
  CreditCard,
  User,
  Key,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
} from "lucide-react";

// ----- Sample Data -----
const sampleApprovalData = {
  bidders: [
    {
      name: "Madhur",
      email: "uniyalmadhur@gmail.com",
      verified: "Yes",
      phone: "+91 9945017530",
      location: "New Jersey",
      type: "Individual",
      id: true,
    },
    {
      name: "Buyer2",
      email: "abc@gmail.com",
      verified: "No",
      phone: "+91 9945017530",
      location: "New Jersey",
      type: "Organisation",
      id: true,
    },
  ],
  s: [
    {
      name: "Seller1",
      email: "uniyalmadhur@gmail.com",
      verified: "Yes",
      phone: "+91 9945017530",
      location: "New Jersey",
      type: "Individual",
      id: true,
    },
    {
      name: "Seller2",
      email: "abc@gmail.com",
      verified: "No",
      phone: "+91 9945017530",
      location: "New Jersey",
      type: "Organisation",
      id: true,
    },
  ],
  auctions: [
    {
      name: "Watch",
      createdBy: "Seller1",
      type: "Forward",
      format: "Silent",
      start: "15th Oct 7:45",
      end: "20th Nov 22:30",
    },
    {
      name: "Book",
      createdBy: "Seller2",
      type: "Forward",
      format: "Standard",
      start: "15th Oct 7:45",
      end: "20th Nov 22:30",
    },
  ],
  buynow: [
    { name: "Watch2", createdBy: "Seller1", price: "$2300" },
    { name: "Table", createdBy: "Seller2", price: "$300" },
  ],
};

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "";
  const [collapsed, setCollapsed] = useState(false);
  const [approvalFilter, setApprovalFilter] = useState("bidders");
  const [winnerFilter, setWinnerFilter] = useState("Forward");

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/");
    }
  }, [user, router]);

  if (!user || user.role !== "admin") return null;

  const displayName =
    user.fname || user.lname || user.email?.split("@")[0] || "Admin";

  const handleNavigate = (path: string) => router.push(path);

  const navGroups = [
    { items: [{ label: "Dashboard", href: "/admin-panel/dashboard", Icon: Home }] },
    {
      items: [
        { label: "Bidders", href: "/admin-panel/bidders", Icon: Users },
        { label: "Suppliers", href: "/admin-panel/sellers", Icon: Building },
      ],
    },
    {
      items: [
        { label: "Products", href: "/admin-panel/products", Icon: Package },
        { label: "Auctions", href: "/admin-panel/auctions", Icon: Gavel },
        { label: "Winners", href: "/admin-panel/winners", Icon: Trophy },
        { label: "Buy Now", href: "/admin-panel/buy-now", Icon: ShoppingCart },
        { label: "Purchases", href: "/admin-panel/purchases", Icon: CreditCard },
      ],
    },
    {
      items: [
        { label: "Profile", href: "/admin-panel/profile", Icon: User },
        { label: "Change Password", href: "/admin-panel/change-password", Icon: Key },
      ],
    },
  ];

  // ----- Approval Requests table -----
  const renderApprovalTable = () => {
    switch (approvalFilter) {
      case "bidders":
        return (
          <table className="w-full text-xs">
            <thead className="text-gray-600 border-b bg-gray-50">
              <tr>
                <th className="p-2 text-left">Bidder</th>
                <th>Email</th>
                <th>Email Verification</th>
                <th>Phone</th>
                <th>Location</th>
                <th>Type</th>
                <th>ID Proof</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sampleApprovalData.bidders.map((b, i) => (
                <tr key={i} className="border-b hover:bg-blue-50 transition-colors">
                  <td className="p-2">{b.name}</td>
                  <td>{b.email}</td>
                  <td>{b.verified}</td>
                  <td>{b.phone}</td>
                  <td>{b.location}</td>
                  <td>{b.type}</td>
                  <td>{b.id && <FileText className="w-4 h-4 text-gray-600" />}</td>
                  <td className="space-x-1">
                    <Button size="sm" className="bg-green-100 text-green-700 hover:bg-green-200 text-xs">Approve</Button>
                    <Button size="sm" className="bg-red-100 text-red-700 hover:bg-red-200 text-xs">Reject</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "suppliers":
        return (
          <table className="w-full text-xs">
            <thead className="text-gray-600 border-b bg-gray-50">
              <tr>
                <th className="p-2 text-left">Supplier</th>
                <th>Email</th>
                <th>Email Verification</th>
                <th>Phone</th>
                <th>Location</th>
                <th>Type</th>
                <th>ID Proof</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sampleApprovalData.suppliers.map((s, i) => (
                <tr key={i} className="border-b hover:bg-blue-50 transition-colors">
                  <td className="p-2">{s.name}</td>
                  <td>{s.email}</td>
                  <td>{s.verified}</td>
                  <td>{s.phone}</td>
                  <td>{s.location}</td>
                  <td>{s.type}</td>
                  <td>{s.id && <FileText className="w-4 h-4 text-gray-600" />}</td>
                  <td className="space-x-1">
                    <Button size="sm" className="bg-green-100 text-green-700 hover:bg-green-200 text-xs">Approve</Button>
                    <Button size="sm" className="bg-red-100 text-red-700 hover:bg-red-200 text-xs">Reject</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "auctions":
        return (
          <table className="w-full text-xs">
            <thead className="text-gray-600 border-b bg-gray-50">
              <tr>
                <th className="p-2 text-left">Auction</th>
                <th>Created By</th>
                <th>Type</th>
                <th>Format</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sampleApprovalData.auctions.map((a, i) => (
                <tr key={i} className="border-b hover:bg-blue-50 transition-colors">
                  <td className="p-2">{a.name}</td>
                  <td>{a.createdBy}</td>
                  <td>{a.type}</td>
                  <td>{a.format}</td>
                  <td>{a.start}</td>
                  <td>{a.end}</td>
                  <td className="space-x-1">
                    <Button size="sm" className="bg-green-100 text-green-700 hover:bg-green-200 text-xs">Approve</Button>
                    <Button size="sm" className="bg-red-100 text-red-700 hover:bg-red-200 text-xs">Reject</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "buynow":
        return (
          <table className="w-full text-xs">
            <thead className="text-gray-600 border-b bg-gray-50">
              <tr>
                <th className="p-2 text-left">Product</th>
                <th>Created By</th>
                <th>Price</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sampleApprovalData.buynow.map((p, i) => (
                <tr key={i} className="border-b hover:bg-blue-50 transition-colors">
                  <td className="p-2">{p.name}</td>
                  <td>{p.createdBy}</td>
                  <td>{p.price}</td>
                  <td className="space-x-1">
                    <Button size="sm" className="bg-green-100 text-green-700 hover:bg-green-200 text-xs">Approve</Button>
                    <Button size="sm" className="bg-red-100 text-red-700 hover:bg-red-200 text-xs">Reject</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" style={{ fontFamily: "Roboto, sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-blue-100 shadow-sm">
        <div className="px-6 flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <img
              src="https://briskon-auction-new.vercel.app/images/briskon-auction-horizontal-logo-white.png"
              alt="Briskon Auction Logo"
              className="h-8 w-auto object-contain"
            />
            <span className="text-lg font-semibold text-gray-800">Auction Control Panel</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">Welcome, {displayName}</span>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </span>
            <Button
              variant="outline"
              onClick={async () => {
                await logout();
                router.push("/");
              }}
              className="flex items-center text-sm font-medium text-gray-700 border-gray-300 bg-white hover:bg-gray-100 rounded-md"
            >
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className={`transition-all duration-300 bg-white shadow-lg border-r border-gray-200 mt-4 ml-4 mb-4 rounded-lg ${collapsed ? "w-20" : "w-64"}`}>
          <div className="flex justify-end p-2">
            <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded-md hover:bg-gray-100 text-gray-500">
              {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>
          <nav className="flex flex-col px-2 pb-4 text-sm font-medium">
            {navGroups.map(({ items }, idx) => (
              <div key={idx} className="mb-2">
                {idx > 0 && <div className="border-t border-gray-200 my-2"></div>}
                {items.map(({ label, href, Icon }) => {
                  const active = pathname === href || pathname.startsWith(href + "/");
                  return (
                    <div key={href} className="relative group">
                      <button
                        onClick={() => handleNavigate(href)}
                        className={`flex items-center ${collapsed ? "justify-center" : "space-x-3"} w-full px-3 py-2 rounded-md transition-all ${active ? "bg-blue-50" : "hover:bg-gray-100"}`}
                      >
                        <Icon className={`w-5 h-5 transition-all duration-200 ${active ? "text-[#0077b6]" : "text-[#0077b6] group-hover:scale-110 group-hover:text-[#005f8a]"}`} />
                        {!collapsed && (
                          <span className={`${active ? "text-gray-900 font-semibold" : "text-gray-700 group-hover:underline"}`}>{label}</span>
                        )}
                      </button>
                      {collapsed && (
                        <span className="absolute left-14 top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 transition-transform bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg z-10">
                          {label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* ---- Stats Cards ---- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            {/* Bidders */}
            <Card className="transition-transform hover:-translate-y-1 hover:shadow-md">
              <CardContent className="p-4 flex flex-col items-center justify-between h-full">
                <Users className="w-8 h-8 text-[#0077b6] mb-2" />
                <div className="text-3xl font-bold text-gray-900">3,465</div>
                <div className="text-sm font-medium text-gray-600">Bidders</div>
                <div className="mt-2 text-xs text-orange-500/90 font-medium self-end">456 Pending Approval</div>
              </CardContent>
            </Card>
            {/* Suppliers */}
            <Card className="transition-transform hover:-translate-y-1 hover:shadow-md">
              <CardContent className="p-4 flex flex-col items-center justify-between h-full">
                <Building className="w-8 h-8 text-[#0077b6] mb-2" />
                <div className="text-3xl font-bold text-gray-900">289</div>
                <div className="text-sm font-medium text-gray-600">Suppliers</div>
                <div className="mt-2 text-xs text-orange-500/90 font-medium self-end">32 Pending Approval</div>
              </CardContent>
            </Card>
            {/* Live Auctions */}
            <Card className="transition-transform hover:-translate-y-1 hover:shadow-md">
              <CardContent className="p-4 flex flex-col items-center justify-between h-full">
                <Gavel className="w-8 h-8 text-[#0077b6] mb-2" />
                <div className="text-3xl font-bold text-gray-900">47</div>
                <div className="text-sm font-medium text-gray-600">Live Auctions</div>
                <div className="mt-2 flex items-center text-gray-500 text-xs self-end space-x-1">
                  <Eye className="w-4 h-4" /> <span>13,457</span>
                </div>
              </CardContent>
            </Card>
            {/* Upcoming Auctions */}
            <Card className="transition-transform hover:-translate-y-1 hover:shadow-md">
              <CardContent className="p-4 flex flex-col items-center justify-between h-full">
                <Calendar className="w-8 h-8 text-[#0077b6] mb-2" />
                <div className="text-3xl font-bold text-gray-900">22</div>
                <div className="text-sm font-medium text-gray-600">Upcoming Auctions</div>
                <div className="mt-2 text-xs text-orange-500/90 font-medium self-end">4 Pending Approval</div>
              </CardContent>
            </Card>
            {/* Buy Now */}
            <Card className="transition-transform hover:-translate-y-1 hover:shadow-md">
              <CardContent className="p-4 flex flex-col items-center justify-between h-full">
                <ShoppingCart className="w-8 h-8 text-[#0077b6] mb-2" />
                <div className="text-3xl font-bold text-gray-900">154</div>
                <div className="text-sm font-medium text-gray-600">Buy Now</div>
                <div className="mt-2 text-xs text-orange-500/90 font-medium self-end">12 Pending Approval</div>
              </CardContent>
            </Card>
          </div>

          {/* ---- Action Cards ---- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="transition-transform hover:-translate-y-1 hover:shadow-md">
              <CardContent className="p-6 flex flex-col items-center text-center h-full">
                <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <Plus className="w-7 h-7 text-[#0077b6]" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">Add User</h3>
                <p className="text-sm text-gray-600 mb-4">Create and manage new user accounts for the platform.</p>
                <Button onClick={() => handleNavigate("/admin-panel/add-user")} className="bg-[#0077b6] hover:bg-[#005f8a] text-white text-sm">
                  <Plus className="w-4 h-4 mr-1" /> Add User
                </Button>
              </CardContent>
            </Card>
            <Card className="transition-transform hover:-translate-y-1 hover:shadow-md">
              <CardContent className="p-6 flex flex-col items-center text-center h-full">
                <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <Eye className="w-7 h-7 text-[#0077b6]" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">Manage Auctions</h3>
                <p className="text-sm text-gray-600 mb-4">View, edit, and oversee all auction listings.</p>
                <Button onClick={() => handleNavigate("/admin-panel/manage-auctions")} className="bg-[#0077b6] hover:bg-[#005f8a] text-white text-sm">
                  <Edit className="w-4 h-4 mr-1" /> Manage Auctions
                </Button>
              </CardContent>
            </Card>
            <Card className="transition-transform hover:-translate-y-1 hover:shadow-md">
              <CardContent className="p-6 flex flex-col items-center text-center h-full">
                <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-[#0077b6]" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">Manage Users</h3>
                <p className="text-sm text-gray-600 mb-4">Manage and oversee all user accounts on the platform.</p>
                <Button onClick={() => handleNavigate("/admin-panel/manage-users")} className="bg-[#0077b6] hover:bg-[#005f8a] text-white text-sm">
                  <Users className="w-4 h-4 mr-1" /> Manage Users
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ---- Info/Action Cards ---- */}
 {/* ---- Info/Action Cards ---- */}
<div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-8">
  {/* Approval Requests (60%) */}
  <Card className="lg:col-span-3 transition-transform hover:-translate-y-1 hover:shadow-lg">
    <CardContent className="p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-base font-semibold text-gray-900">Approval Requests</h2>
        <select
          value={approvalFilter}
          onChange={(e) => setApprovalFilter(e.target.value)}
          className="text-xs border rounded px-2 py-1"
        >
          <option value="bidders">Bidders</option>
          <option value="suppliers">Suppliers</option>
          <option value="auctions">Auctions</option>
          <option value="buynow">Buy Now</option>
        </select>
      </div>

      {/* Dynamic Table */}
      <div className="w-full">
        {approvalFilter === "bidders" && (
          <table className="w-full text-xs border-collapse">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-1.5 text-left">Bidder</th>
                <th className="px-3 py-1.5 text-left">Email</th>
                <th className="px-3 py-1.5">Email Verification</th>
                <th className="px-3 py-1.5">Phone</th>
                <th className="px-3 py-1.5">Location</th>
                <th className="px-3 py-1.5">Type</th>
                <th className="px-3 py-1.5">ID Proof</th>
                <th className="px-3 py-1.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {sampleApprovalData.bidders.map((b, i) => (
                <tr key={i} className="border-b hover:bg-blue-50 transition-colors">
                  <td className="px-3 py-1.5">{b.name}</td>
                  <td className="px-3 py-1.5">{b.email}</td>
                  <td className="px-3 py-1.5 text-center">{b.verified}</td>
                  <td className="px-3 py-1.5">{b.phone}</td>
                  <td className="px-3 py-1.5">{b.location}</td>
                  <td className="px-3 py-1.5">{b.type}</td>
                  <td className="px-3 py-1.5 text-center">
                    {b.id && <FileText className="w-4 h-4 text-gray-600 mx-auto" />}
                  </td>
                  <td className="px-3 py-1.5 text-center space-x-1">
                    <Button size="sm" className="bg-green-100 text-green-700 hover:bg-green-200 text-xs px-2 py-1">Approve</Button>
                    <Button size="sm" className="bg-red-100 text-red-700 hover:bg-red-200 text-xs px-2 py-1">Reject</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {approvalFilter === "suppliers" && (
          <table className="w-full text-xs border-collapse">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-1.5 text-left">Supplier</th>
                <th className="px-3 py-1.5 text-left">Email</th>
                <th className="px-3 py-1.5">Email Verification</th>
                <th className="px-3 py-1.5">Phone</th>
                <th className="px-3 py-1.5">Location</th>
                <th className="px-3 py-1.5">Type</th>
                <th className="px-3 py-1.5">ID Proof</th>
                <th className="px-3 py-1.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {sampleApprovalData.suppliers.map((s, i) => (
                <tr key={i} className="border-b hover:bg-blue-50 transition-colors">
                  <td className="px-3 py-1.5">{s.name}</td>
                  <td className="px-3 py-1.5">{s.email}</td>
                  <td className="px-3 py-1.5 text-center">{s.verified}</td>
                  <td className="px-3 py-1.5">{s.phone}</td>
                  <td className="px-3 py-1.5">{s.location}</td>
                  <td className="px-3 py-1.5">{s.type}</td>
                  <td className="px-3 py-1.5 text-center">
                    {s.id && <FileText className="w-4 h-4 text-gray-600 mx-auto" />}
                  </td>
                  <td className="px-3 py-1.5 text-center space-x-1">
                    <Button size="sm" className="bg-green-100 text-green-700 hover:bg-green-200 text-xs px-2 py-1">Approve</Button>
                    <Button size="sm" className="bg-red-100 text-red-700 hover:bg-red-200 text-xs px-2 py-1">Reject</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Add similar blocks for auctions + buynow */}
      </div>

      <div className="flex justify-end mt-3">
        <Button size="sm" variant="outline" className="text-xs">All Data →</Button>
      </div>
    </CardContent>
  </Card>

  {/* Recent Winners (40%) */}
  <Card className="lg:col-span-2 transition-transform hover:-translate-y-1 hover:shadow-lg">
    <CardContent className="p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-base font-semibold text-gray-900">Recent Winners</h2>
        <select
          value={winnerFilter}
          onChange={(e) => setWinnerFilter(e.target.value)}
          className="text-xs border rounded px-2 py-1"
        >
          <option>Forward</option>
          <option>Reverse</option>
        </select>
      </div>

      <table className="w-full text-xs border-collapse">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-3 py-1.5 text-left">Product Name</th>
            <th className="px-3 py-1.5">Auction End Date</th>
            <th className="px-3 py-1.5">Winner</th>
            <th className="px-3 py-1.5 text-right">Highest Bid ($)</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b hover:bg-blue-50 transition-colors">
            <td className="px-3 py-1.5">19th Century Asian Sleeping Buddha Painting</td>
            <td className="px-3 py-1.5">2024-12-04</td>
            <td className="px-3 py-1.5">VTDS023</td>
            <td className="px-3 py-1.5 text-right">$43,321</td>
          </tr>
          <tr className="border-b hover:bg-blue-50 transition-colors">
            <td className="px-3 py-1.5">Rolex Watch 2000 Edition</td>
            <td className="px-3 py-1.5">2024-12-04</td>
            <td className="px-3 py-1.5">VTDS023</td>
            <td className="px-3 py-1.5 text-right">$21,321</td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-end mt-3">
        <Button size="sm" variant="outline" className="text-xs">All Data →</Button>
      </div>
    </CardContent>
  </Card>
</div>

          
        </main>
      </div>
    </div>
  );
}
