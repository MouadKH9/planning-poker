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

// Mock data for participants
const mockParticipants: Participant[] = [
    { id: 1, name: "John Doe", avatar: "", vote: null },
    { id: 2, name: "Jane Smith", avatar: "", vote: null },
    { id: 3, name: "Bob Johnson", avatar: "", vote: null },
]

// Planning poker card values
const cardValues = ["1", "2", "3", "5", "8", "13", "21", "?"]

export default function RoomPage() {
    const { roomId } = useParams<{ roomId: string }>()
    const [participants, setParticipants] = useState<Participant[]>(mockParticipants)
    const [selectedCard, setSelectedCard] = useState<string | null>(null)
    const [isRevealed, setIsRevealed] = useState(false)
    const [isConnected, setIsConnected] = useState(true)

    // Ensure roomId is never undefined for our components
    const safeRoomId = roomId || "unknown"

    // Simulate WebSocket connection
    useEffect(() => {
        // In a real app, you would connect to a WebSocket here
        console.log(`Connecting to room ${safeRoomId}...`)

        // Simulate connection status
        const connectionTimer = setTimeout(() => {
            setIsConnected(true)
        }, 1000)

        return () => {
            clearTimeout(connectionTimer)
            // In a real app, you would disconnect from the WebSocket here
            console.log(`Disconnecting from room ${safeRoomId}...`)
        }
    }, [safeRoomId])

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
        setParticipants(updatedParticipants as Participant[])
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