import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from "react-router-dom"

export default function Header() {
    const navigate = useNavigate()
    const { isAuthenticated, user, logout } = useAuth()

    const handleLogin = () => {
        navigate('/login')
    }

    const handleSignUp = () => {
        navigate('/signup')
    }

    const handleLogout = () => {
        logout();
        navigate('/');
    }

    if (isAuthenticated) return (
        <header className="flex justify-between items-center p-4 border-b">
            <div className="font-bold text-xl">PlanningPoker</div>
            <div className="flex gap-2">
                <Button variant="ghost" className="text-sm">
                    {user?.username}
                </Button>
                <Button onClick={handleLogout} variant="ghost" className="text-sm">
                    Logout
                </Button>
            </div>
        </header >
    )

    return (
        <header className="flex justify-between items-center p-4 border-b">
            <div className="font-bold text-xl">PlanningPoker</div>
            <div className="flex gap-2">
                <Button onClick={handleLogin} variant="ghost" className="text-sm">
                    Login
                </Button>
                <Button onClick={handleSignUp} variant="default" className="bg-black text-white hover:bg-gray-800 text-sm">
                    Sign Up
                </Button>
            </div>
        </header>
    )
}
