"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, User, Building, Phone, MapPin, LogOut } from "lucide-react";

export default function AddUser() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const displayName = user?.fname || "Admin"; // Fallback to "Admin" if fname is unavailable
  const handleLogout = () => {
    logout();
    router.push("/");
  };
  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    location: "",
    accountType: "buyer",
    sellerType: "individual",
    organizationName: "",
    organizationContact: "",
    agreeToTerms: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError(null);
    setSuccessMessage(null);
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setSuccessMessage(null);
  };

  const handleRadioChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      accountType: value,
      sellerType: value === "buyer" ? "individual" : prev.sellerType,
      organizationName: value === "buyer" ? "" : prev.organizationName,
      organizationContact: value === "buyer" ? "" : prev.organizationContact,
    }));
    setError(null);
    setSuccessMessage(null);
  };

  const handleSellerTypeChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      sellerType: value,
      organizationName: value === "organization" ? prev.organizationName : "",
      organizationContact: value === "organization" ? prev.organizationContact : "",
    }));
    setError(null);
    setSuccessMessage(null);
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) return "Password must be at least 8 characters long.";
    if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter.";
    if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter.";
    if (!/\d/.test(password)) return "Password must contain a number.";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleSubmit called");
    setError(null);
    setSuccessMessage(null);

    if (!user || user.role !== "admin") {
      setError("Only admins can add users");
      console.log("Admin check failed");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      console.log("Password mismatch");
      return;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      console.log("Password validation failed:", passwordError);
      return;
    }

    if (!formData.agreeToTerms) {
      setError("You must agree to the Terms of Service and Privacy Policy.");
      console.log("Terms not agreed");
      return;
    }

    setIsLoading(true);
    try {
      console.log("Sending fetch request to /api/add-user");
      const response = await fetch("/api/add-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fname: formData.firstName,
          lname: formData.lastName,
          location: formData.location,
          role: formData.accountType,
          type: (formData.accountType === "seller" || formData.accountType === "both") ? formData.sellerType : undefined,
          organizationName: formData.sellerType === "organization" ? formData.organizationName : undefined,
          organizationContact: formData.sellerType === "organization" ? formData.organizationContact : undefined,
        }),
      });

      const data = await response.json();
      console.log("Fetch response:", data);
      if (data.success) {
        setSuccessMessage("User created successfully");
        setTimeout(() => router.push("/admin-panel/manage-users"), 2000);
      } else {
        setError(data.error || "Failed to create user");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setError("An error occurred during user creation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
              <div className="text-white font-semibold text-xl tracking-tight">Auction Wizard</div>
            </div>

            {/* User Info + Logout + Dashboard */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-white">Welcome, {displayName}</span>
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
      <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <Card className="max-w-2xl mx-auto shadow-lg rounded-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-corporate-700 via-corporate-600 to-corporate-500 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 p-6 text-white shadow-lg">
            <CardTitle className="text-2xl font-bold">Add New User</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <form onSubmit={handleSubmit} id="add-user-form" className="space-y-6">
              <div className="space-y-4">
                <Label className="text-lg font-semibold text-gray-900 block">Account Type</Label>
                <RadioGroup value={formData.accountType} onValueChange={handleRadioChange} className="grid grid-cols-2 gap-4">
                  {[
                    { value: "admin", label: "Admin" },
                    { value: "buyer", label: "Buyer" },
                    { value: "seller", label: "Seller" },
                    { value: "both", label: "Both" },
                  ].map((item) => (
                    <div key={item.value} className="relative">
                      <RadioGroupItem value={item.value} id={item.value} className="peer sr-only" />
                      <Label
                        htmlFor={item.value}
                        className={`flex items-center justify-center p-4 rounded-lg cursor-pointer border-2 transition-all duration-300 w-full ${
                          formData.accountType === item.value ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {item.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {(formData.accountType === "seller" || formData.accountType === "both") && (
                <div className="space-y-4">
                  <Label className="text-lg font-semibold text-gray-900 block">Seller Type</Label>
                  <RadioGroup value={formData.sellerType} onValueChange={handleSellerTypeChange} className="grid grid-cols-2 gap-4">
                    {[
                      { value: "individual", label: "Individual" },
                      { value: "organization", label: "Organization" },
                    ].map((item) => (
                      <div key={item.value} className="relative">
                        <RadioGroupItem value={item.value} id={item.value} className="peer sr-only" />
                        <Label
                          htmlFor={item.value}
                          className={`flex items-center justify-center p-4 rounded-lg cursor-pointer border-2 transition-all duration-300 w-full ${
                            formData.sellerType === item.value ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {item.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {formData.sellerType === "organization" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="organizationName">Organization Name</Label>
                        <div className="relative">
                          <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                          <Input
                            id="organizationName"
                            name="organizationName"
                            placeholder="e.g., Acme Auctions"
                            value={formData.organizationName}
                            onChange={handleInputChange}
                            className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="organizationContact">Organization Contact</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                          <Input
                            id="organizationContact"
                            name="organizationContact"
                            type="tel"
                            placeholder="+1 (555) 123-4567"
                            value={formData.organizationContact}
                            onChange={handleInputChange}
                            className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                    <Input
                      id="firstName"
                      name="firstName"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                    <Input
                      id="lastName"
                      name="lastName"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location (Optional)</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                    <Input
                      id="location"
                      name="location"
                      placeholder="e.g., New York, USA"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">Min 8 chars, 1 uppercase, 1 lowercase, 1 number.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center">
                    <input
                      type="checkbox"
                      name="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onChange={(e) => handleInputChange(e as any)}
                      className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      required
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      I agree to the{" "}
                      <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>,{" "}
                      <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>, and{" "}
                      <Link href="/auction-rules" className="text-blue-600 hover:underline">Auction Rules</Link>.
                    </span>
                  </Label>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {successMessage && (
                <Alert>
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
          <CardFooter className="flex justify-end p-6 bg-gray-50">
            <Button
              type="submit"
              form="add-user-form"
              disabled={isLoading || !!successMessage}
              className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-2 rounded-lg"
              onClick={() => console.log("Button clicked", { isLoading, successMessage })}
            >
              {isLoading ? "Adding User..." : successMessage ? "User Added!" : "Add User"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
