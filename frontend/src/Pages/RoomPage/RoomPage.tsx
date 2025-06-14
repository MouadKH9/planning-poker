"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { RoomHeader } from "./RoomHeader";
import { ConnectionStatus } from "./ConnectionStatus";
import { ParticipantCard } from "./ParticipantCard";
import { VotingControls } from "./VotingControls";
import { CardSelector } from "./CardSelector";
import {
  PlanningPokerWebSocket,
  type RoomState,
  type Participant,
  type VotingStats,
} from "@/types";

// Planning poker card values
const cardValues = [
  "0.5",
  "1",
  "2",
  "3",
  "5",
  "8",
  "13",
  "21",
  "34",
  "55",
  "89",
  "?",
  "☕",
];

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [roomData, setRoomData] = useState<RoomState["room"] | null>(null);
  const [votingStats, setVotingStats] = useState<VotingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const wsRef = useRef<PlanningPokerWebSocket | null>(null);

  // Ensure roomId is never undefined
  const safeRoomId = roomId || "unknown";

  // WebSocket connection
  useEffect(() => {
    if (!roomId) return;

    const ws = new PlanningPokerWebSocket(roomId);
    wsRef.current = ws;

    // Set up event listeners
    ws.on("room_state", (data: RoomState) => {
      console.log("Room state received:", data);
      setRoomData(data.room);
      setParticipants(data.participants);
      setIsHost(data.is_host);
      setIsLoading(false);
    });

    ws.on("user_connected", (data) => {
      toast.success(`${data.username} joined the room`);
    });

    ws.on("user_disconnected", (data) => {
      toast.info(`${data.username} left the room`);
    });

    ws.on("vote_submitted", (data) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.user_id === data.user_id ? { ...p, has_voted: data.has_voted } : p
        )
      );
      toast.success(`${data.username} voted`);
    });

    ws.on("cards_revealed", (data) => {
      setParticipants(data.participants);
      setVotingStats(data.statistics);
      setIsRevealed(true);
      toast.success("Cards revealed!");
    });

    ws.on("votes_reset", () => {
      setParticipants((prev) =>
        prev.map((p) => ({
          ...p,
          card_selection: null,
          has_voted: false,
        }))
      );
      setSelectedCard(null);
      setIsRevealed(false);
      setVotingStats(null);
      toast.info("Votes reset");
    });

    ws.on("round_started", () => {
      setParticipants((prev) =>
        prev.map((p) => ({
          ...p,
          card_selection: null,
          has_voted: false,
        }))
      );
      setSelectedCard(null);
      setIsRevealed(false);
      setVotingStats(null);
      toast.success("New round started!");
    });

    ws.on("participant_skipped", (data) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === data.participant_id
            ? { ...p, card_selection: "SKIPPED", has_voted: true }
            : p
        )
      );
      toast.info("Participant skipped");
    });

    ws.on("chat_message", (data) => {
      // Handle chat messages (you can implement a chat component)
      console.log("Chat message:", data);
    });

    ws.on("error", (data) => {
      toast.error(data.message);
    });

    ws.on("connection_failed", (data) => {
      toast.error("Connection failed: " + data.reason);
      setIsConnected(false);
    });

    // Connect to WebSocket
    ws.connect()
      .then(() => {
        setIsConnected(true);
      })
      .catch((error) => {
        console.error("Failed to connect to WebSocket:", error);
        toast.error("Failed to connect to room");
        setIsLoading(false);
      });

    // Cleanup on unmount
    return () => {
      ws.disconnect();
    };
  }, [roomId]);

  const handleVote = (value: string) => {
    setSelectedCard(value);
    wsRef.current?.submitVote(value);
  };

  const handleReveal = () => {
    wsRef.current?.revealCards();
  };

  const handleReset = () => {
    wsRef.current?.resetVotes();
  };

  const handleStartRound = () => {
    wsRef.current?.startRound();
  };

  const handleSkipParticipant = (participantId: number) => {
    wsRef.current?.skipParticipant(participantId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-2">Connecting to room...</p>
        </div>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Room not found</h1>
          <p className="mt-2">
            The room you're looking for doesn't exist or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <RoomHeader
        roomId={safeRoomId}
        participants={participants}
        isHost={isHost}
        onSkipParticipant={handleSkipParticipant}
      />

      <main className="flex-1 flex flex-col p-4 md:p-8 max-w-5xl mx-auto w-full">
        <ConnectionStatus isConnected={isConnected} />

        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl font-bold">Planning Session</h1>
          <p className="text-zinc-500">
            Room: <span className="font-mono font-bold">{roomData.code}</span>
            {isHost && <span className="ml-2 text-blue-600">(Host)</span>}
          </p>
          <p className="text-zinc-500">Select a card to cast your vote</p>
        </motion.div>

        {/* Voting Statistics */}
        {isRevealed && votingStats && (
          <motion.div
            className="mb-6 p-4 bg-blue-50 rounded-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="font-bold mb-2">Voting Results</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-zinc-600">Average:</span>
                <span className="ml-2 font-bold">{votingStats.average}</span>
              </div>
              <div>
                <span className="text-zinc-600">Range:</span>
                <span className="ml-2 font-bold">
                  {votingStats.min} - {votingStats.max}
                </span>
              </div>
              <div>
                <span className="text-zinc-600">Total Votes:</span>
                <span className="ml-2 font-bold">
                  {votingStats.total_votes}
                </span>
              </div>
              <div>
                <span className="text-zinc-600">Consensus:</span>
                <span
                  className={`ml-2 font-bold ${
                    votingStats.consensus ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {votingStats.consensus ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </motion.div>
        )}

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
              isHost={isHost}
              onSkip={() => handleSkipParticipant(participant.id)}
            />
          ))}
        </motion.div>

        <VotingControls
          isRevealed={isRevealed}
          selectedCard={selectedCard}
          isHost={isHost}
          onReveal={handleReveal}
          onReset={handleReset}
          onStartRound={handleStartRound}
        />

        <CardSelector
          cardValues={cardValues}
          selectedCard={selectedCard}
          onVote={handleVote}
        />
      </main>
    </div>
  );
}
