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

function App() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/room/:roomId" element={<RoomPage />} />
            <Route path="/session-history" element={<SessionHistoryPage />} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
export default App;
