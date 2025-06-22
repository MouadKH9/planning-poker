"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { roomsApi } from "@/lib/api"

export default function SignupPage() {
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const navigate = useNavigate()
    const { register, isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/')
        }
    }, [isAuthenticated, navigate])

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            await register(username, email, password)
            const createRoom = new URLSearchParams(window.location.search).get('createRoom') === "true";
            if (createRoom) {
                const newRoom = await roomsApi.create()
                navigate(`/room/${newRoom.code}`)
                return;
            }
            navigate('/')
        } catch (error) {
            toast.error('Signup failed', {
                description: 'Could not create account. Please try again.',
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="flex justify-between items-center p-4 border-b">
                <div className="font-bold text-xl">PlanningPoker</div>
                <div className="flex gap-2">
                    <Button variant="ghost" className="text-sm" onClick={() => navigate('/login')}>
                        Login
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full px-4">
                <div className="w-full space-y-8">
                    <h1 className="text-3xl font-bold text-center">
                        Create Your Account
                    </h1>

                    <div className="space-y-4">
                        <Input
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full"
                            disabled={isLoading}
                        />

                        <Input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full"
                            disabled={isLoading}
                        />

                        <Input
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full"
                            disabled={isLoading}
                        />

                        <Button
                            onClick={handleSignup}
                            className="w-full bg-black text-white hover:bg-gray-800"
                            disabled={isLoading}
                        >
                            {isLoading ? "Signing up..." : "Sign Up"}
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    )
}
