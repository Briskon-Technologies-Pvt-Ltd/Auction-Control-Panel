"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import {
  Gavel,
  Trophy,
  Box,
  Users,
  Building,
  BarChart,
  LogOut,
  Shield,
  LayoutDashboard,
  Calendar,
  User,
  KeyRound,
  Bell,
  FolderTree,
} from "lucide-react";

function SidebarItem({
  icon: Icon,
  label,
  href,
  active,
  onClick,
  children,
}: {
  icon: any;
  label: string;
  href: string;
  active?: boolean;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="w-full">
      <div
        onClick={onClick}
        className={`flex flex-col items-center py-2 w-full cursor-pointer transition-colors
          ${
            active
              ? "bg-[#0a2e73] text-white font-semibold"
              : "text-blue-200 hover:bg-[#0a2e73] hover:text-white hover:font-semibold font-normal"
          }
        `}
      >
        <Icon className="w-6 h-6 mb-1" />
        <span className="text-xs">{label}</span>
      </div>

      {children && (
        <div className="w-full bg-[#0c60e1]/30 flex flex-col items-start text-[11px] text-blue-100">
          {children}
        </div>
      )}

      <div className="w-10 border-b border-blue-400/30 mx-auto"></div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/");
  }, [user, router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".user-dropdown-container")) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  if (!user || user.role !== "admin") return null;

  const displayName =
    user.fname && user.lname
      ? `${user.fname} ${user.lname}`
      : user.fname || user.email?.split("@")[0] || "Admin";

  return (
    <div className="min-h-screen flex flex-col bg-white font-roboto">
      <div className="flex items-start flex-1">
        {/* Sidebar */}
        <aside className="flex flex-col w-20 bg-[#0d6efd] text-white self-start rounded-b-xl sticky top-0">
          <div className="h-20 flex items-center justify-center">
            <img src="/logo.svg" alt="Logo" className="h-10 w-10 object-contain" />
          </div>

          <nav className="flex flex-col items-center pt-3">
            <SidebarItem
              icon={LayoutDashboard}
              label="Dashboard"
              href="/admin-panel/dashboard"
              active={pathname === "/admin-panel/dashboard"}
              onClick={() => router.push("/admin-panel/dashboard")}
            />
            
            <SidebarItem
              icon={FolderTree}
              label="Category"
              href="/admin-panel/category"
              active={pathname.startsWith("/admin-panel/category")}
              onClick={() => router.push("/admin-panel/category")}
            />

            <SidebarItem
              icon={Gavel}
              label="Auctions"
              href="/admin-panel/auctions/forward"
              active={pathname.startsWith("/admin-panel/auctions/forward")}
              onClick={() => router.push("/admin-panel/auctions/forward")}
            />
            <SidebarItem
              icon={Trophy}
              label="Winners"
              href="/admin-panel/winners"
              active={pathname.startsWith("/admin-panel/winners")}
              onClick={() => router.push("/admin-panel/winners")}
            />
            <SidebarItem
              icon={Box}
              label="Products"
              href="/admin-panel/buynow"
              active={pathname.startsWith("/admin-panel/buynow")}
              onClick={() => router.push("/admin-panel/buynow")}
            />
            <SidebarItem
              icon={Users}
              label="Bidders"
              href="/admin-panel/bidders"
              active={pathname.startsWith("/admin-panel/bidders")}
              onClick={() => router.push("/admin-panel/bidders")}
            />
      
      {/*       <SidebarItem
              icon={Building}
              label="Suppliers"
              href="/admin-panel/sellers"
              active={pathname.startsWith("/admin-panel/sellers")}
              onClick={() => router.push("/admin-panel/sellers")}
            />
               <SidebarItem
              icon={BarChart}
              label="Analytics"
              href="/admin-panel/analytics"
              active={pathname.startsWith("/admin-panel/analytics")}
              onClick={() => router.push("/admin-panel/analytics")}
            />
       */}
            <SidebarItem
              icon={Calendar}
              label="Calendar"
              href="/admin-panel/calendar"
              active={pathname.startsWith("/admin-panel/calendar")}
              onClick={() => router.push("/admin-panel/calendar")}
            />
         
          </nav>
        </aside>

        {/* Right section */}
        <div className="flex flex-col flex-1 min-h-screen bg-white">
          {/* Header */}
          <header className="bg-white h-14 flex items-center px-6 border-b border-blue-200">
            <div className="flex flex-1 items-center justify-between">
              <div className="text-sm text-gray-700 tracking-wide">
                Auction control panel - <b>Briskon</b>
              </div>

              {/* Notifications + Profile */}
              <div className="relative flex items-center gap-6 ml-auto user-dropdown-container">
                {/* 🔔 Notifications */}
                <div className="relative flex items-center cursor-pointer group">
                  <Bell className="w-6 h-6 text-gray-600 group-hover:text-blue-600 transition-colors" />
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-semibold px-1.5 rounded-full shadow-sm">
                    17
                  </span>
                </div>

                {/* 👤 Profile + Me */}
                <button
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 focus:outline-none transition"
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={displayName}
                      onError={(e) => (e.currentTarget.src = '/default-avatar.png')}
                      className="w-8 h-8 rounded-full border border-gray-300 object-cover transition-transform duration-200 hover:scale-105"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-sm font-medium">
                      {`${user?.fname?.[0] || 'A'}${user?.lname?.[0] || ''}`.toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-gray-700 font-medium hover:text-blue-700 transition">
                    Me
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
                      dropdownOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* ▼ Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-[44px] w-64 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.07)] py-2 z-50 animate-fade-in">
                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 pb-3 border-b border-gray-100">
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={displayName}
                          onError={(e) => (e.currentTarget.src = '/default-avatar.png')}
                          className="w-10 h-10 rounded-full border border-gray-200 object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-sm font-medium">
                          {`${user?.fname?.[0] || 'A'}${user?.lname?.[0] || ''}`.toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col leading-tight">
                        <span className="text-sm font-semibold text-gray-900">{displayName}</span>
                        <span className="text-xs text-gray-500 truncate w-40">
                          {user?.email || 'admin@briskon.com'}
                        </span>
                      </div>
                    </div>

                    {/* Menu Items with Animated Left Bar */}
                    {[
                      { label: "My Profile", icon: User, route: "/admin-panel/profile" },
                      {
                        label: "Change Password",
                        icon: KeyRound,
                        route: "/admin-panel/change-password",
                      },
                    ].map((item, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setDropdownOpen(false);
                          router.push(item.route);
                        }}
                        className="group relative flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-150"
                      >
                        <div className="absolute left-0 top-0 h-full w-1 bg-blue-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-top rounded-r-sm"></div>
                        <item.icon className="w-4 h-4" /> {item.label}
                      </button>
                    ))}

                    <div className="border-t border-gray-100 my-1"></div>

                    <button
                      onClick={async () => {
                        await logout();
                        router.push("/");
                      }}
                      className="group relative flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-150"
                    >
                      <div className="absolute left-0 top-0 h-full w-1 bg-red-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-top rounded-r-sm"></div>
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Main */}
          <main className="flex-1 p-6 overflow-y-auto bg-white">{children}</main>
        </div>
      </div>

      {/* Footer */}
      <footer className="h-8 w-full bg-gradient-to-r from-blue-100 via-white to-blue-100 text-center flex items-center justify-left text-sm text-gray-600 border-t border-gray-200">
        &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; © Briskon Auctions. All rights reserved.
      </footer>

      {/* Inline animation */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.15s ease-out;
        }
      `}</style>
    </div>
  );
}
