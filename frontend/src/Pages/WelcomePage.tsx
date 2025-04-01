"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function WelcomePage() {
    const [roomCode, setRoomCode] = useState("")

    const handleJoinRoom = () => {
        // Handle joining a room with the provided code
        console.log("Joining room with code:", roomCode)
    }

    const handleCreateRoom = () => {
        // Handle creating a new room
        console.log("Creating new room")
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
                        />

                        <Button onClick={handleJoinRoom} className="w-full bg-black text-white hover:bg-gray-800">
                            Join Room
                        </Button>

                        <div className="text-center text-sm text-gray-500">or</div>

                        <Button onClick={handleCreateRoom} variant="outline" className="w-full">
                            Create New Room
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    )
}

