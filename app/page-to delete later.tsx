"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/auth/auth-provider";
import LoginForm from "../components/auth/login-form";
import { ThemeProvider } from "../theme-context";
import { AuthProvider } from "../components/auth/auth-provider";
import { UserType } from "../components/auth/login-form";

function AuthenticatedApp() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        router.push("/admin-panel");
      } else if (user.role === "seller" || user.role === "both") {
        router.push("/seller-panel");
      }
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-600 dark:text-gray-300">Redirecting...</p>
    </div>
  );
}

function UnauthenticatedApp() {
  const [userState, setUserState] = useState<UserType | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <LoginForm
        onLogin={(user) => setUserState(user)} // optional future use
        onSwitchToRegister={() => alert("Register flow coming soon")}
      />
    </div>
  );
}

function RootApp() {
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("auction_user");
    setIsAuthed(!!stored);
    setIsChecking(false);
  }, [user]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-300">Checking session...</p>
      </div>
    );
  }

  return isAuthed && user ? <AuthenticatedApp /> : <UnauthenticatedApp />;
}

export default function Page() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
