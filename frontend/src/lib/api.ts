import apiClient from "./axios";

// Define interfaces for API responses and request bodies
export interface Room {
  id: number;
  code: string;
  project_name: string;
  point_system: string;
  status: string;
  host: number;
  host_username: string;
  participant_count: number;
  created_at: string;
  enable_timer?: boolean;
  timer_duration?: number;
  is_timer_active?: boolean;
  timer_start_time?: string;
  timer_end_time?: string;
  last_activity?: string;
  auto_closed?: boolean;
}

export interface CreateRoomData {
  project_name: string;
  point_system: string;
  auto_reveal_cards?: boolean;
  allow_skip?: boolean;
  enable_timer?: boolean;
  timer_duration?: number;
}

// Room API endpoints
export const roomsApi = {
  // Create a new room
  create: async (data: CreateRoomData): Promise<Room> => {
    const response = await apiClient.post("/rooms/", data);
    return response.data;
  },

  // Get a specific room by ID
  getById: async (id: string | number): Promise<Room> => {
    const response = await apiClient.get(`/rooms/${id}/`);
    return response.data;
  },

  // Get all rooms
  getAll: async (): Promise<Room[]> => {
    const response = await apiClient.get("/rooms/");
    return response.data;
  },

  // Get the last room created by admin
  getAdminLastRoom: async (): Promise<Room> => {
    const response = await apiClient.get("/rooms/admin_last_room/");
    return response.data;
  },

  // Clear the admin's last room reference
  clearAdminLastRoom: async (): Promise<void> => {
    await apiClient.delete("/rooms/admin_last_room/");
  },

  // Update an existing room
  update: async (
    id: string | number,
    data: Partial<CreateRoomData>
  ): Promise<Room> => {
    const response = await apiClient.patch(`/rooms/${id}/`, data);
    return response.data;
  },

  // Delete a room
  delete: async (id: string | number): Promise<void> => {
    await apiClient.delete(`/rooms/${id}/`);
  },
};

export default roomsApi;
