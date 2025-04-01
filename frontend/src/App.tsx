import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ThemeProvider } from './theme-provider'
import WelcomePage from './Pages/WelcomePage'
import RoomPage from './Pages/RoomPage'
import { Toaster } from './components/ui/sonner'
import PageNotFound from './Pages/PageNotFound'

function App() {
  return <ThemeProvider defaultTheme="light" storageKey="planning-poker-theme">
    <Router>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/room/:roomId" element={<RoomPage />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Router>
    <Toaster />
  </ThemeProvider>
}
export default App

