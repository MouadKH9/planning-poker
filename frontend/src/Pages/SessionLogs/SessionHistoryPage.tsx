import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  CalendarIcon,
  Clock,
  Users,
  Target,
  TrendingUp,
  Filter,
  Download,
  BarChart3,
} from "lucide-react";
import { format, subDays, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import Header from "../WelcomePage/Header";
import { seessionLogsApi } from "@/lib";
import { sessionLogsApi } from "@/lib/sessionLogsApi";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
interface SessionLog {
  id: number;
  room: number;
  story_point_average: number;
  participant_selections: Record<string, string>;
  timestamp: string;
}

interface Room {
  id: number;
  code: string;
  status: string;
}

export default function SessionHistoryPage() {
  const { user, isAuthenticated } = useAuth();
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedHost, setSelectedHost] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchTerm, setSearchTerm] = useState<string>("");

  //mock data - replace with actual API calls
  const mockSessionData = [
    {
      id: 1,
      roomCode: "ABC123",
      roomHost: "john_doe",
      storyPointAverage: 5.2,
      participantSelections: {
        john_doe: "5",
        jane_smith: "8",
        bob_wilson: "3",
        alice_brown: "5",
      },
      timestamp: new Date("2024-01-15T10:30:00"),
      sessionDuration: 45, // minutes
      storiesEstimated: 8,
      totalVotes: 32,
      participantCount: 4,
      project: "E-commerce Platform",
    },
    {
      id: 2,
      roomCode: "DEF456",
      roomHost: "jane_smith",
      storyPointAverage: 3.8,
      participantSelections: {
        jane_smith: "3",
        bob_wilson: "5",
        alice_brown: "3",
        charlie_davis: "3",
        diana_lee: "5",
      },
      timestamp: new Date("2024-01-14T14:15:00"),
      sessionDuration: 32,
      storiesEstimated: 12,
      totalVotes: 60,
      participantCount: 5,
      project: "Mobile App",
    },
    {
      id: 3,
      roomCode: "GHI789",
      roomHost: "bob_wilson",
      storyPointAverage: 7.1,
      participantSelections: {
        bob_wilson: "8",
        alice_brown: "8",
        charlie_davis: "5",
        diana_lee: "8",
      },
      timestamp: new Date("2024-01-13T09:45:00"),
      sessionDuration: 67,
      storiesEstimated: 6,
      totalVotes: 24,
      participantCount: 4,
      project: "API Integration",
    },
    {
      id: 4,
      roomCode: "JKL012",
      roomHost: "alice_brown",
      storyPointAverage: 4.5,
      participantSelections: {
        alice_brown: "5",
        charlie_davis: "3",
        diana_lee: "5",
        eve_martin: "5",
        frank_jones: "3",
      },
      timestamp: new Date("2024-01-12T16:20:00"),
      sessionDuration: 28,
      storiesEstimated: 15,
      totalVotes: 75,
      participantCount: 5,
      project: "E-commerce Platform",
    },
    {
      id: 5,
      roomCode: "MNO345",
      roomHost: "charlie_davis",
      storyPointAverage: 6.3,
      participantSelections: {
        charlie_davis: "8",
        diana_lee: "5",
        eve_martin: "8",
        frank_jones: "5",
      },
      timestamp: new Date("2024-01-11T11:10:00"),
      sessionDuration: 52,
      storiesEstimated: 9,
      totalVotes: 36,
      participantCount: 4,
      project: "Dashboard Analytics",
    },
  ];

  const chartConfig = {
    average: {
      label: "Average Story Points",
      color: "hsl(var(--chart-1))",
    },
    duration: {
      label: "Session Duration (min)",
      color: "hsl(var(--chart-2))",
    },
    votes: {
      label: "Total Votes",
      color: "hsl(var(--chart-3))",
    },
    stories: {
      label: "Stories Estimated",
      color: "hsl(var(--chart-4))",
    },
  };

  const {
    data: sessionData = mockSessionData, // Default to mock data
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["sessionLogs"],
    queryFn: async () => {
      if (!isAuthenticated) return mockSessionData;
      setLoading(true);
      try {
        const response = await seessionLogsApi.getAllSessionLogs();
        return response;
      } catch (error) {
        console.error("Failed to fetch session logs:", error);
        return mockSessionData; // Return mock data on error
      } finally {
        setLoading(false);
      }
    },
    enabled: isAuthenticated, // Only run query when authenticated
  });

  // Get unique projects and hosts for filters - Always call this hook
  const projects = useMemo(() => {
    return Array.from(new Set(sessionData.map((session) => session.project)));
  }, [sessionData]);

  const hosts = useMemo(() => {
    return Array.from(new Set(sessionData.map((session) => session.roomHost)));
  }, [sessionData]);

  // Filter and sort data - Always call this hook
  const filteredData = useMemo(() => {
    const filtered = sessionData.filter((session) => {
      const withinDateRange = isWithinInterval(session.timestamp, {
        start: dateRange.from,
        end: dateRange.to,
      });
      const matchesProject =
        selectedProject === "all" || session.project === selectedProject;
      const matchesHost =
        selectedHost === "all" || session.roomHost === selectedHost;
      const matchesSearch =
        searchTerm === "" ||
        session.roomCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.roomHost.toLowerCase().includes(searchTerm.toLowerCase());

      return withinDateRange && matchesProject && matchesHost && matchesSearch;
    });

    // Sort data
    filtered.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case "timestamp":
          aValue = a.timestamp.getTime();
          bValue = b.timestamp.getTime();
          break;
        case "storyPointAverage":
          aValue = a.storyPointAverage;
          bValue = b.storyPointAverage;
          break;
        case "sessionDuration":
          aValue = a.sessionDuration;
          bValue = b.sessionDuration;
          break;
        case "storiesEstimated":
          aValue = a.storiesEstimated;
          bValue = b.storiesEstimated;
          break;
        case "totalVotes":
          aValue = a.totalVotes;
          bValue = b.totalVotes;
          break;
        default:
          aValue = a.timestamp.getTime();
          bValue = b.timestamp.getTime();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [
    sessionData,
    dateRange,
    selectedProject,
    selectedHost,
    sortBy,
    sortOrder,
    searchTerm,
  ]);

  // Calculate metrics - Always call this hook
  const metrics = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        totalSessions: 0,
        avgSessionDuration: 0,
        avgStoryPoints: 0,
        totalStoriesEstimated: 0,
        avgParticipantEngagement: 0,
        totalVotes: 0,
      };
    }

    const totalSessions = filteredData.length;
    const avgSessionDuration =
      filteredData.reduce((sum, session) => sum + session.sessionDuration, 0) /
      totalSessions;
    const avgStoryPoints =
      filteredData.reduce(
        (sum, session) => sum + session.storyPointAverage,
        0
      ) / totalSessions;
    const totalStoriesEstimated = filteredData.reduce(
      (sum, session) => sum + session.storiesEstimated,
      0
    );
    const totalVotes = filteredData.reduce(
      (sum, session) => sum + session.totalVotes,
      0
    );
    const avgParticipantEngagement = totalVotes / totalStoriesEstimated || 0;

    return {
      totalSessions,
      avgSessionDuration: Math.round(avgSessionDuration),
      avgStoryPoints: Math.round(avgStoryPoints * 10) / 10,
      totalStoriesEstimated,
      avgParticipantEngagement: Math.round(avgParticipantEngagement * 10) / 10,
      totalVotes,
    };
  }, [filteredData]);

  // Prepare chart data - Always call this hook
  const chartData = useMemo(() => {
    return filteredData
      .map((session) => ({
        date: format(session.timestamp, "MMM dd"),
        average: session.storyPointAverage,
        duration: session.sessionDuration,
        votes: session.totalVotes,
        stories: session.storiesEstimated,
        project: session.project,
      }))
      .reverse();
  }, [filteredData]);

  // Project distribution data - Always call this hook
  const projectDistribution = useMemo(() => {
    return projects.map((project) => ({
      name: project,
      value: filteredData.filter((session) => session.project === project)
        .length,
      fill: `hsl(${(projects.indexOf(project) * 137.5) % 360}, 70%, 50%)`,
    }));
  }, [projects, filteredData]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="loader"></div>
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">Failed to load session logs</p>
      </div>
    );
  }

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await sessionLogsApi.exportAllSessionLogs();
      toast.success("Session logs exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export session logs. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Session Analytics
              </h1>
              <p className="text-muted-foreground">
                Insights and metrics from your poker planning sessions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? "Exporting..." : "Export"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          setDateRange({ from: range.from, to: range.to });
                        }
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Project</Label>
                <Select
                  value={selectedProject}
                  onValueChange={setSelectedProject}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={String(project)} value={String(project)}>
                        {String(project)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Host</Label>
                <Select value={selectedHost} onValueChange={setSelectedHost}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select host" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Hosts</SelectItem>
                    {hosts.map((host) => (
                      <SelectItem key={host} value={host}>
                        {host}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Search</Label>
                <Input
                  placeholder="Search sessions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Sessions
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalSessions}</div>
              <p className="text-xs text-muted-foreground">
                Planning sessions completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Session Duration
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.avgSessionDuration}m
              </div>
              <p className="text-xs text-muted-foreground">
                Average time per session
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Story Points
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.avgStoryPoints}</div>
              <p className="text-xs text-muted-foreground">
                Average estimate per story
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Participant Engagement
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.avgParticipantEngagement}
              </div>
              <p className="text-xs text-muted-foreground">
                Avg votes per story
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Session Trends</CardTitle>
              <CardDescription>
                Story point averages and session duration over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="average"
                      stroke="hsl(var(--chart-1))"
                      fill="hsl(var(--chart-1))"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project Distribution</CardTitle>
              <CardDescription>Sessions by project</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {projectDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session Efficiency</CardTitle>
              <CardDescription>
                Stories estimated vs session duration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="stories" fill="hsl(var(--chart-4))" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Engagement Metrics</CardTitle>
              <CardDescription>Total votes cast per session</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="votes"
                      stroke="hsl(var(--chart-3))"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Session Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Session Logs</CardTitle>
            <CardDescription>
              Detailed view of all planning sessions
            </CardDescription>
            <div className="flex items-center gap-2">
              <Label>Sort by:</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="timestamp">Date</SelectItem>
                  <SelectItem value="storyPointAverage">
                    Story Points
                  </SelectItem>
                  <SelectItem value="sessionDuration">Duration</SelectItem>
                  <SelectItem value="storiesEstimated">Stories</SelectItem>
                  <SelectItem value="totalVotes">Votes</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room Code</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Host</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Stories</TableHead>
                    <TableHead>Avg Points</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Total Votes</TableHead>
                    <TableHead>Engagement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">
                        <Badge variant="outline">{session.roomCode}</Badge>
                      </TableCell>
                      <TableCell>{session.project}</TableCell>
                      <TableCell>{session.roomHost}</TableCell>
                      <TableCell>
                        {format(session.timestamp, "MMM dd, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>{session.sessionDuration}m</TableCell>
                      <TableCell>{session.storiesEstimated}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {session.storyPointAverage}
                        </Badge>
                      </TableCell>
                      <TableCell>{session.participantCount}</TableCell>
                      <TableCell>{session.totalVotes}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <div className="text-sm">
                            {Math.round(
                              (session.totalVotes / session.storiesEstimated) *
                                10
                            ) / 10}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            votes/story
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filteredData.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No sessions found matching your filters.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Efficiency Metrics</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>
                    • Average {metrics.avgSessionDuration} minutes per session
                  </li>
                  <li>
                    •{" "}
                    {Math.round(
                      metrics.totalStoriesEstimated / metrics.totalSessions
                    )}{" "}
                    stories estimated per session
                  </li>
                  <li>
                    • {metrics.avgParticipantEngagement} average votes per story
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Team Engagement</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {metrics.totalVotes} total votes cast</li>
                  <li>
                    • {Math.round(metrics.totalVotes / metrics.totalSessions)}{" "}
                    average votes per session
                  </li>
                  <li>• High engagement indicates active participation</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
