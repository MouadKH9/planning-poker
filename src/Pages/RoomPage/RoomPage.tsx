"use client"

import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { motion } from "framer-motion"
import { RoomHeader } from "./RoomHeader"
import { ConnectionStatus } from "./ConnectionStatus"
import { ParticipantCard } from "./ParticipantCard"
import { VotingControls } from "./VotingControls"
import { CardSelector } from "./CardSelector"
import type { Participant } from "./types"
import { roomsApi, participantsApi } from "@/lib"
import { toast } from "sonner"

// Planning poker card values
const cardValues = ["1", "2", "3", "5", "8", "13", "21", "?"]

export default function RoomPage() {
    const { roomId } = useParams<{ roomId: string }>()
    const [participants, setParticipants] = useState<Participant[]>([])
    const [selectedCard, setSelectedCard] = useState<string | null>(null)
    const [isRevealed, setIsRevealed] = useState(false)
    const [isConnected, setIsConnected] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // Ensure roomId is never undefined for our components
    const safeRoomId = roomId || "unknown"

    // Load room data
    useEffect(() => {
        const fetchRoomData = async () => {
            if (!roomId) return

            setIsLoading(true)
            try {
                // In a real app, these API calls would be implemented
                // const roomData = await roomsApi.getById(roomId)
                // const participants = await roomsApi.getParticipants(roomId)

                // Using mock data for now
                const mockParticipants: Participant[] = [
                    { id: 1, name: "John Doe", avatar: "", vote: null },
                    { id: 2, name: "Jane Smith", avatar: "", vote: null },
                    { id: 3, name: "Bob Johnson", avatar: "", vote: null },
                ]
                setParticipants(mockParticipants)
                setIsConnected(true)
            } catch (error) {
                console.error("Failed to fetch room data:", error)
                toast.error("Failed to load room data", {
                    description: "Please check your connection and try again"
                })
            } finally {
                setIsLoading(false)
            }
        }

        fetchRoomData()
    }, [roomId])

    const handleVote = async (value: string) => {
        setSelectedCard(value)

        // In a real app, you would send this vote to the server via API
        // Example implementation:
        // try {
        //     const voteValue = cardValues.indexOf(value)
        //     const userId = 1 // This would be the current user's ID
        //     await participantsApi.submitVote(safeRoomId, userId, voteValue)
        // } catch (error) {
        //     console.error("Failed to submit vote:", error)
        //     toast.error("Failed to submit vote", {
        //         description: "Please try again"
        //     })
        // }

        console.log(`Voted: ${value}`)
    }

    const handleReveal = async () => {
        setIsRevealed(true)

        // In a real app, you would call an API to reveal votes
        // Example implementation:
        // try {
        //     const updatedParticipants = await participantsApi.revealVotes(safeRoomId)
        //     setParticipants(updatedParticipants)
        // } catch (error) {
        //     console.error("Failed to reveal votes:", error)
        //     toast.error("Failed to reveal votes", {
        //         description: "Please try again"
        //     })
        // }

        // Mock implementation for demo
        const updatedParticipants = participants.map((p) => ({
            ...p,
            vote: Math.floor(Math.random() * cardValues.length),
        }))
        setParticipants(updatedParticipants as Participant[])
    }

    const handleReset = async () => {
        setIsRevealed(false)
        setSelectedCard(null)

        // In a real app, you would call an API to reset votes
        // Example implementation:
        // try {
        //     await participantsApi.resetVotes(safeRoomId)
        //     const resetParticipants = await roomsApi.getParticipants(safeRoomId)
        //     setParticipants(resetParticipants)
        // } catch (error) {
        //     console.error("Failed to reset votes:", error)
        //     toast.error("Failed to reset votes", {
        //         description: "Please try again"
        //     })
        // }

        // Mock implementation for demo
        const resetParticipants = participants.map((p) => ({
            ...p,
            vote: null,
        }))
        setParticipants(resetParticipants)
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                    <p className="mt-2">Loading room...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col">
            <RoomHeader roomId={safeRoomId} participants={participants} />

            <main className="flex-1 flex flex-col p-4 md:p-8 max-w-5xl mx-auto w-full">
                <ConnectionStatus isConnected={isConnected} />

                <motion.div
                    className="mb-8 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-2xl font-bold">Planning Session</h1>
                    <p className="text-zinc-500">Select a card to cast your vote</p>
                </motion.div>

                <motion.div
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    {participants.map((participant) => (
                        <ParticipantCard
                            key={participant.id}
                            participant={participant}
                            isRevealed={isRevealed}
                            cardValues={cardValues}
                        />
                    ))}
                </motion.div>

                <VotingControls
                    isRevealed={isRevealed}
                    selectedCard={selectedCard}
                    onReveal={handleReveal}
                    onReset={handleReset}
                />

                <CardSelector
                    cardValues={cardValues}
                    selectedCard={selectedCard}
                    onVote={handleVote}
                />
            </main>
        </div>
    )
} 