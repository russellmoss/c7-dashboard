"use client";
import { useAuth } from "./AuthProvider";

export function TopBar() {
  const { user, signOut } = useAuth();
  if (!user) return null;
  const name =
    user.user_metadata?.display_name || user.user_metadata?.name || user.email;
  return (
    <div className="w-full bg-[#a92020] text-white flex items-center justify-between px-6 py-2 shadow">
      <span className="font-semibold">Hello {name}</span>
      <button
        className="bg-white text-[#a92020] px-4 py-1 rounded font-semibold hover:bg-gray-100 transition"
        onClick={signOut}
      >
        Logout
      </button>
    </div>
  );
}
