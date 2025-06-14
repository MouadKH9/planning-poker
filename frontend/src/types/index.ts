export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface RoomState {
  room: {
    id: number;
    code: string;
    status: string;
    host_username: string;
  };
  participants: Participant[];
  is_host: boolean;
}

export interface Participant {
  id: number;
  user_id: number;
  username: string;
  card_selection: string | null;
  has_voted: boolean;
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
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://localhost:8000/ws/rooms/${this.roomId}/`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("WebSocket connected");
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        reject(error);
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        this.connect().catch(console.error);
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error("Max reconnection attempts reached");
      this.emit("connection_failed", {
        reason: "Max reconnection attempts reached",
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

  private send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error("WebSocket is not connected");
    }
  }
}
