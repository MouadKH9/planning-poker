import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Pause, Square } from "lucide-react";
import { TimerState } from "@/types";

interface TimerProps {
  timerState: TimerState | null;
  canControl: boolean;
  onStartTimer: (duration?: number) => void;
  onStopTimer: () => void;
  onPauseTimer: () => void;
}

export function Timer({
  timerState,
  canControl,
  onStartTimer,
  onStopTimer,
  onPauseTimer,
}: TimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);
  const [pausedTimeRemaining, setPausedTimeRemaining] = useState<number>(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (timerState) {
      if ((timerState.is_active && !isPaused) && timerState.end_time) {
        // Timer is running - calculate from end time
        interval = setInterval(() => {
          const now = new Date().getTime();
          const endTime = new Date(timerState.end_time!).getTime();
          const remaining = Math.max(0, endTime - now);
          const remainingSeconds = Math.floor(remaining / 1000);

          setTimeRemaining(remainingSeconds);
          setPausedTimeRemaining(remainingSeconds);

          if (remaining <= 0 && !isExpired) {
            setIsExpired(true);
          }
        }, 1000);
      } else if (!timerState.is_active || isPaused) {
        // Timer is paused - maintain the last known time
        // Don't update the display time when paused
      }
    } else {
      // Timer is stopped
      setTimeRemaining(0);
      setPausedTimeRemaining(0);
      setIsExpired(false);
      setIsPaused(false);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [timerState, isExpired, isPaused]);

  // Handle timer pause events from WebSocket
  useEffect(() => {
    // Listen for pause events in the parent component and call this
    // This will be handled by the parent component's WebSocket listener
  }, []);

  // Reset expired state when timer restarts
  useEffect(() => {
    if (timerState?.is_active && !isPaused) {
      setIsExpired(false);
    }
  }, [timerState?.is_active, isPaused]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const getTimerStatus = () => {
    if (!timerState) return "stopped";
    if (isExpired) return "expired";
    if (isPaused || !timerState.is_active) return "paused";
    if (timerState.is_active) return "running";
    return "stopped";
  };

  const getStatusColor = () => {
    const status = getTimerStatus();
    switch (status) {
      case "running":
        return "bg-green-500 text-white";
      case "paused":
        return "bg-yellow-500 text-white";
      case "expired":
        return "bg-red-500 text-white animate-pulse";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getStatusText = () => {
    const status = getTimerStatus();
    switch (status) {
      case "running":
        return "Running";
      case "paused":
        return "Paused";
      case "expired":
        return "Expired";
      default:
        return "Stopped";
    }
  };

  const displayTime = () => {
    if (!timerState) return "--:--";
    
    const status = getTimerStatus();
    if (status === "paused") {
      return formatTime(pausedTimeRemaining);
    }
    
    return formatTime(timeRemaining);
  };

  // Expose pause function to parent component
  const handlePause = () => {
    setIsPaused(true);
    onPauseTimer();
  };

  const handleResume = () => {
    setIsPaused(false);
    onStartTimer();
  };

  if (!timerState && !canControl) {
    return null;
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Voting Timer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className={`text-3xl font-mono font-bold ${
            isExpired ? 'text-red-600 animate-pulse' : 
            getTimerStatus() === "paused" ? 'text-yellow-600' : 'text-gray-900'
          }`}>
            {displayTime()}
          </div>
          <Badge className={`mt-2 ${getStatusColor()}`}>
            {getStatusText()}
          </Badge>
        </div>

        {canControl && (
          <div className="flex gap-2 justify-center">
            {getTimerStatus() !== "running" ? (
              <Button
                onClick={() => getTimerStatus() === "paused" ? handleResume() : onStartTimer()}
                size="sm"
                className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4" />
                {getTimerStatus() === "paused" ? "Resume" : "Start"}
              </Button>
            ) : (
              <Button
                onClick={handlePause}
                size="sm"
                variant="secondary"
                className="flex items-center gap-1 bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            )}

            <Button
              onClick={onStopTimer}
              size="sm"
              variant="outline"
              className="flex items-center gap-1 border-red-300 text-red-600 hover:bg-red-50"
              disabled={!timerState}
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
          </div>
        )}

        {isExpired && (
          <div className="text-center p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-700 text-sm font-medium mb-1">
              ⏰ Time's up!
            </div>
            <div className="text-red-600 text-xs">
              Consider revealing cards or starting a new timer.
            </div>
          </div>
        )}

        {/* Timer duration info when not running */}
        {timerState && getTimerStatus() !== "running" && !isExpired && (
          <div className="text-center text-xs text-gray-500">
            Total duration: {formatTime(timerState.duration || 0)}
          </div>
        )}

        {/* Debug info - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-400 text-center">
            Status: {getTimerStatus()} | Active: {timerState?.is_active ? 'Yes' : 'No'} | Paused: {isPaused ? 'Yes' : 'No'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}