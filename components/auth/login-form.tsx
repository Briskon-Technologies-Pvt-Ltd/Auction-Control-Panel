"use client";

import React, { useEffect, useState } from "react";
import { Eye, EyeOff, Mail, Lock, AlertCircle, Shuffle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

export type UserRole = "admin" | "seller" | "both";

export interface UserType {
  id: string;
  email: string;
  fname: string;
  lname: string;
  role: UserRole;
  organization?: string;
  avatar?: string;
  isVerified: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface LoginFormProps {
  onLogin: (user: UserType) => void;
  onSwitchToRegister: () => void;
}

export default function LoginForm({ onLogin, onSwitchToRegister }: LoginFormProps) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<UserType | null>(null);

  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("auction_user");
      if (stored) setUser(JSON.parse(stored));
    } catch (e) {
      // ignore if SSR or malformed
    }
  }, []);

  const validateEmail = (email: string) => {
    // conservative regex
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // Basic client-side validation
    if (!formData.email || !formData.password) {
      setError("Please enter both email and password.");
      return;
    }
    if (!validateEmail(formData.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        setError(authError.message || "Authentication failed.");
        return;
      }

      if (!data || !data.user) {
        setError("Login failed — no user returned from provider.");
        return;
      }

      const supaUser: SupabaseUser = data.user as SupabaseUser;
      const session = (data as any).session ?? null;

      const meta = (supaUser as any).user_metadata || {};
      let userTypeData: UserType = {
        id: supaUser.id,
        email: supaUser.email || meta.email || "",
        fname: "",
        lname: "",
        role: (meta.role as UserRole) || "seller",
        organization: meta.organization || "",
        avatar: meta.avatar || "",
        isVerified: Boolean((supaUser as any).email_confirmed_at || (supaUser as any).confirmed_at || false),
        createdAt: (supaUser as any).created_at || new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      // fetch profile (fname / lname) from profiles table
      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("fname, lname,avatar_url")
          .eq("id", supaUser.id)
          .single();

        if (profileError && (profileError as any).code !== "PGRST116") {
          // PGRST116 = no rows? (depends on PostgREST) — still treat non-critical
          throw profileError;
        }

        if (profile) {
          userTypeData = {
            ...userTypeData,
            fname: (profile as any).fname || "",
            lname: (profile as any).lname || "",
            avatar: profile.avatar_url || userTypeData.avatar || "",
          };
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
        setError("Failed to load profile data.");
        // ensure sign out to reset
        await supabase.auth.signOut();
        return;
      }

      const allowedRoles = ["seller", "both", "admin"];
      if (!allowedRoles.includes((userTypeData.role || "").toLowerCase())) {
        setError("Access denied. Only sellers or accounts with both roles can log in to this portal.");
        await supabase.auth.signOut();
        return;
      }

      // Persist session + user for later
      try {
        localStorage.setItem("auction_user", JSON.stringify(userTypeData));
        if (session) localStorage.setItem("auction_session", JSON.stringify(session));
      } catch (err) {
        // ignore localStorage failures
        console.warn("localStorage not available", err);
      }

      setUser(userTypeData);
      onLogin(userTypeData);

      // Role-based redirect
      if (userTypeData.role === "admin") {
        router.push("/admin-panel/dashboard");
      } else if (userTypeData.role === "seller" || userTypeData.role === "both") {
        router.push("/seller-panel");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err?.message || "An unexpected error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  };

  
  return (
    <div className="relative h-screen w-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-corporate-50 via-white to-corporate-100">
  
      {/* Subtle mesh background */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <radialGradient id="mesh1" cx="20%" cy="20%" r="40%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.35" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="mesh2" cx="80%" cy="30%" r="40%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="mesh3" cx="50%" cy="80%" r="45%">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#mesh1)" />
        <rect width="100%" height="100%" fill="url(#mesh2)" />
        <rect width="100%" height="100%" fill="url(#mesh3)" />
      </svg>
  
      {/* Login card */}
      <div className="relative z-10 w-[900px] max-w-md bg-white  rounded-xl border border-blue-200 shadow-xl p-10">
        
        {/* Logo */}
        <div className="flex justify-center mb-6 ">
          <img
            src="/briskon-auction-horizontal-logo-white.png"
            alt="Briskon Auction"
            className="h-12 object-contain"
          />
        </div>
   
        {/* Title */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-700 border-b">Sign In to access <strong> Auction Control Panel </strong></p>
        </div>
  
        {/* Error */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-1 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}
  
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="email"
                type="email"
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 
                           focus:ring-2 focus:ring-corporate-500 focus:border-corporate-500 hover:border-corporate-400 transition"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
  
          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 
                           focus:ring-2 focus:ring-corporate-500 focus:border-corporate-500 hover:border-corporate-400 transition"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-500" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-500" />
                )}
              </button>
            </div>
          </div>
  
          {/* Options */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-gray-700">
              <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-corporate-600 focus:ring-corporate-500" />
              Remember me
            </label>
            <div className="flex gap-4">
        
              <button type="button" className="text-corporate-600 font-medium hover:underline">
                Forgot password?
              </button>
            </div>
          </div>
  
          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-semibold
                       bg-gradient-to-r from-blue-200 to-blue-500 hover:from-corporate-700 hover:to-corporate-800
                       active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg transition"
          >
            {isLoading ? (
              <>
                <span className="inline-block h-5 w-5 rounded-full border-b-2 border-white animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
  
        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Briskon Auction ·{" "}
          <a href="#" className="underline">Privacy policy</a> ·{" "}
          
          <a href="#" className="underline">Terms and conditions</a>
        </p>
      </div>
    </div>
  );
  
  
}
