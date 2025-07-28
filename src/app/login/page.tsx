"use client";

import { useState } from "react";
import { useAuth } from "../../components/AuthProvider";
import { useRouter } from "next/navigation";

export const dynamic = 'force-dynamic';

const WineGlassLogo = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M24 44V36M24 36C32 36 38 29.732 38 22V6H10V22C10 29.732 16 36 24 36Z"
      stroke="#a92020"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <ellipse cx="24" cy="12" rx="12" ry="4" fill="#a92020" fillOpacity=".15" />
  </svg>
);

export default function LoginPage() {
  const { user, signIn, sendPasswordReset } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);

  if (user) {
    router.replace("/");
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) setError(error.message);
    else router.replace("/");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await sendPasswordReset(email);
    setLoading(false);
    if (error) setError(error.message);
    else setResetSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md flex flex-col items-center">
        <WineGlassLogo />
        <h1 className="text-2xl font-bold text-[#a92020] mt-4 mb-2">
          Milea KPI Dashboard
        </h1>
        {showReset ? (
          <form className="w-full mt-4" onSubmit={handleReset}>
            <label className="block mb-2 text-sm font-medium">Email</label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2 mb-4"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {resetSent ? (
              <div className="text-green-600 mb-4">
                Password reset email sent!
              </div>
            ) : null}
            {error && <div className="text-red-600 mb-4">{error}</div>}
            <button
              type="submit"
              className="w-full bg-[#a92020] text-white py-2 rounded font-semibold hover:bg-[#8b1a1a] transition"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Password Reset Email"}
            </button>
            <button
              type="button"
              className="w-full mt-2 text-sm text-gray-600 hover:underline"
              onClick={() => {
                setShowReset(false);
                setResetSent(false);
                setError("");
              }}
            >
              Back to Login
            </button>
          </form>
        ) : (
          <form className="w-full mt-4" onSubmit={handleLogin}>
            <label className="block mb-2 text-sm font-medium">Email</label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2 mb-4"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label className="block mb-2 text-sm font-medium">Password</label>
            <div className="relative mb-4">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full border rounded px-3 py-2 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? (
                  // Eye open SVG
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                ) : (
                  // Eye closed SVG
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.956 9.956 0 012.293-3.95m3.249-2.383A9.956 9.956 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.956 9.956 0 01-4.043 5.306M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3l18 18"
                    />
                  </svg>
                )}
              </button>
            </div>
            {error && <div className="text-red-600 mb-4">{error}</div>}
            <button
              type="submit"
              className="w-full bg-[#a92020] text-white py-2 rounded font-semibold hover:bg-[#8b1a1a] transition"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
            <button
              type="button"
              className="w-full mt-2 text-sm text-gray-600 hover:underline"
              onClick={() => {
                setShowReset(true);
                setError("");
              }}
            >
              Forgot password?
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
