"use client";

import { ReactNode, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Home, Users, Building, Gavel, Trophy, ShoppingCart,
  CreditCard, User, Key, LogOut,
  PanelLeftOpen, PanelLeftClose, Circle, ChevronDown
} from "lucide-react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/");
  }, [user, router]);

  if (!user || user.role !== "admin") return null;

  const displayName = user.fname || user.email?.split("@")[0] || "Admin";

  const navGroups = [
    {
      items: [{ label: "Dashboard", href: "/admin-panel/dashboard", Icon: Home, color: "text-blue-500" }],
    },
    {
      items: [
        { label: "Bidders", href: "/admin-panel/bidders", Icon: Users, color: "text-teal-500" },
        { label: "Suppliers", href: "/admin-panel/sellers", Icon: Building, color: "text-purple-500" },
      ],
    },
    {
      items: [
        {
          label: "Auctions",
          href: "/admin-panel/auctions",
          Icon: Gavel,
          color: "text-red-500",
          children: [
            { label: "Forward", href: "/admin-panel/auctions/forward" },
            { label: "Reverse", href: "/admin-panel/auctions/reverse" },
          ],
        },
        {
          label: "Winners",
          href: "/admin-panel/winners",
          Icon: Trophy,
          color: "text-yellow-500",
          children: [
            { label: "Forward", href: "/admin-panel/winners/forward" },
            { label: "Reverse", href: "/admin-panel/winners/reverse" },
          ],
        },
      ],
    },
    {
      items: [
        {
          label: "Buy Now",
          href: "/admin-panel/buynow-sales",
          Icon: ShoppingCart,
          color: "text-orange-500",
          children: [
            { label: "Products", href: "/admin-panel/buynow" },
            { label: "Purchases", href: "/admin-panel/buynow-sales" },
          ],
        },
      ],
    },
    {
      items: [
        { label: "Profile", href: "/admin-panel/profile", Icon: User, color: "text-indigo-500" },
        { label: "Change Password", href: "/admin-panel/change-password", Icon: Key, color: "text-pink-500" },
      ],
    },
  ];

  const toggleMenu = (key: string) => {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 font-roboto">
      {/* Header */}
      <header className="bg-gradient-to-r from-white via-blue-100 to-[#0077b6] shadow-md rounded-b-xl">
        <div className="flex justify-between items-center px-6 h-14">
          {/* Left: Logo */}
          <div className="flex items-center">
            <img
              src="/briskon-auction-horizontal-logo-white.png"
              alt="Logo"
              className="h-7 w-auto object-contain"
            />
          </div>

          {/* Center: Title */}
          <div className="flex-1 text-center">
            <span className="text-lg font-bold text-[#0077b6] tracking-wide">
              Auction Control Panel
            </span>
          </div>

          {/* Right: User */}
          <div className="flex items-center space-x-3">
            <span className="text-sm text-white">Welcome, {displayName}</span>
            <span className="px-2 py-0.5 text-xs font-medium bg-white/20 text-white rounded-full">
              <b> {user.role.charAt(0).toUpperCase() + user.role.slice(1)} </b> 
            </span>
            <button
              onClick={async () => {
                await logout();
                router.push("/");
              }}
              className="p-2 rounded-full bg-orange-500 hover:bg-orange-600 shadow-md hover:shadow-lg transition"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
  className={`transition-all duration-300 shadow-md border border-gray-200 rounded-xl mt-4 mb-4 ml-4 mr-1 
    bg-gradient-to-b from-white via-blue-100 to- blue-100
    h-auto self-start
    ${collapsed ? "w-20" : "w-50"}`}
>
          <div className="flex justify-end p-2">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-full hover:bg-gray-200 text-gray-700 transition"
            >
              {collapsed ? (
                <PanelLeftOpen className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </button>
          </div>

          <nav className="flex flex-col px-2 pb-3 text-sm font-medium">
            {navGroups.map(({ items }, idx) => (
              <div key={idx} className="mb-2">
                {idx > 0 && <div className="border-t border-gray-200 my-2"></div>}
                {items.map(({ label, href, Icon, color, children }) => {
                  const active = pathname === href || pathname.startsWith(href + "/");
                  const isOpen = openMenus[href] || active;
                  return (
                    <div key={href} className="relative group">
                      <div
                        className={`flex items-center ${
                          collapsed ? "justify-center" : "justify-between"
                        }`}
                      >
                        <button
                          onClick={() => router.push(href)}
                          title={collapsed ? label : ""}
                          className={`flex items-center ${
                            collapsed ? "justify-center" : "space-x-3"
                          } w-full px-3 py-3 rounded-md transition-all ${
                            active
                              ? "bg-blue-50 border-l-4 border-blue-500 font-semibold"
                              : "hover:bg-blue-100"
                          }`}
                        >
                          {Icon && (
                            <Icon
                              className={`w-6 h-6 transition-colors duration-200 ${color} ${
                                active ? "scale-110" : ""
                              }`}
                            />
                          )}
                          {!collapsed && (
                            <span
                              className={`${
                                active
                                  ? "text-gray-900 font-semibold underline"
                                  : "text-gray-700 group-hover:underline"
                              }`}
                            >
                              {label}
                            </span>
                          )}
                        </button>
                        {/* Arrow toggle for submenus */}
                        {!collapsed && children && (
                          <button
                            onClick={() => toggleMenu(href)}
                            className="p-1 text-gray-500 hover:text-blue-600"
                          >
                            <ChevronDown
                              className={`w-4 h-4 transform transition ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        )}
                      </div>

                      {/* Submenu */}
                      {!collapsed && children && (
                        <div
                          className={`ml-6 overflow-hidden transition-all duration-300 ease-in-out ${
                            isOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                          }`}
                        >
                          <div className="mt-1 space-y-1">
                            {children.map((child) => {
                              const subActive =
                                pathname === child.href || pathname.startsWith(child.href + "/");
                              return (
                                <button
                                  key={child.href}
                                  onClick={() => router.push(child.href)}
                                  className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-all ${
                                    subActive
                                      ? "bg-blue-100 text-blue-800 font-semibold"
                                      : "text-gray-600 hover:bg-blue-50"
                                  }`}
                                >
                                  <Circle
                                    className={`w-2 h-2 ${
                                      subActive ? "text-blue-600" : "text-blue-300"
                                    }`}
                                  />
                                  {child.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
