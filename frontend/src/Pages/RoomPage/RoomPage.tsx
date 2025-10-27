"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Users, Crown, Shield, Clock, BarChart3, Diamond } from "lucide-react";
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
import { ThemeToggle } from "@/components/ui/theme-toggle";

// Planning poker card values
const defaultCardValues = ["1", "2", "3", "5", "8", "13", "21", "?", "☕"];

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
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "participant">(
    "participant"
  );
  const [canControl, setCanControl] = useState(false);
  const [cardValues, setCardValues] = useState<string[]>(defaultCardValues);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [timerState, setTimerState] = useState<TimerState | null>(null);

  const wsRef = useRef<PlanningPokerWebSocket | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!roomId) {
      setConnectionError("Room ID is missing");
      setIsLoading(false);
      return;
    }

    console.log("Initializing WebSocket connection for room:", roomId);

    const ws = new PlanningPokerWebSocket(roomId);
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

      // Update timer state if provided
      if (data.timer_state) {
        setTimerState(data.timer_state);
      } else {
        setTimerState(null);
      }

      // Determine if cards are revealed based on room status
      const cardsRevealed = data.room.status === "COMPLETED";
      setIsRevealed(cardsRevealed);

      // Calculate voting stats if cards are revealed
      if (cardsRevealed && data.participants.length > 0) {
        const numericVotes = data.participants
          .filter((p) => p.card_selection && p.card_selection !== "SKIPPED")
          .map((p) => p.card_selection)
          .filter((v) => v && !isNaN(parseFloat(v)))
          .map((v) => parseFloat(v!));

        if (numericVotes.length > 0) {
          const average = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;
          const min = Math.min(...numericVotes);
          const max = Math.max(...numericVotes);
          const consensus = new Set(numericVotes).size === 1;

          setVotingStats({
            average: Math.round(average * 100) / 100,
            min,
            max,
            consensus,
            total_votes: data.participants.filter((p) => p.card_selection).length,
          });
        } else {
          setVotingStats({
            average: 0,
            min: 0,
            max: 0,
            consensus: false,
            total_votes: data.participants.filter((p) => p.card_selection).length,
          });
        }
      } else {
        setVotingStats(null);
      }

      // If we're anonymous and received a session ID, ensure it's stored
      if (data.is_anonymous && data.anonymous_session_id) {
        const storedSessionId = localStorage.getItem(
          "planning_poker_anonymous_session_id"
        );
        if (storedSessionId !== data.anonymous_session_id) {
          localStorage.setItem(
            "planning_poker_anonymous_session_id",
            data.anonymous_session_id
          );
          console.log("Updated anonymous session ID:", data.anonymous_session_id);
        }
      }
    });

    // Notification events (toast messages only, no state updates)
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

    // Note: All state updates now happen through room_state event
    // These events are kept for backward compatibility but don't update state

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

    ws.on("room_auto_closed", (data) => {
      toast.error("Room closed", {
        description: data.reason,
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
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

  // Loading state with better animation and dark mode support
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative mb-6 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-muted rounded-full"></div>
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0"></div>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Connecting to Room
          </h2>
          <p className="text-muted-foreground">
            Please wait while we establish the connection...
          </p>
          {connectionError && (
            <motion.div
              className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-destructive text-sm">{connectionError}</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  // Error state with dark mode support
  if (connectionError && !isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-destructive/5 to-background flex items-center justify-center p-4">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 bg-destructive rounded-full"></div>
          </div>
          <h1 className="text-2xl font-bold text-destructive mb-3">
            Connection Error
          </h1>
          <p className="text-destructive mb-2">{connectionError}</p>
          <p className="text-muted-foreground text-sm mb-6">
            Make sure the backend server is running on localhost:8000
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors font-medium"
          >
            Retry Connection
          </button>
        </motion.div>
      </div>
    );
  }

  // Room not found with dark mode support
  if (!roomData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Room Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            The room you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <a
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                href="/"
              >
                <div className="p-1 bg-primary rounded-md">
                  <div className="w-6 h-8 bg-primary-foreground rounded-sm flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">
                      <Diamond className="w-4 h-8" />
                    </span>
                  </div>
                </div>
                <div className="font-bold text-xl text-foreground">
                  PlanningPoker
                </div>
              </a>

              <div className="hidden sm:flex items-center space-x-2 text-sm">
                <span className="px-3 py-1 bg-muted rounded-full font-mono font-medium text-foreground">
                  {roomData.code}
                </span>
                {roomData.project_name && (
                  <span className="text-muted-foreground">
                    • {roomData.project_name}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <ConnectionStatus isConnected={isConnected} />

              {/* User role badges */}
              <div className="flex items-center space-x-2">
                {isHost && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <Crown className="w-3 h-3 mr-1" />
                    Host
                  </span>
                )}
                {userRole === "admin" && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </span>
                )}
                {isAnonymous && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    🎭 Guest
                  </span>
                )}
              </div>

              {/* Participants count */}
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
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
              className="bg-card rounded-xl shadow-sm border border-border p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Current Session
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Select your estimation
                  </p>
                </div>

                {/* Voting progress */}
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">
                    {votedCount}
                    <span className="text-muted-foreground">
                      /{totalParticipants}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">votes cast</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2 mb-4">
                <motion.div
                  className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full"
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
                    className={`w-2 h-2 rounded-full ${allVoted ? "bg-green-500" : "bg-yellow-500"
                      }`}
                  />
                  <span className="text-sm text-muted-foreground">
                    {allVoted ? "All votes received" : "Waiting for votes..."}
                  </span>
                </div>

                {timerState && (
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Timer active</span>
                  </div>
                )}
              </div>

              {/* Anonymous user notice */}
              {isAnonymous && (
                <motion.div
                  className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-purple-600 dark:text-purple-400">
                      🎭
                    </div>
                    <div className="flex-1">
                      <p className="text-purple-800 dark:text-purple-200 font-medium text-sm">
                        You're participating as{" "}
                        <strong>{user?.username || "Guest"}</strong>
                      </p>
                      <p className="text-purple-700 dark:text-purple-300 text-xs mt-1">
                        Consider{" "}
                        <a
                          href="/signup"
                          className="underline font-medium hover:text-purple-900 dark:hover:text-purple-100"
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
                  className="bg-card rounded-xl shadow-sm border border-border p-6"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center space-x-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">
                      Voting Results
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {votingStats.average}
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        Average
                      </div>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {votingStats.min} - {votingStats.max}
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-300">
                        Range
                      </div>
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {votingStats.total_votes}
                      </div>
                      <div className="text-sm text-purple-700 dark:text-purple-300">
                        Total Votes
                      </div>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-center">
                      <div
                        className={`text-2xl font-bold ${votingStats.consensus
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                          }`}
                      >
                        {votingStats.consensus ? "✓" : "✗"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Consensus
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Participants */}
            <motion.div
              className="bg-card rounded-xl shadow-sm border border-border p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Participants
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
              className="bg-card rounded-xl shadow-sm border border-border p-6"
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
              className="bg-card rounded-xl shadow-sm border border-border p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-lg font-semibold text-foreground mb-4">
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
