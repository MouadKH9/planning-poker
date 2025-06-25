export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface RoomState {
  room: {
    id: number;
    code: string;
    project_name: string;
    point_system: string;
    status: string;
    host_username: string;
    enable_timer?: boolean;
    timer_duration?: number;
  };
  participants: Participant[];
  card_values: string[];
  timer_state?: TimerState | null;
  is_host: boolean;
  user_role?: "admin" | "participant";
  can_control?: boolean;
  is_anonymous?: boolean;
  current_user?: {
    id: number | null;
    username: string;
    is_anonymous?: boolean;
  };
}

export interface TimerState {
  is_active: boolean;
  start_time: string | null;
  end_time: string | null;
  duration: number;
}

export interface Participant {
  id: number;
  user_id: number;
  username: string;
  card_selection: string | null;
  has_voted: boolean;
  vote: number | null;
  is_anonymous?: boolean;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: "admin" | "participant";
  is_admin: boolean;
}

export interface VotingStats {
  average: number;
  min: number;
  max: number;
  consensus: boolean;
  total_votes: number;
}

export class PlanningPokerWebSocket {
  private ws: WebSocket | null = null;
  private roomId: string;

  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 2000;
  private isConnecting = false;
  private isManuallyDisconnected = false;

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  connect(): Promise<void> {
    if (this.isConnecting) {
      return Promise.reject(new Error("Connection already in progress"));
    }

    this.isConnecting = true;
    this.isManuallyDisconnected = false;

    return new Promise((resolve, reject) => {
      const token = localStorage.getItem("access_token");
      const wsBaseUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8000";

      // Build WebSocket URL - include token if available, otherwise connect anonymously
      let wsUrl = `${wsBaseUrl}/ws/rooms/${this.roomId}/`;
      if (token) {
        wsUrl += `?token=${token}`;
      }

      console.log("Connecting to WebSocket:", wsUrl);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("WebSocket connected successfully");
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        resolve();
      };

      this.ws.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        this.isConnecting = false;

        if (this.isManuallyDisconnected) {
          return;
        }

        if (event.code === 4404) {
          this.emit("connection_failed", {
            reason: "Room not found.",
          });
          return;
        }

        // For anonymous users, don't treat auth failures as hard errors
        if (event.code === 4401 && !token) {
          console.log("Anonymous connection - auth not required");
          return;
        }

        if (event.code === 4401 && token) {
          this.emit("connection_failed", {
            reason: "Authentication failed. Please log in again.",
          });
          return;
        }

        // Only attempt reconnection for network errors
        if (event.code !== 1000 && event.code !== 1001) {
          this.handleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.isConnecting = false;

        // Don't reject immediately - let onclose handle reconnection
        setTimeout(() => {
          if (this.ws?.readyState === WebSocket.CONNECTING) {
            reject(new Error("Failed to connect to WebSocket"));
          }
        }, 5000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };
    });
  }

  disconnect() {
    this.isManuallyDisconnected = true;
    this.isConnecting = false;
    if (this.ws) {
      this.ws.close(1000);
      this.ws = null;
    }
  }

  private handleReconnect() {
    if (
      this.reconnectAttempts < this.maxReconnectAttempts &&
      !this.isConnecting &&
      !this.isManuallyDisconnected
    ) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        if (!this.isManuallyDisconnected) {
          this.connect().catch((error) => {
            console.error("Reconnection failed:", error);
          });
        }
      }, this.reconnectDelay);
    } else if (!this.isManuallyDisconnected) {
      console.error("Max reconnection attempts reached");
      this.emit("connection_failed", {
        reason: "Connection lost. Please refresh the page.",
      });
    }
  }

  private handleMessage(data: WebSocketMessage) {
    console.log("Received WebSocket message:", data);
    this.emit(data.type, data);
  }

  // Event listener methods
  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data: any) => void) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  // Message sending methods
  submitVote(cardValue: string) {
    this.send({
      type: "submit_vote",
      card_value: cardValue,
    });
  }

  revealCards() {
    this.send({
      type: "reveal_cards",
    });
  }

  resetVotes() {
    this.send({
      type: "reset_votes",
    });
  }

  skipParticipant(participantId: number) {
    this.send({
      type: "skip_participant",
      participant_id: participantId,
    });
  }

  startRound(storyTitle?: string) {
    this.send({
      type: "start_round",
      story_title: storyTitle || "",
    });
  }

  sendChatMessage(message: string) {
    this.send({
      type: "chat_message",
      message: message,
    });
  }

  joinRoom(username: string) {
    this.send({
      type: "join_room",
      username: username,
    });
  }

  startTimer(duration?: number) {
    this.send({
      type: "start_timer",
      duration: duration,
    });
  }

  stopTimer() {
    this.send({
      type: "stop_timer",
    });
  }

  pauseTimer() {
    this.send({
      type: "pause_timer",
    });
  }

  private send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error("WebSocket is not connected");
    }
  }
}
