"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { User, History, LogOut, LogIn, UserPlus } from "lucide-react";

export default function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogin = () => {
    navigate("/login");
  };

  const handleSignUp = () => {
    navigate("/signup");
  };

  const handleLogout = () => {
    logout();
    // Stay on current page after logout
  };

  const handleSessionHistory = () => {
    navigate("/session-history");
  };

  if (isAuthenticated) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <a
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            href="/"
          >
            <div className="p-2 bg-blue-600 rounded-lg">
              <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">P</span>
              </div>
            </div>
            <div className="font-bold text-xl text-slate-900">
              PlanningPoker
            </div>
          </a>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSessionHistory}
              className="text-slate-600 hover:text-slate-900"
            >
              <History className="w-4 h-4 mr-2" />
              History
            </Button>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
              <User className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-900">
                {user?.username}
              </span>
            </div>

            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-slate-600 hover:text-slate-900"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <a
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          href="/"
        >
          <div className="p-2 bg-blue-600 rounded-lg">
            <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">P</span>
            </div>
          </div>
          <div className="font-bold text-xl text-slate-900">PlanningPoker</div>
        </a>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleLogin}
            variant="ghost"
            size="sm"
            className="text-slate-600 hover:text-slate-900"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Login
          </Button>
          <Button
            onClick={handleSignUp}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Sign Up
          </Button>
        </div>
      </div>
    </header>
  );
}
