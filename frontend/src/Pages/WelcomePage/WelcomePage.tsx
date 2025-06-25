"use client";

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  TrendingUp,
  PuzzleIcon,
  Activity,
  CheckCircle,
  Loader2,
  Copy,
  ExternalLink,
  Play,
  Pause,
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
  status: "active" | "voting" | "completed";
  isNew?: boolean;
  progress?: number;
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
    projectName: randomRoomNameGernetor(),
    pointSystem: "fibonacci",
    allowObservers: true,
    autoReveal: false,
    timerEnabled: false,
    timerDuration: 5,
  });
  const [showRejoinDialog, setShowRejoinDialog] = useState(false);
  const [lastRoomData, setLastRoomData] = useState<any>(null);
  const [titleNumber, setTitleNumber] = useState(0);
  const [joinProgress, setJoinProgress] = useState(0);
  const [createProgress, setCreateProgress] = useState(0);
  const [validationState, setValidationState] = useState<
    "idle" | "checking" | "valid" | "invalid"
  >("idle");
  const [animationsPaused, setAnimationsPaused] = useState(false);

  const titles = useMemo(
    () => ["Better", "Faster", "Smarter", "Together", "Efficiently"],
    []
  );
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // Generate mock recent rooms data with realistic project names
  const generateMockRooms = (): RecentRoom[] => {
    const projectNames = [
      "User Authentication System",
      "Payment Gateway Integration",
      "Mobile App Redesign",
      "API Performance Optimization",
      "Shopping Cart Features",
      "Real-time Chat Implementation",
      "Data Analytics Dashboard",
      "Security Audit & Fixes",
      "Machine Learning Pipeline",
      "Microservices Migration",
      "Cloud Infrastructure Setup",
      "Customer Support Portal",
      "Inventory Management System",
      "Social Media Integration",
      "Email Campaign Builder",
      "Search Engine Optimization",
      "Database Schema Updates",
      "Third-party Integrations",
      "Bug Fixes & Maintenance",
      "Performance Monitoring",
    ];

    const statuses: Array<"active" | "voting" | "completed"> = [
      "active",
      "voting",
      "completed",
    ];

    return Array.from({ length: 8 }, (_, i) => ({
      id: `room-${i + 2}`,
      code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      projectName:
        projectNames[Math.floor(Math.random() * projectNames.length)],
      lastJoined: `${Math.floor(Math.random() * 30) + 1} min ago`,
      participantCount: Math.floor(Math.random() * 12) + 2,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      isNew: Math.random() > 0.7,
      progress: Math.floor(Math.random() * 100),
    }));
  };

  // Check for admin's last room on component mount
  useEffect(() => {
    if (isAuthenticated && user) {
      checkAdminLastRoom();
    }
  }, [isAuthenticated, user]);

  // Initialize recent rooms with animation
  useEffect(() => {
    if (isAuthenticated) {
      // Show your actual recent rooms first (if any)
      setRecentRooms([
        {
          id: "user-1",
          code: "ABC123",
          projectName: "User Authentication",
          lastJoined: "2 hours ago",
          participantCount: 5,
          status: "completed",
        },
        {
          id: "user-2",
          code: "XYZ789",
          projectName: "Payment Integration",
          lastJoined: "1 day ago",
          participantCount: 3,
          status: "completed",
        },
      ]);

      // Add animated mock rooms after a delay
      setTimeout(() => {
        setRecentRooms((prev) => [...prev, ...generateMockRooms()]);
      }, 1000);
    } else {
      // For non-authenticated users, show animated activity
      setRecentRooms(generateMockRooms());
    }
  }, [isAuthenticated]);
  // Animated title effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles, animationsPaused]);

  // Room code validation
  useEffect(() => {
    if (!roomCode.trim()) {
      setValidationState("idle");
      return;
    }

    setValidationState("checking");
    const timer = setTimeout(() => {
      const isValid = roomCode.length >= 3;
      setValidationState(isValid ? "valid" : "invalid");
    }, 500);

    return () => clearTimeout(timer);
  }, [roomCode]);

  // Animate room updates to show activity
  useEffect(() => {
    if (recentRooms.length === 0) return;

    const interval = setInterval(() => {
      setRecentRooms((prev) => {
        const updated = [...prev];

        // Randomly update a room's participant count or status
        const randomIndex = Math.floor(Math.random() * updated.length);
        const room = updated[randomIndex];

        // Occasionally add new rooms or update existing ones
        if (Math.random() > 0.8) {
          // Add a new room at the beginning
          const newRoom = generateMockRooms()[0];
          newRoom.isNew = true;
          updated.unshift(newRoom);

          // Remove the last room to keep the list manageable
          if (updated.length > 10) {
            updated.pop();
          }
        } else if (Math.random() > 0.5) {
          // Update participant count
          updated[randomIndex] = {
            ...room,
            participantCount: Math.max(
              1,
              room.participantCount + (Math.random() > 0.5 ? 1 : -1)
            ),
            lastJoined: `${Math.floor(Math.random() * 5) + 1} min ago`,
          };
        }

        // Remove "new" flag after animation
        return updated.map((room) => ({ ...room, isNew: false }));
      });
    }, 3000 + Math.random() * 2000); // Random interval between 3-5 seconds

    return () => clearInterval(interval);
  }, [recentRooms.length]);

  const checkAdminLastRoom = async () => {
    try {
      const lastRoom = await roomsApi.getAdminLastRoom();
      if (lastRoom && lastRoom.code) {
        setLastRoomData(lastRoom);
        setShowRejoinDialog(true);
      }
    } catch (error) {
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
    setJoinProgress(0);

    // Simulate joining process with progress
    const progressSteps = [20, 50, 80, 100];
    for (const progress of progressSteps) {
      setJoinProgress(progress);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    try {
      await roomsApi.getById(targetCode);
      navigate(`/room/${targetCode}`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error("Room not found", {
          description: "Please check the room code and try again",
        });
      } else {
        navigate(`/room/${targetCode}`);
      }
    } finally {
      setIsLoading(false);
      setJoinProgress(0);
    }
  };

  const handleCreateRoom = async () => {
    if (!isAuthenticated) {
      toast.info("Please sign up to create a room");
      navigate("/signup?createRoom=true");
      return;
    }

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
    setCreateProgress(0);

    const progressSteps = [25, 50, 75, 100];
    for (const progress of progressSteps) {
      setCreateProgress(progress);
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    try {
      const newRoom = await roomsApi.create({
        project_name: roomSettings.projectName.trim(),
        point_system: roomSettings.pointSystem,
        auto_reveal_cards: roomSettings.autoReveal,
        allow_skip: true,
        enable_timer: roomSettings.timerEnabled,
        timer_duration: roomSettings.timerDuration * 60,
      });
      setShowCreateDialog(false);
      setRoomSettings((prev) => ({ ...prev, projectName: "" }));
      navigate(`/room/${newRoom.code}`);
    } catch (error) {
      toast.error("Failed to create room", {
        description: "Please try again",
      });
    } finally {
      setIsLoading(false);
      setCreateProgress(0);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <PuzzleIcon className="w-3 h-3 text-green-500 animate-pulse" />;
      case "voting":
        return <TrendingUp className="w-3 h-3 text-blue-500" />;
      case "completed":
        return <CheckCircle className="w-3 h-3 text-muted-foreground" />;
      default:
        return <Clock className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Live";
      case "voting":
        return "Voting";
      case "completed":
        return "Done";
      default:
        return "Idle";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20";
      case "voting":
        return "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "completed":
        return "text-muted-foreground bg-muted border-border";
      default:
        return "text-muted-foreground bg-muted border-border";
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

  // Display recent rooms (show all for demo, limit for authenticated users)
  const displayRooms = isAuthenticated
    ? recentRooms.slice(0, 6) // Limit to 6 for authenticated users
    : recentRooms.slice(0, 8); // Show more for demo effect

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/30 to-background relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 dark:bg-secondary/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/5 dark:bg-accent/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

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
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Hero Content */}
          <div className="space-y-6">
            <Badge
              variant="secondary"
              className="border bg-primary/10 text-primary border-primary/20"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Streamlined Planning Sessions
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              <span className="text-foreground">Plan Your Workflows</span>
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1">
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent"
                    initial={{ opacity: 0, y: "-100" }}
                    transition={{ type: "spring", stiffness: 50 }}
                    animate={
                      titleNumber === index
                        ? { y: 0, opacity: 1 }
                        : { y: titleNumber > index ? -150 : 150, opacity: 0 }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
              <br />
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Create collaborative planning sessions with your team. Use proven
              estimation techniques to deliver projects on time and within
              scope.
            </p>
          </div>

          {/* Main Actions */}
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Join Room Card */}
            <Card className="p-6 hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50 hover:scale-105 group bg-card">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors border border-green-500/20">
                    <Hash className="w-5 h-5 text-green-600 dark:text-green-400" />
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
                  <div className="relative">
                    <Input
                      id="room-code"
                      placeholder="e.g., ABC123"
                      value={roomCode}
                      onChange={(e) =>
                        setRoomCode(e.target.value.toUpperCase())
                      }
                      className={`text-center text-lg font-mono tracking-wider pr-10 transition-all ${
                        validationState === "valid"
                          ? "border-green-500 bg-green-50 dark:bg-green-950"
                          : validationState === "invalid"
                          ? "border-red-500 bg-red-50 dark:bg-red-950"
                          : ""
                      }`}
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleJoinRoom();
                        }
                      }}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {validationState === "checking" && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                      {validationState === "valid" && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                      {validationState === "invalid" && (
                        <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                          <span className="text-white text-xs">!</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {validationState === "invalid" && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Room code must be at least 3 characters
                    </p>
                  )}
                </div>

                {isLoading && joinProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Joining session...
                      </span>
                      <span className="text-muted-foreground">
                        {joinProgress}%
                      </span>
                    </div>
                    <Progress value={joinProgress} className="h-2" />
                  </div>
                )}

                <Button
                  onClick={() => handleJoinRoom()}
                  className="w-full bg-green-600 hover:bg-green-700 transition-all duration-200 hover:scale-105"
                  disabled={
                    isLoading ||
                    !roomCode.trim() ||
                    validationState === "invalid"
                  }
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      Join Session
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Create Room Card */}
            <Card className="p-6 hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50 hover:scale-105 group bg-card">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors border border-primary/20">
                    <Plus className="w-5 h-5 text-primary" />
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
                      className="w-full bg-blue-600 hover:bg-blue-700 transition-all duration-200 hover:scale-105"
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
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Session"
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>

          {/* Recent/Active Rooms Section */}
          {displayRooms.length > 0 && (
            <div className="max-w-5xl mx-auto h-auto p-2">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold text-foreground">
                    {isAuthenticated ? "Recent Sessions" : "Live Activity"}
                  </h2>
                  {!isAuthenticated && (
                    <Badge
                      variant="secondary"
                      className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                    >
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                      Live
                    </Badge>
                  )}
                </div>

                {!isAuthenticated && (
                  <p className="text-sm text-muted-foreground">
                    Join thousands of teams already using our platform
                  </p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1">
                {displayRooms.map((room, index) => (
                  <Card
                    key={room.id}
                    className={`p-4 transition-all duration-500 cursor-pointer border hover:border-primary/50 hover:shadow-md hover:scale-102 bg-card ${
                      room.isNew
                        ? "border-green-500/50 bg-green-500/5 dark:bg-green-500/10"
                        : ""
                    }`}
                    style={{
                      animationDelay: `${index * 100}ms`,
                    }}
                    onClick={() => handleJoinRoom(room.code)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-muted rounded-lg flex-shrink-0">
                          <Hash className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground truncate">
                            {room.projectName}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                              {room.code}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {room.participantCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {room.lastJoined}
                            </span>
                          </div>
                          {room.status === "voting" &&
                            room.progress !== undefined && (
                              <div className="mt-2">
                                <Progress
                                  value={room.progress}
                                  className="h-1"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  {room.progress}% voted
                                </p>
                              </div>
                            )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge
                          variant="secondary"
                          className={`inline-flex items-center gap-1 ${getStatusColor(
                            room.status
                          )}`}
                        >
                          {getStatusIcon(room.status)}
                          {getStatusText(room.status)}
                        </Badge>
                        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {!isAuthenticated && (
                <div className="text-center mt-6">
                  <p className="text-sm text-muted-foreground mb-3">
                    See your own sessions by creating an account
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/signup")}
                    className="border-primary/20 text-primary hover:bg-primary/5"
                  >
                    Sign Up Free
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Features Section */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-12">
            <div className="text-center space-y-3 group">
              <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto group-hover:bg-primary/20 transition-colors group-hover:scale-110 transform duration-200 border border-primary/20">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">
                Fast & Intuitive
              </h3>
              <p className="text-sm text-muted-foreground">
                Get started in seconds with our streamlined interface
              </p>
            </div>

            <div className="text-center space-y-3 group">
              <div className="p-3 bg-green-500/10 rounded-full w-fit mx-auto group-hover:bg-green-500/20 transition-colors group-hover:scale-110 transform duration-200 border border-green-500/20">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-foreground">
                Team Collaboration
              </h3>
              <p className="text-sm text-muted-foreground">
                Real-time voting and discussion with your team
              </p>
            </div>

            <div className="text-center space-y-3 group">
              <div className="p-3 bg-purple-500/10 rounded-full w-fit mx-auto group-hover:bg-purple-500/20 transition-colors group-hover:scale-110 transform duration-200 border border-purple-500/20">
                <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-foreground">
                Secure & Private
              </h3>
              <p className="text-sm text-muted-foreground">
                Your planning sessions are private and secure
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
