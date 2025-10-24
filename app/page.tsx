"use client";

import LoginForm from "@/components/auth/login-form";

export default function HomePage() {
  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <LoginForm
        onLogin={(user) => {
          console.log("User logged in:", user);
        }}
        onSwitchToRegister={() => {
          console.log("Switch to register clicked");
        }}
      />
    </div>
  );
}
