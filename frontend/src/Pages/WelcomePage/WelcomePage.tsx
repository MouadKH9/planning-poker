"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Clock,
  Zap,
  Shield,
  ArrowRight,
  Hash,
  Settings,
  History,
  Sparkles,
} from "lucide-react";
import Header from "./Header";
import { useAuth } from "@/contexts/AuthContext";
import { roomsApi } from "@/lib/api";
import { randomRoomNameGernetor } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RecentRoom {
  id: string;
  code: string;
  projectName: string;
  lastJoined: string;
  participantCount: number;
}

interface RoomSettings {
  projectName: string;
  pointSystem: string;
  allowObservers: boolean;
  autoReveal: boolean;
  timerEnabled: boolean;
  timerDuration: number;
}

export default function WelcomePage() {
  const [roomCode, setRoomCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [roomSettings, setRoomSettings] = useState<RoomSettings>({
    projectName: randomRoomNameGernetor(), // Call the function immediately
    pointSystem: "fibonacci",
    allowObservers: true,
    autoReveal: false,
    timerEnabled: false,
    timerDuration: 5,
  });
  const [showRejoinDialog, setShowRejoinDialog] = useState(false);
  const [lastRoomData, setLastRoomData] = useState<any>(null);

  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // Check for admin's last room on component mount
  useEffect(() => {
    if (isAuthenticated && user) {
      checkAdminLastRoom();
    }
  }, [isAuthenticated, user]);

  // Mock recent rooms data - replace with actual API call
  useEffect(() => {
    if (isAuthenticated) {
      // Simulate loading recent rooms
      setRecentRooms([
        {
          id: "1",
          code: "ABC123",
          projectName: "User Authentication",
          lastJoined: "2 hours ago",
          participantCount: 5,
        },
        {
          id: "2",
          code: "XYZ789",
          projectName: "Payment Integration",
          lastJoined: "1 day ago",
          participantCount: 3,
        },
      ]);
    }
  }, [isAuthenticated]);

  const checkAdminLastRoom = async () => {
    try {
      const lastRoom = await roomsApi.getAdminLastRoom();
      if (lastRoom && lastRoom.code) {
        setLastRoomData(lastRoom);
        setShowRejoinDialog(true);
      }
    } catch (error) {
      // No last room or room no longer active
      console.log("No active last room found");
    }
  };

  const handleRejoinRoom = () => {
    if (lastRoomData?.code) {
      navigate(`/room/${lastRoomData.code}`);
    }
    setShowRejoinDialog(false);
    setLastRoomData(null);
  };

  const handleDeclineRejoin = async () => {
    try {
      // Close the session and clear the admin's last room on the backend
      await roomsApi.clearAdminLastRoom();
      toast.success("Session closed successfully", {
        description:
          "The room has been closed and you can now create a new session",
      });
    } catch (error) {
      console.error("Failed to close session:", error);
      toast.error("Failed to close session", {
        description:
          "There was an error closing the session. Please try again.",
      });
    }
    setShowRejoinDialog(false);
    setLastRoomData(null);
  };

  const handleJoinRoom = async (code?: string) => {
    const targetCode = code || roomCode.trim();

    if (!targetCode) {
      toast.error("Room code is required");
      return;
    }

    setIsLoading(true);
    try {
      // Try to get room info without requiring authentication
      await roomsApi.getById(targetCode);
      // If successful, navigate to the room (WebSocket will handle auth/anonymous)
      navigate(`/room/${targetCode}`);
    } catch (error: any) {
      console.error("Failed to join room:", error);

      // Check if it's a 404 (room not found) vs other errors
      if (error.response?.status === 404) {
        toast.error("Room not found", {
          description: "Please check the room code and try again",
        });
      } else {
        // For other errors, still try to join - maybe it's just an API issue
        console.warn("API check failed, but trying to join anyway:", error);
        navigate(`/room/${targetCode}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!isAuthenticated) {
      toast.info("Please sign up to create a room");
      navigate("/signup?createRoom=true");
      return;
    }

    // Generate a new random name when opening the dialog
    setRoomSettings((prev) => ({
      ...prev,
      projectName: randomRoomNameGernetor(),
    }));
    setShowCreateDialog(true);
  };

  const handleCreateRoomWithSettings = async () => {
    if (!roomSettings.projectName.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsLoading(true);
    try {
      const newRoom = await roomsApi.create({
        project_name: roomSettings.projectName.trim(),
        point_system: roomSettings.pointSystem,
        auto_reveal_cards: roomSettings.autoReveal, // Include auto-reveal setting
        allow_skip: true,
        enable_timer: roomSettings.timerEnabled,
        timer_duration: roomSettings.timerDuration * 60, // Convert to seconds
      });
      setShowCreateDialog(false);
      setRoomSettings((prev) => ({ ...prev, projectName: "" }));
      navigate(`/room/${newRoom.code}`);
    } catch (error) {
      console.error("Failed to create room:", error);
      toast.error("Failed to create room", {
        description: "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const pointSystems = [
    { value: "fibonacci", label: "Fibonacci (1, 2, 3, 5, 8, 13, 21)" },
    {
      value: "modified_fibonacci",
      label: "Modified Fibonacci (0, 1/2, 1, 2, 3, 5, 8, 13, 20, 40, 100)",
    },
    { value: "powers_of_2", label: "Powers of 2 (1, 2, 4, 8, 16, 32, 64)" },
    { value: "t_shirt", label: "T-Shirt Sizes (XS, S, M, L, XL, XXL)" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <Header />

      {/* Rejoin Room Dialog */}
      <AlertDialog open={showRejoinDialog} onOpenChange={setShowRejoinDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" />
              Active Room Found
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have an active planning session that you can rejoin:
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border">
                <div className="font-medium text-blue-900">
                  {lastRoomData?.project_name}
                </div>
                <div className="text-sm text-blue-700 mt-1">
                  Room Code:{" "}
                  <span className="font-mono font-bold">
                    {lastRoomData?.code}
                  </span>
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Last activity:{" "}
                  {lastRoomData?.last_activity
                    ? new Date(lastRoomData.last_activity).toLocaleString()
                    : "Recently"}
                </div>
              </div>
              <div className="mt-3 text-sm text-slate-600">
                Would you like to rejoin this session or close it and start
                fresh?
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleDeclineRejoin}
              className="text-red-600 hover:text-red-700"
            >
              Close Session
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejoinRoom}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Rejoin Room
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Hero Content */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Streamlined Planning Sessions
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 leading-tight">
              Plan Better,
              <br />
              <span className="text-blue-600">Estimate Smarter</span>
            </h1>

            <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Create collaborative planning sessions with your team. Use proven
              estimation techniques to deliver projects on time and within
              scope.
            </p>
          </div>

          {/* Main Actions */}
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Join Room Card */}
            <Card className="p-6 hover:shadow-lg transition-shadow border-2 hover:border-blue-200">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Hash className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Join Session</CardTitle>
                    <CardDescription>
                      Enter a room code to join an existing session
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="room-code">Room Code</Label>
                  <Input
                    id="room-code"
                    placeholder="e.g., ABC123"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="text-center text-lg font-mono tracking-wider"
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleJoinRoom();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={() => handleJoinRoom()}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={isLoading || !roomCode.trim()}
                >
                  {isLoading ? "Joining..." : "Join Session"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Create Room Card */}
            <Card className="p-6 hover:shadow-lg transition-shadow border-2 hover:border-blue-200">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Plus className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Create Session</CardTitle>
                    <CardDescription>
                      Start a new planning session for your team
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Dialog
                  open={showCreateDialog}
                  onOpenChange={setShowCreateDialog}
                >
                  <DialogTrigger asChild>
                    <Button
                      onClick={handleCreateRoom}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={isLoading}
                    >
                      Create New Session
                      <Plus className="w-4 h-4 ml-2" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Create New Planning Session
                      </DialogTitle>
                      <DialogDescription>
                        Configure your planning session settings and
                        preferences.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                      {/* Project Name */}
                      <div className="space-y-2">
                        <Label htmlFor="project-name">Project Name *</Label>
                        <Input
                          id="project-name"
                          placeholder="e.g., User Authentication Feature"
                          value={roomSettings.projectName}
                          onChange={(e) =>
                            setRoomSettings((prev) => ({
                              ...prev,
                              projectName: e.target.value,
                            }))
                          }
                          disabled={isLoading}
                        />
                      </div>

                      <Separator />

                      {/* Point System */}
                      <div className="space-y-2">
                        <Label htmlFor="point-system">Point System</Label>
                        <Select
                          value={roomSettings.pointSystem}
                          onValueChange={(value) =>
                            setRoomSettings((prev) => ({
                              ...prev,
                              pointSystem: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {pointSystems.map((system) => (
                              <SelectItem
                                key={system.value}
                                value={system.value}
                              >
                                {system.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator />

                      {/* Session Settings */}
                      <div className="space-y-4">
                        <Label className="text-base font-medium">
                          Session Settings
                        </Label>

                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label htmlFor="allow-observers">
                              Allow Observers
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Let team members observe without voting
                            </p>
                          </div>
                          <Switch
                            id="allow-observers"
                            checked={roomSettings.allowObservers}
                            onCheckedChange={(checked) =>
                              setRoomSettings((prev) => ({
                                ...prev,
                                allowObservers: checked,
                              }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label htmlFor="auto-reveal">
                              Auto Reveal Cards
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Automatically reveal when everyone votes
                            </p>
                          </div>
                          <Switch
                            id="auto-reveal"
                            checked={roomSettings.autoReveal}
                            onCheckedChange={(checked) =>
                              setRoomSettings((prev) => ({
                                ...prev,
                                autoReveal: checked,
                              }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label htmlFor="timer-enabled">Enable Timer</Label>
                            <p className="text-sm text-muted-foreground">
                              Set time limits for voting rounds
                            </p>
                          </div>
                          <Switch
                            id="timer-enabled"
                            checked={roomSettings.timerEnabled}
                            onCheckedChange={(checked) =>
                              setRoomSettings((prev) => ({
                                ...prev,
                                timerEnabled: checked,
                              }))
                            }
                          />
                        </div>

                        {roomSettings.timerEnabled && (
                          <div className="space-y-2 ml-4">
                            <Label htmlFor="timer-duration">
                              Timer Duration (minutes)
                            </Label>
                            <Select
                              value={roomSettings.timerDuration.toString()}
                              onValueChange={(value) =>
                                setRoomSettings((prev) => ({
                                  ...prev,
                                  timerDuration: Number.parseInt(value),
                                }))
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="2">2 min</SelectItem>
                                <SelectItem value="5">5 min</SelectItem>
                                <SelectItem value="10">10 min</SelectItem>
                                <SelectItem value="15">15 min</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowCreateDialog(false);
                          setRoomSettings((prev) => ({
                            ...prev,
                            projectName: "",
                          }));
                        }}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateRoomWithSettings}
                        disabled={isLoading || !roomSettings.projectName.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isLoading ? "Creating..." : "Create Session"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>

          {/* Recent Rooms Section */}
          {isAuthenticated && recentRooms.length > 0 && (
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-slate-600" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Recent Sessions
                </h2>
              </div>

              <div className="grid gap-3">
                {recentRooms.map((room) => (
                  <Card
                    key={room.id}
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer border hover:border-blue-200"
                    onClick={() => handleJoinRoom(room.code)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          <Hash className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">
                            {room.projectName}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span>Code: {room.code}</span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {room.participantCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {room.lastJoined}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Features Section */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-12">
            <div className="text-center space-y-3">
              <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Fast & Intuitive</h3>
              <p className="text-sm text-slate-600">
                Get started in seconds with our streamlined interface
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="p-3 bg-green-100 rounded-full w-fit mx-auto">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-slate-900">
                Team Collaboration
              </h3>
              <p className="text-sm text-slate-600">
                Real-time voting and discussion with your team
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Secure & Private</h3>
              <p className="text-sm text-slate-600">
                Your planning sessions are private and secure
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
