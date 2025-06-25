"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/Pages/WelcomePage/Header";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
      const createRoom = new URLSearchParams(window.location.search).get("createRoom") === "true";
      if (createRoom) {
        navigate("/?createRoom=true");
        return;
      }
      navigate("/");
    } catch (error) {
      toast.error("Login failed", {
        description: "Invalid email or password",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = email.trim() && password.trim();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full px-4">
        <div className="w-full space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Welcome Back
            </h1>
            <p className="text-muted-foreground">
              Sign in to your Planning Poker account
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                disabled={isLoading}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-10"
                  disabled={isLoading}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isLoading || !isFormValid}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button
                onClick={() => navigate("/signup")}
                className="text-primary hover:underline font-medium"
                disabled={isLoading}
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}