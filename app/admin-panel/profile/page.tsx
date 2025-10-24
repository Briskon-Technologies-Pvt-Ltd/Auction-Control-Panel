"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Country } from "@/lib/locationTypes";
import { countriesData } from "@/data/Location";
import AdminLayout from "@/components/layouts/AdminLayout";
import { createClient } from "@supabase/supabase-js";

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
  const router = useRouter();
  const userId = user?.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [phone, setPhone] = useState("");
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");

  const [formData, setFormData] = useState({
    city: "",
    state: "",
    country: "",
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCountries(countriesData);
  }, []);

  useEffect(() => {
    if (!userId) return;

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

        setFormData({ city, state, country });
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("profileimage")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert("Failed to upload profile picture.");
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("profileimage")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      alert("Failed to update avatar URL.");
    } else {
      alert("Profile picture updated!");
      setProfile((prev) =>
        prev ? { ...prev, avatar_url: `${publicUrl}?t=${Date.now()}` } : prev
      );
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  const handleSaveChanges = async () => {
    if (!user?.id) {
      toast.error("User not logged in");
      return;
    }
    const location = [formData.city, formData.state, formData.country].filter(Boolean).join(", ");
    const updates = { fname, lname, addressline1: address1, addressline2: address2, phone, location };

    const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
    if (error) {
      toast.error("Failed to update profile.");
    } else {
      alert("Profile updated successfully!");
    }
  };

  if (loading) return <div className="text-center py-20">Loading...</div>;
  if (error) return <div className="text-center py-20 text-red-600">{error}</div>;
  if (!profile) return <div className="text-center py-20">Profile not found</div>;

  const createdAtIST = DateTime.fromISO(profile.created_at, { zone: "utc" })
    .setZone("Asia/Kolkata")
    .toLocaleString(DateTime.DATE_FULL);

    return (
      <AdminLayout>
        <div className="min-h-screen bg-transparent" style={{ fontFamily: "Roboto, sans-serif" }}>
          {/* HEADER SECTION */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Profile Settings</h1>
              <p className="text-sm text-gray-500">
                Manage and update your personal information and preferences.
              </p>
            </div>
            {/* Profile Picture */}
            <div className="relative">
              <Image
                src={profile.avatar_url ? `${profile.avatar_url}?t=${Date.now()}` : "/images/user.png"}
                alt="Profile"
                width={100}
                height={100}
                className="w-24 h-24 rounded-full object-cover border-2 border-blue-200 shadow-sm"
              />
              <button
                type="button"
                onClick={triggerFileInput}
                className="absolute bottom-1 right-1 bg-blue-600 text-white p-1.5 rounded-full hover:bg-blue-700 shadow transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z"
                  />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
    
          {/* CARD CONTAINER */}
          <div className="bg-white border border-blue-200 rounded-xl shadow-sm p-6">
            {/* BASIC DETAILS */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {fname} {lname}
                </h2>
                <p className="text-sm text-gray-600">{profile.email}</p>
                <p className="text-xs text-gray-400">Joined on {createdAtIST}</p>
              </div>
              <div className="text-right">
                <span className="text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded-full font-semibold border border-blue-100">
                  Role: {profile.role}
                </span>
              </div>
            </div>
    
            {/* FORM SECTION */}
            <div className="space-y-5">
              {/* Name & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="fname" className="text-sm font-medium text-gray-700">
                    First Name
                  </Label>
                  <Input
                    id="fname"
                    value={fname}
                    onChange={(e) => setFname(e.target.value)}
                    className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <Label htmlFor="lname" className="text-sm font-medium text-gray-700">
                    Last Name
                  </Label>
                  <Input
                    id="lname"
                    value={lname}
                    onChange={(e) => setLname(e.target.value)}
                    className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                  />
                </div>
              </div>
    
              {/* Address */}
              <div>
                <Label htmlFor="addressline1" className="text-sm font-medium text-gray-700">
                  Address Line 1
                </Label>
                <Input
                  id="addressline1"
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                />
              </div>
    
              <div>
                <Label htmlFor="addressline2" className="text-sm font-medium text-gray-700">
                  Address Line 2
                </Label>
                <Input
                  id="addressline2"
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  placeholder="Optional"
                  className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                />
              </div>
    
              {/* Location (Country/State/City) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Country */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Country</Label>
                  <select
                    className="w-full mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm 
                              focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none
                              hover:border-blue-400"
                    value={formData.country}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        country: e.target.value,
                        state: "",
                        city: "",
                      }));
                      setSelectedCountry(e.target.value);
                    }}
                  >
                    <option value="">Select Country</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* State */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">State</Label>
                  <select
                    className="w-full mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm 
                              focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none
                              hover:border-blue-400"
                    value={selectedState}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, state: e.target.value, city: "" }));
                      setSelectedState(e.target.value);
                    }}
                  >
                    <option value="">Select State</option>
                    {countries.find((c) => c.name === selectedCountry)?.states?.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* City */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">City</Label>
                  <select
                    className="w-full mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm 
                              focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none
                              hover:border-blue-400"
                    value={selectedCity}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, city: e.target.value }));
                      setSelectedCity(e.target.value);
                    }}
                  >
                    <option value="">Select City</option>
                    {countries
                      .find((c) => c.name === selectedCountry)
                      ?.states.find((s) => s.name === selectedState)
                      ?.cities?.map((city) => (
                        <option key={city.id} value={city.name}>
                          {city.name}
                        </option>
                      ))}
                  </select>
                </div>
            </div>
    
              {/* ACTION BUTTON */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveChanges}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2 rounded-md shadow-sm transition"
                >
                  Update Profile
                </Button>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
    
    

}
