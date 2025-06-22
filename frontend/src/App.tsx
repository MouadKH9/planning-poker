import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ThemeProvider } from './theme-provider'
import WelcomePage from './Pages/WelcomePage/WelcomePage'
import RoomPage from './Pages/RoomPage'
import { Toaster } from './components/ui/sonner'
import PageNotFound from './Pages/PageNotFound'
import LoginPage from "./Pages/Auth/LoginPage/LoginPage"
import { AuthProvider } from "@/contexts/AuthContext"
import SignupPage from "./Pages/Auth/SignupPage/SignupPage"

function App() {
  return <ThemeProvider defaultTheme="light" storageKey="planning-poker-theme">
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/room/:roomId" element={<RoomPage />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
      <Toaster />
    </AuthProvider>
  </ThemeProvider>
}
export default App

