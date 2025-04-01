"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { Users, ChevronLeft, Copy } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"

// Mock data for participants
const mockParticipants = [
    { id: 1, name: "John Doe", avatar: "", vote: null },
    { id: 2, name: "Jane Smith", avatar: "", vote: null },
    { id: 3, name: "Bob Johnson", avatar: "", vote: null },
]

// Planning poker card values
const cardValues = ["1", "2", "3", "5", "8", "13", "21", "?"]

const RoomPage: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>()
    const navigate = useNavigate()
    const [participants, setParticipants] = useState(mockParticipants)
    const [selectedCard, setSelectedCard] = useState<string | null>(null)
    const [isRevealed, setIsRevealed] = useState(false)
    const [isConnected, setIsConnected] = useState(true)

    // Simulate WebSocket connection
    useEffect(() => {
        // In a real app, you would connect to a WebSocket here
        console.log(`Connecting to room ${roomId}...`)

        // Simulate connection status
        const connectionTimer = setTimeout(() => {
            setIsConnected(true)
        }, 1000)

        return () => {
            clearTimeout(connectionTimer)
            // In a real app, you would disconnect from the WebSocket here
            console.log(`Disconnecting from room ${roomId}...`)
        }
    }, [roomId])

    const handleVote = (value: string) => {
        setSelectedCard(value)

        // In a real app, you would send this vote to the server via WebSocket
        console.log(`Voted: ${value}`)
    }

    const handleReveal = () => {
        setIsRevealed(true)

        // In a real app, you would send a reveal command to the server
        // And update all participants' votes
        const updatedParticipants = participants.map((p) => ({
            ...p,
            vote: Math.floor(Math.random() * cardValues.length),
        }))
        setParticipants(updatedParticipants)
    }

    const handleReset = () => {
        setIsRevealed(false)
        setSelectedCard(null)

        // Reset all votes
        const resetParticipants = participants.map((p) => ({
            ...p,
            vote: null,
        }))
        setParticipants(resetParticipants)
    }

    const copyRoomLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`)
        toast({
            title: "Room link copied!",
            description: "Share this link with your team members",
        })
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="flex justify-between items-center p-4 border-b">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="font-bold text-xl">PlanningPoker</div>
                </div>
                <div className="flex items-center gap-4">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={copyRoomLink}>
                                    <span className="font-mono">{roomId}</span>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Copy room link</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <div className="flex -space-x-2">
                        {participants.map((participant) => (
                            <Avatar key={participant.id} className="border-2 border-white h-8 w-8">
                                <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                        ))}
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-zinc-100 border-2 border-white">
                            <Users className="h-4 w-4" />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col p-4 md:p-8 max-w-5xl mx-auto w-full">
                {/* Connection Status */}
                {!isConnected && (
                    <motion.div
                        className="bg-yellow-50 text-yellow-800 p-2 rounded-md mb-4 text-center"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        Connecting to room...
                    </motion.div>
                )}

                {/* Room Info */}
                <motion.div
                    className="mb-8 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-2xl font-bold">Planning Session</h1>
                    <p className="text-zinc-500">Select a card to cast your vote</p>
                </motion.div>

                {/* Participants and their votes */}
                <motion.div
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    {participants.map((participant) => (
                        <motion.div
                            key={participant.id}
                            className="bg-white rounded-lg p-4 shadow-sm border flex flex-col items-center"
                            whileHover={{ y: -5 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <Avatar className="h-16 w-16 mb-2">
                                <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <p className="font-medium">{participant.name}</p>
                            <div className="mt-2 h-12 flex items-center justify-center">
                                {participant.vote !== null ? (
                                    isRevealed ? (
                                        <motion.div
                                            className="bg-zinc-100 h-10 w-8 rounded flex items-center justify-center font-bold"
                                            initial={{ rotateY: 180, opacity: 0 }}
                                            animate={{ rotateY: 0, opacity: 1 }}
                                            transition={{ duration: 0.5 }}
                                        >
                                            {cardValues[participant.vote]}
                                        </motion.div>
                                    ) : (
                                        <motion.div className="bg-zinc-800 h-10 w-8 rounded" whileHover={{ scale: 1.05 }} />
                                    )
                                ) : (
                                    <span className="text-zinc-400 text-sm">No vote</span>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Controls */}
                <motion.div
                    className="flex justify-center mb-8 gap-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                >
                    {isRevealed ? (
                        <Button onClick={handleReset} variant="outline" className="px-8">
                            Reset Votes
                        </Button>
                    ) : (
                        <Button onClick={handleReveal} className="bg-zinc-900 hover:bg-zinc-800 px-8" disabled={!selectedCard}>
                            Reveal Cards
                        </Button>
                    )}
                </motion.div>

                {/* Card Selection */}
                <motion.div
                    className="mt-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                >
                    <h2 className="text-lg font-medium mb-4 text-center">Your Vote</h2>
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-4">
                        <AnimatePresence>
                            {cardValues.map((value) => (
                                <motion.div
                                    key={value}
                                    onClick={() => handleVote(value)}
                                    className={`aspect-[2/3] cursor-pointer rounded-lg border-2 flex items-center justify-center text-xl font-bold ${selectedCard === value ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300"
                                        }`}
                                    whileHover={{ y: -10 }}
                                    whileTap={{ scale: 0.95 }}
                                    layout
                                >
                                    {value}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </main>
        </div>
    )
}

export default RoomPage

