"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Users, Crown, Shield, Coffee, Clock, BarChart3 } from "lucide-react";
import { ConnectionStatus } from "./ConnectionStatus";
import { ParticipantCard } from "./ParticipantCard";
import { VotingControls } from "./VotingControls";
import { CardSelector } from "./CardSelector";
import { Timer } from "@/components/Timer";
import {
  PlanningPokerWebSocket,
  type RoomState,
  type Participant,
  type VotingStats,
  type TimerState,
} from "@/types";
import { useAuth } from "@/contexts/AuthContext";

// Planning poker card values
const defaultCardValues = ["1", "2", "3", "5", "8", "13", "21", "?", "☕"];

export default function RoomPage() {
  // ...existing state variables...
  const { roomId } = useParams<{ roomId: string }>();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [roomData, setRoomData] = useState<RoomState["room"] | null>(null);
  const [votingStats, setVotingStats] = useState<VotingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "participant">(
    "participant"
  );
  const [canControl, setCanControl] = useState(false);
  const [cardValues, setCardValues] = useState<string[]>(defaultCardValues);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [timerState, setTimerState] = useState<TimerState | null>(null);

  const wsRef = useRef<PlanningPokerWebSocket | null>(null);
  const safeRoomId = roomId || "unknown";
  const { user } = useAuth();

  // ...existing useEffect and handlers...
  useEffect(() => {
    if (!roomId) {
      setConnectionError("Room ID is missing");
      setIsLoading(false);
      return;
    }

    console.log("Initializing WebSocket connection for room:", roomId);

    const ws = new PlanningPokerWebSocket(roomId, user);
    wsRef.current = ws;

    ws.on("room_state", (data: RoomState) => {
      console.log("Room state received:", data);
      setRoomData(data.room);
      setParticipants(data.participants);
      setCardValues(data.card_values || defaultCardValues);
      setIsHost(data.is_host);
      setUserRole(data.user_role || "participant");
      setCanControl(data.can_control || false);
      setIsAnonymous(data.is_anonymous || false);
      setIsLoading(false);
    });

    ws.on("user_connected", (data) => {
      const userType = data.is_anonymous
        ? `🎭 ${data.username} (Guest)`
        : data.username;
      toast.success(`${userType} joined the room`);
    });

    ws.on("user_disconnected", (data) => {
      const userType = data.is_anonymous
        ? `🎭 ${data.username} (Guest)`
        : data.username;
      toast.info(`${userType} left the room`);
    });

    ws.on("vote_submitted", (data) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.user_id === data.user_id ? { ...p, has_voted: true } : p
        )
      );
      const userType = data.is_anonymous
        ? `🎭 ${data.username} (Guest)`
        : data.username;
      toast.success(`${userType} voted`);
    });

    ws.on("cards_revealed", (data) => {
      setParticipants(data.participants);
      setVotingStats(data.statistics);
      setIsRevealed(true);

      if (data.auto_revealed) {
        toast.success("Cards auto-revealed - everyone voted!");
      } else {
        toast.success("Cards revealed!");
      }
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

    ws.on("error", (data) => {
      toast.error(data.message);
    });

    ws.on("connection_failed", (data) => {
      toast.error("Connection failed: " + data.reason);
      setIsConnected(false);
      setConnectionError(data.reason);

      if (data.reason.includes("Authentication failed")) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("userData");
        window.location.href = "/login";
      }
    });

    ws.on("timer_started", (data) => {
      setTimerState({
        is_active: true,
        start_time: data.start_time,
        end_time: new Date(
          new Date(data.start_time).getTime() + data.duration * 1000
        ).toISOString(),
        duration: data.duration,
      });
      toast.success("Timer started!");
    });

    ws.on("timer_stopped", () => {
      setTimerState(null);
      toast.info("Timer stopped");
    });

    ws.on("timer_paused", () => {
      if (timerState) {
        setTimerState({
          ...timerState,
          is_active: false,
        });
      }
      toast.info("Timer paused");
    });

    ws.on("timer_expired", () => {
      toast.warning("⏰ Time's up!", {
        description: "Consider revealing cards or starting a new timer",
      });
    });

    ws.on("room_auto_closed", (data) => {
      toast.error("Room closed", {
        description: data.reason,
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
    });
    // Add this inside the useEffect where WebSocket event listeners are set up

    ws.on("timer_paused", () => {
      setTimerState((prev) =>
        prev
          ? {
              ...prev,
              is_active: false,
            }
          : null
      );
      toast.info("Timer paused");
    });

    ws.connect()
      .then(() => {
        console.log("WebSocket connected successfully");
        setIsConnected(true);
        setConnectionError(null);
      })
      .catch((error) => {
        console.error("Failed to connect to WebSocket:", error);
        const errorMessage = "Failed to connect to room.";
        toast.error(errorMessage);
        setConnectionError(errorMessage);
        setIsLoading(false);
      });

    return () => {
      ws.disconnect();
    };
  }, [roomId, user]);

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

  const handleStartTimer = (duration?: number) => {
    wsRef.current?.startTimer(duration);
  };

  const handleStopTimer = () => {
    wsRef.current?.stopTimer();
  };

  const handlePauseTimer = () => {
    wsRef.current?.pauseTimer();
  };

  // Loading state with better animation
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Connecting to Room
          </h2>
          <p className="text-gray-600">
            Please wait while we establish the connection...
          </p>
          {connectionError && (
            <motion.div
              className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-red-700 text-sm">{connectionError}</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  // Error state
  if (connectionError && !isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 bg-red-500 rounded-full"></div>
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-3">
            Connection Error
          </h1>
          <p className="text-red-700 mb-2">{connectionError}</p>
          <p className="text-gray-600 text-sm mb-6">
            Make sure the backend server is running on localhost:8000
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Retry Connection
          </button>
        </motion.div>
      </div>
    );
  }

  // Room not found
  if (!roomData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">
            Room Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            The room you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Go Home
          </button>
        </motion.div>
      </div>
    );
  }

  const canPerformAdminActions = canControl || userRole === "admin";
  const votedCount = participants.filter((p) => p.has_voted).length;
  const totalParticipants = participants.length;
  const allVoted = votedCount === totalParticipants && totalParticipants > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <a
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                href="/"
              >
                <div className="p-2 bg-blue-600 rounded-lg">
                  <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">P</span>
                  </div>
                </div>
                <div className="font-bold text-xl text-slate-900">
                  PlanningPoker
                </div>
              </a>

              <div className="hidden sm:flex items-center space-x-2 text-sm">
                <span className="px-3 py-1 bg-gray-100 rounded-full font-mono font-medium">
                  {roomData.code}
                </span>
                {roomData.project_name && (
                  <span className="text-gray-600">
                    • {roomData.project_name}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <ConnectionStatus isConnected={isConnected} />

              {/* User role badges */}
              <div className="flex items-center space-x-2">
                {isHost && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <Crown className="w-3 h-3 mr-1" />
                    Host
                  </span>
                )}
                {userRole === "admin" && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </span>
                )}
                {isAnonymous && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    🎭 Guest
                  </span>
                )}
              </div>

              {/* Participants count */}
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{participants.length}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Session info and progress */}
            <motion.div
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Current Session
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Select your estimation
                  </p>
                </div>

                {/* Voting progress */}
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {votedCount}
                    <span className="text-gray-400">/{totalParticipants}</span>
                  </div>
                  <p className="text-sm text-gray-600">votes cast</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <motion.div
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{
                    width:
                      totalParticipants > 0
                        ? `${(votedCount / totalParticipants) * 100}%`
                        : "0%",
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              {/* Status indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      allVoted ? "bg-green-500" : "bg-yellow-500"
                    }`}
                  />
                  <span className="text-sm text-gray-600">
                    {allVoted ? "All votes received" : "Waiting for votes..."}
                  </span>
                </div>

                {timerState && (
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Timer active</span>
                  </div>
                )}
              </div>

              {/* Anonymous user notice */}
              {isAnonymous && (
                <motion.div
                  className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-purple-600">🎭</div>
                    <div className="flex-1">
                      <p className="text-purple-800 font-medium text-sm">
                        You're participating as{" "}
                        <strong>{user?.username || "Guest"}</strong>
                      </p>
                      <p className="text-purple-700 text-xs mt-1">
                        Consider{" "}
                        <a
                          href="/signup"
                          className="underline font-medium hover:text-purple-900"
                        >
                          signing up
                        </a>{" "}
                        for a permanent account with more features.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Voting Results */}
            <AnimatePresence>
              {isRevealed && votingStats && (
                <motion.div
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center space-x-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Voting Results
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {votingStats.average}
                      </div>
                      <div className="text-sm text-blue-700">Average</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {votingStats.min} - {votingStats.max}
                      </div>
                      <div className="text-sm text-green-700">Range</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {votingStats.total_votes}
                      </div>
                      <div className="text-sm text-purple-700">Total Votes</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                      <div
                        className={`text-2xl font-bold ${
                          votingStats.consensus
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {votingStats.consensus ? "✓" : "✗"}
                      </div>
                      <div className="text-sm text-gray-700">Consensus</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Participants */}
            <motion.div
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Participants
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
              </div>
            </motion.div>

            {/* Controls */}
            <motion.div
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <VotingControls
                isRevealed={isRevealed}
                selectedCard={selectedCard}
                isHost={isHost}
                isAdmin={userRole === "admin"}
                canControl={canPerformAdminActions}
                onReveal={handleReveal}
                onReset={handleReset}
                onStartRound={handleStartRound}
              />
            </motion.div>

            {/* Card Selector */}
            <motion.div
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Your Vote
              </h3>
              <CardSelector
                cardValues={cardValues}
                selectedCard={selectedCard}
                onVote={handleVote}
              />
            </motion.div>
          </div>

          {/* Timer sidebar */}
          {roomData?.enable_timer && (
            <motion.div
              className="lg:col-span-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="sticky top-8">
                <Timer
                  timerState={timerState}
                  canControl={canPerformAdminActions}
                  onStartTimer={handleStartTimer}
                  onStopTimer={handleStopTimer}
                  onPauseTimer={handlePauseTimer}
                />
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
