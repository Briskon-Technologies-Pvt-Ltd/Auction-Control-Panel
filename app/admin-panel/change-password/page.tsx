"use client";

import AdminLayout from "@/components/layouts/AdminLayout";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useParams, useRouter } from "next/navigation";
import { DateTime } from "luxon";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@supabase/auth-helpers-react";
import { useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import LocationSelector from "@/components/LocationSelector";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, User, Lock } from "lucide-react";
import type { Country } from "@/lib/locationTypes";
import { countriesData } from "@/data/Location";

// import useSWR from "swr";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Profile {
  id: string;
  fname: string;
  lname: string;
  role: string;
  email: string;
  created_at: string;
  avatar_url?: string;
  type: string;
  location: string;
  addressline1?: string;
  addressline2?: string;
  phone?: string;
}

export default function ProfileSettingsPage() {
  const { user } = useAuth();

// const params = useParams<{ userId: string }>();
  const router = useRouter();
const userId = user?.id;
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [activeTab, setActiveTab] = useState("view");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // For edit form fields
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [phone, setPhone] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Password change fields
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [countries, setCountries] = useState<Country[]>([]);
  const [formData, setFormData] = useState({
    accountType: "admin", // Default to 'buyer'
    sellerType: "individual", // Default to 'individual' for seller/both
    buyerType: "individual", // Default for buyer when accountType is buyer or both
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    addressline1: "",
    addressline2: "",
    city: "",
    state: "",
    country: "",
    confirmPassword: "",
    organizationName: "", // New field for organization
    organizationContact: "", // New field for organization contact
    buyerOrganizationName: "", // new field for buyer organizations
    buyerOrganizationContact: "", // new field for buyer organizations
    location: "",
    agreeToTerms: false,
    subscribeNewsletter: false,
  });

useEffect(() => {
  if (!userId) return; // wait until userId exists

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/profiles/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load profile");

      setProfile(data.data);
      setFname(data.data.fname);
      setLname(data.data.lname);
      setAddress1(data.data.addressline1 || "");
      setAddress2(data.data.addressline2 || "");
      setPhone(data.data.phone || "");

      const [city = "", state = "", country = ""] =
        (data.data.location || "").split(",").map((s: string) => s.trim());

      setFormData((prev) => ({
        ...prev,
        city,
        state,
        country,
      }));

      setSelectedCity(city);
      setSelectedState(state);
      setSelectedCountry(country);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  fetchProfile();
}, [userId]);


  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("profileimage") // ✅ bucket name
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("Upload failed:", uploadError.message);
      alert("Failed to upload profile picture.");
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("profileimage")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("profiles") // ✅ your actual table name
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update avatar:", updateError.message);
      alert("Failed to update avatar URL.");
    } else {
      alert("Profile picture updated!");
      setProfile((prev) =>
        prev ? { ...prev, avatar_url: `${publicUrl}?t=${Date.now()}` } : prev
      );
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // --- END handleFileChange ---
  if (loading)
    return (
      <div className="text-center py-20 text-gray-700 dark:text-gray-300">
        Loading...
      </div>
    );

  if (error)
    return (
      <div className="text-center py-20 text-red-600 dark:text-red-400">
        {error}
      </div>
    );

  if (!profile)
    return (
      <div className="text-center py-20 text-gray-700 dark:text-gray-300">
        Profile not found
      </div>
    );

  const createdAtIST = DateTime.fromISO(profile.created_at, { zone: "utc" })
    .setZone("Asia/Kolkata")
    .toLocaleString(DateTime.DATE_FULL);

  const handleUpdatePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      alert("Please fill in all fields.");
      return;
    }

    if (newPassword.length < 6) {
      alert("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("New password and confirm password do not match!");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      alert("User session invalid. Please log in again.");
      return;
    }

    // Re-authenticate with old password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });

    if (signInError) {
      alert("Current password is incorrect.");
      return;
    }

    // Update to new password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      alert(`Error updating password: ${error.message}`);
      return;
    }

    alert("Password changed successfully. Please log in again.");
    setTimeout(async () => {
      await supabase.auth.signOut();
      router.push("/login");
    }, 1000); // delay 1 second
  };

  const handleSaveChanges = async () => {
    if (!user?.id) {
      toast.error("User not logged in");
      return;
    }
    const location = [formData.city, formData.state, formData.country]
      .filter(Boolean) // removes any empty strings or nulls
      .join(", ");
    const updates = {
      fname,
      lname,
      addressline1: address1, // ✅ match your DB column
      addressline2: address2,
      phone,
      location,
      // updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to update profile.");
      console.error(error);
    } else {
      alert("Profile updated successfully!");
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-center items-center py-12 bg-transparent">
        <div className="w-full max-w-md bg-white border border-blue-200 rounded-xl shadow-sm hover:shadow-md transition-all p-8">
          
          {/* HEADER */}
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
            <Lock className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">Change Password</h2>
          </div>
  
          {/* DESCRIPTION */}
          <p className="text-sm text-gray-500 mb-6">
            Please enter your current password and choose a new one below. Your new password must be at least 6 characters long.
          </p>
  
          {/* FORM */}
          <div className="space-y-5">
            {/* Current Password */}
            <div className="relative">
              <Label htmlFor="old-password" className="text-sm font-medium text-gray-700">
                Current Password
              </Label>
              <div className="relative mt-1">
                <Input
                  id="old-password"
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm 
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-200 pr-10 transition-all"
                />
                <div
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-blue-600"
                  onClick={() => setShowOldPassword((prev) => !prev)}
                >
                  {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </div>
              </div>
            </div>
  
            {/* New Password */}
            <div className="relative">
              <Label htmlFor="new-password" className="text-sm font-medium text-gray-700">
                New Password
              </Label>
              <div className="relative mt-1">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm 
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-200 pr-10 transition-all"
                />
                <div
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-blue-600"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </div>
              </div>
            </div>
  
            {/* Confirm Password */}
            <div className="relative">
              <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-700">
                Confirm New Password
              </Label>
              <div className="relative mt-1">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm 
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-200 pr-10 transition-all"
                />
                <div
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-blue-600"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </div>
              </div>
            </div>
          </div>
  
          {/* BUTTON */}
          <div className="mt-8">
            <Button
              onClick={handleUpdatePassword}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2.5 rounded-md 
                         shadow-sm hover:shadow-md transition-all font-medium"
            >
              Update Password
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
  

}
