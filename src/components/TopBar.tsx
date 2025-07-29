"use client";
import { useAuth } from "./AuthProvider";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar() {
  const { user, signOut } = useAuth();
  if (!user) return null;
  const name =
    user.user_metadata?.display_name || user.user_metadata?.name || user.email;
  return (
    <div className="w-full bg-[#a92020] text-white flex items-center justify-between px-4 sm:px-6 py-3 shadow">
      <span className="font-semibold text-sm sm:text-base truncate">
        Hello {name}
      </span>
      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <button
          className="bg-white text-[#a92020] px-3 sm:px-4 py-2 rounded font-semibold hover:bg-gray-100 active:bg-gray-200 transition-colors min-h-[44px] text-sm sm:text-base"
          onClick={signOut}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
