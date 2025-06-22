"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import Header from "./Header"
import { useAuth } from "@/contexts/AuthContext"
import { roomsApi } from "@/lib/api"

export default function WelcomePage() {
    const [roomCode, setRoomCode] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const navigate = useNavigate()
    const { isAuthenticated } = useAuth()

    const handleJoinRoom = async () => {
        if (!roomCode.trim()) {
            toast.error("Room code is required")
            return
        }

        setIsLoading(true)
        try {
            // In a real app, you would verify the room exists first
            // Example:
            // await roomsApi.getById(roomCode)

            // Navigate to the room
            navigate(`/room/${roomCode}`)
        } catch (error) {
            console.error("Failed to join room:", error)
            toast.error("Failed to join room", {
                description: "Room not found or network error"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateRoom = async () => {
        if (!isAuthenticated) {
            toast.info("Please sign up to create a room")
            navigate('/signup?createRoom=true')
            return
        }

        setIsLoading(true)
        try {
            // Create a room via API
            const newRoom = await roomsApi.create()
            navigate(`/room/${newRoom.code}`)
        } catch (error) {
            console.error("Failed to create room:", error)
            toast.error("Failed to create room", {
                description: "Please try again"
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full px-4">
                <div className="w-full space-y-8">
                    <h1 className="text-3xl font-bold text-center">
                        Join Planning
                        <br />
                        Session
                    </h1>

                    <div className="space-y-4">
                        <Input
                            placeholder="Enter room code"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value)}
                            className="w-full"
                            disabled={isLoading}
                        />

                        <Button
                            onClick={handleJoinRoom}
                            className="w-full bg-black text-white hover:bg-gray-800"
                            disabled={isLoading}
                        >
                            {isLoading ? "Joining..." : "Join Room"}
                        </Button>

                        <div className="text-center text-sm text-gray-500">or</div>

                        <Button
                            onClick={handleCreateRoom}
                            variant="outline"
                            className="w-full"
                            disabled={isLoading}
                        >
                            Create New Room
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    )
}

