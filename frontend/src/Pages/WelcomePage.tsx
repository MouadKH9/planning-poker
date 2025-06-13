"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { roomsApi } from "@/lib"
import { toast } from "sonner"

export default function WelcomePage() {
    const [roomCode, setRoomCode] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const navigate = useNavigate()

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
        setIsLoading(true)
        try {
            // In a real app, you would create a room via API
            // Example:
            // const newRoom = await roomsApi.create("New Planning Session")
            // navigate(`/room/${newRoom.id}`)

            // For demo purposes, generate a random room code
            const randomRoomId = Math.random().toString(36).substring(2, 8)
            navigate(`/room/${randomRoomId}`)
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
            {/* Header */}
            <header className="flex justify-between items-center p-4 border-b">
                <div className="font-bold text-xl">PlanningPoker</div>
                <div className="flex gap-2">
                    <Button variant="ghost" className="text-sm">
                        Login
                    </Button>
                    <Button variant="default" className="bg-black text-white hover:bg-gray-800 text-sm">
                        Sign Up
                    </Button>
                </div>
            </header>

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
                            {isLoading ? "Creating..." : "Create New Room"}
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    )
}

