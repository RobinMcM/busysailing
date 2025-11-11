import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Unlock, DollarSign, MessageSquare, Volume2, Users, TrendingUp, Download, ArrowLeft } from "lucide-react";
import { type AnalyticsSummary, type Analytics } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function Admin() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [period, setPeriod] = useState("today");
  const [showError, setShowError] = useState(false);

  const { data: analyticsData, isLoading } = useQuery<{
    summary: AnalyticsSummary;
    records: Analytics[];
    success: boolean;
  }>({
    queryKey: ["/api/analytics", period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?period=${period}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch analytics: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: isUnlocked,
  });

  const verifyPasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("POST", "/api/admin/verify", { password });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.verified) {
        setIsUnlocked(true);
        setShowError(false);
      } else {
        setShowError(true);
        setTimeout(() => setShowError(false), 2000);
      }
    },
    onError: () => {
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
    },
  });

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPasswordMutation.mutate(password);
  };

  const exportCSV = () => {
    if (!analyticsData?.records) return;

    const headers = ['Timestamp', 'Type', 'IP Address', 'Model', 'Input Tokens', 'Output Tokens', 'Characters', 'Cost ($)', 'Duration (ms)'];
    const rows = analyticsData.records.map(r => [
      new Date(r.timestamp).toISOString(),
      r.type,
      r.ipAddress,
      r.model,
      r.inputTokens || '',
      r.outputTokens || '',
      r.characters || '',
      r.cost,
      r.duration,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const calculate100UserCost = (summary: AnalyticsSummary) => {
    if (summary.uniqueUsers === 0) return { daily: 0, monthly: 0 };
    
    const costPerUser = summary.totalCost / summary.uniqueUsers;
    const dailyCost = costPerUser * 100;
    const monthlyCost = dailyCost * 30;
    
    return { daily: dailyCost, monthly: monthlyCost };
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Admin Dashboard
            </CardTitle>
            <CardDescription>
              Enter the admin password to access usage analytics and cost monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="space-y-2">
                <Input
                  data-testid="input-admin-password"
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={showError ? "border-destructive" : ""}
                />
                {showError && (
                  <p className="text-sm text-destructive">Incorrect password</p>
                )}
              </div>
              <Button 
                data-testid="button-unlock" 
                type="submit" 
                className="w-full"
                disabled={verifyPasswordMutation.isPending}
              >
                <Unlock className="w-4 h-4 mr-2" />
                {verifyPasswordMutation.isPending ? "Verifying..." : "Unlock Dashboard"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  const summary = analyticsData?.summary;
  const records = analyticsData?.records || [];
  const userCost = summary ? calculate100UserCost(summary) : { daily: 0, monthly: 0 };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  data-testid="button-back-to-chat"
                  title="Back to Chat"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Chat
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="w-8 h-8" />
              Usage Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor API usage and costs
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger data-testid="select-period" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button data-testid="button-export" onClick={exportCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {summary && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div data-testid="text-total-cost" className="text-2xl font-bold">
                    ${summary.totalCost.toFixed(4)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Chat: ${summary.chatCost.toFixed(4)} | TTS: ${summary.ttsCost.toFixed(4)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div data-testid="text-total-requests" className="text-2xl font-bold">
                    {summary.totalRequests}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Chat: {summary.chatRequests} | TTS: {summary.ttsRequests}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div data-testid="text-unique-users" className="text-2xl font-bold">
                    {summary.uniqueUsers}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    By IP address
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div data-testid="text-avg-response" className="text-2xl font-bold">
                    {(summary.averageResponseTime / 1000).toFixed(2)}s
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average API latency
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>100 User Cost Projection</CardTitle>
                <CardDescription>
                  Estimated costs for 100 active users based on current usage patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Daily Cost (100 users)</div>
                    <div data-testid="text-daily-100" className="text-3xl font-bold text-primary">
                      ${userCost.daily.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Monthly Cost (100 users)</div>
                    <div data-testid="text-monthly-100" className="text-3xl font-bold text-primary">
                      ${userCost.monthly.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-muted rounded-lg space-y-1">
                  <p className="text-sm font-medium">Cost Breakdown:</p>
                  <p className="text-sm text-muted-foreground">
                    • Average cost per user: ${(summary.totalCost / (summary.uniqueUsers || 1)).toFixed(4)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    • Chat requests: {summary.chatRequests} (${summary.chatCost.toFixed(4)})
                  </p>
                  <p className="text-sm text-muted-foreground">
                    • TTS requests: {summary.ttsRequests} (${summary.ttsCost.toFixed(4)})
                  </p>
                  <p className="text-sm text-muted-foreground">
                    • Total tokens processed: {(summary.totalTokens || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    • Total characters: {(summary.totalCharacters || 0).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Last {records.length} API requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {records.slice(0, 50).map((record) => (
                    <div
                      key={record.id}
                      data-testid={`record-${record.type}-${record.id}`}
                      className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                    >
                      <div className="flex items-center gap-3">
                        {record.type === 'chat' ? (
                          <MessageSquare className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-green-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium capitalize">{record.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(record.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">${parseFloat(record.cost || '0').toFixed(5)}</p>
                        <p className="text-xs text-muted-foreground">{record.duration}ms</p>
                      </div>
                    </div>
                  ))}
                  {records.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No activity recorded yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
