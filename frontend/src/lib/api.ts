import { apiClient } from '@/lib/axios'

// Define interfaces for API responses and request bodies
export interface Room {
  id: string;
  name: string;
  created_at: string;
}

export interface Participant {
  id: number;
  name: string;
  room_id: string;
  vote: number | null;
}

// Room API endpoints
export const roomsApi = {
  // Get all rooms
  getAll: async () => {
    const response = await apiClient.get<Room[]>('/rooms/')
    return response.data
  },

  // Get a specific room by ID
  getById: async (roomId: string) => {
    const response = await apiClient.get<Room>(`/rooms/${roomId}/`)
    return response.data
  },

  // Create a new room
  create: async () => {
    const response = await apiClient.post<Room>('/rooms/')
    return response.data
  },

  // Get participants for a room
  getParticipants: async (roomId: string) => {
    const response = await apiClient.get<Participant[]>(`/rooms/${roomId}/participants/`)
    return response.data
  }
}

// Participants API endpoints
export const participantsApi = {
  // Join a room
  join: async (roomId: string, name: string) => {
    const response = await apiClient.post<Participant>(`/rooms/${roomId}/participants/`, { name })
    return response.data
  },

  // Submit a vote
  submitVote: async (roomId: string, participantId: number, vote: number) => {
    const response = await apiClient.post<Participant>(
      `/rooms/${roomId}/participants/${participantId}/vote/`,
      { vote }
    )
    return response.data
  },

  // Reset votes for a room
  resetVotes: async (roomId: string) => {
    const response = await apiClient.post(`/rooms/${roomId}/reset/`)
    return response.data
  }
}

