import apiClient from "./axios";

export const sessionLogsApi = {
  getAllSessionLogs: async () => {
    const response = await apiClient.get(`/session-logs/all/`);

    // Transform the backend data to match frontend expectations
    const transformedData = response.data.map((log: any) => ({
      id: log.id,
      roomCode: log.room_code,
      roomHost: log.room_host,
      storyPointAverage: log.story_point_average,
      participantSelections: log.participant_selections,
      timestamp: new Date(log.timestamp),
      sessionDuration: 30, // Default since we don't track duration yet
      storiesEstimated: 1, // Each log represents one story estimation
      totalVotes: Object.keys(log.participant_selections).length,
      participantCount: Object.keys(log.participant_selections).length,
      project: log.project_name || "Unknown Project",
    }));

    return transformedData;
  },    

  exportAllSessionLogs: async () => {
    const response = await apiClient.get("/session-logs/export/", {
      responseType: "blob",
    });

    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;

    // Extract filename from Content-Disposition header or use default
    const contentDisposition = response.headers["content-disposition"];
    let filename = "session_logs.csv";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  exportRoomSessionLogs: async (roomId: string) => {
    const response = await apiClient.get(
      `/rooms/${roomId}/session-logs/export/`,
      {
        responseType: "blob",
      }
    );

    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;

    // Extract filename from Content-Disposition header or use default
    const contentDisposition = response.headers["content-disposition"];
    let filename = `room_${roomId}_logs.csv`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
