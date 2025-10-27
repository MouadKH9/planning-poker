import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import WelcomePage from "./Pages/WelcomePage/WelcomePage";
import RoomPage from "./Pages/RoomPage";
import { Toaster } from "./components/ui/sonner";
import PageNotFound from "./Pages/PageNotFound";
import LoginPage from "./Pages/Auth/LoginPage/LoginPage";
import { AuthProvider } from "@/contexts/AuthContext";
import SignupPage from "./Pages/Auth/SignupPage/SignupPage";
import SessionHistoryPage from "@/Pages/SessionLogs/SessionHistoryPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Footer } from "@/components/Footer";

function App() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="flex flex-col min-h-screen">
          <Router>
            <div className="flex-1">
              <Routes>
                <Route path="/" element={<WelcomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/room/:roomId" element={<RoomPage />} />
                <Route path="/session-history" element={<SessionHistoryPage />} />
                <Route path="*" element={<PageNotFound />} />
              </Routes>
            </div>
            <Footer />
          </Router>
          <Toaster />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}
export default App;
