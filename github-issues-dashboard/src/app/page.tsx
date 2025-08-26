"use client"

import { useEffect, useState } from "react"
import { ThemeToggle } from "@/app/components/theme-toggle"

type Issue = {
  number: number
  title: string
  html_url: string
  labels: { name: string; color: string }[]
  assignee: { login: string } | null
  comments: number
  updated_at: string
  merged?: boolean
}

type TrackedIssue = Issue & {
  status: "EMPTY" | "IN_PROGRESS" | "MERGED"
  dateAdded: string
  monthYear: string
}

function parseGithubUrl(url: string) {
  try {
    const u = new URL(url)
    const parts = u.pathname.split("/").filter(Boolean)
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1] }
    }
  } catch {}
  return null
}

function getCurrentMonthYear(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function formatMonthYear(monthYear: string): string {
  const [year, month] = monthYear.split("-")
  const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1)
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function getAvailableMonths(trackedIssues: TrackedIssue[]): string[] {
  const months = new Set(trackedIssues.map((issue) => issue.monthYear))
  return Array.from(months).sort().reverse()
}

function saveToLocalStorage(key: string, data: any) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error("Failed to save to localStorage:", error)
  }
}

function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error("Failed to load from localStorage:", error)
    return defaultValue
  }
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"issues" | "tracking">("issues")
  const [owner, setOwner] = useState("")
  const [repo, setRepo] = useState("")
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState("")
  const [url, setUrl] = useState("")
  const [trackedIssues, setTrackedIssues] = useState<TrackedIssue[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthYear())
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const savedTrackedIssues = loadFromLocalStorage<TrackedIssue[]>("trackedIssues", [])
    const savedSelectedMonth = loadFromLocalStorage<string>("selectedMonth", getCurrentMonthYear())
    const savedOwner = loadFromLocalStorage<string>("repoOwner", "")
    const savedRepo = loadFromLocalStorage<string>("repoName", "")

    setTrackedIssues(savedTrackedIssues)
    setSelectedMonth(savedSelectedMonth)
    setOwner(savedOwner)
    setRepo(savedRepo)
    setIsInitialized(true)
  }, [])

  useEffect(() => {
    if (isInitialized) {
      saveToLocalStorage("trackedIssues", trackedIssues)
    }
  }, [trackedIssues, isInitialized])

  useEffect(() => {
    if (isInitialized) {
      saveToLocalStorage("selectedMonth", selectedMonth)
    }
  }, [selectedMonth, isInitialized])

  useEffect(() => {
    if (isInitialized) {
      saveToLocalStorage("repoOwner", owner)
      saveToLocalStorage("repoName", repo)
    }
  }, [owner, repo, isInitialized])

  const fetchIssues = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ owner, repo })
      const res = await fetch(`/api/issues?${params}`)
      const data = await res.json()
      setIssues(data.issues || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isInitialized) {
      fetchIssues()
    }
  }, [isInitialized])

  // Update tracked issues status when issues are refreshed
  useEffect(() => {
    if (issues.length > 0 && trackedIssues.length > 0) {
      setTrackedIssues(prev => 
        prev.map(tracked => {
          const updatedIssue = issues.find(i => i.number === tracked.number)
          if (!updatedIssue) return tracked

          let newStatus = tracked.status
          if (updatedIssue.merged) {
            newStatus = "MERGED"
          } else if (updatedIssue.assignee) {
            newStatus = "IN_PROGRESS"
          } else {
            newStatus = "EMPTY"
          }

          return {
            ...tracked,
            ...updatedIssue,
            status: newStatus
          }
        })
      )
    }
  }, [issues])

  const filtered = issues.filter(
    (i) =>
      i.title.toLowerCase().includes(q.toLowerCase()) ||
      i.labels.some((l) => l.name.toLowerCase().includes(q.toLowerCase())) ||
      String(i.number).includes(q),
  )

  const handleUrlSubmit = () => {
    const parsed = parseGithubUrl(url)
    if (parsed) {
      setOwner(parsed.owner)
      setRepo(parsed.repo)
      alert("Now click 'Refresh' to fetch issues.")
    } else {
      alert("Invalid GitHub URL. Please use format: https://github.com/owner/repo")
    }
  }

  const addToTracking = (issue: Issue) => {
    const isAlreadyTracked = trackedIssues.some((t) => t.number === issue.number)
    if (!isAlreadyTracked) {
      // Determine initial status based on assignee and merge status
      let status: TrackedIssue["status"] = "EMPTY";
      if (issue.merged) {
        status = "MERGED";
      } else if (issue.assignee) {
        status = "IN_PROGRESS";
      }

      const trackedIssue: TrackedIssue = {
        ...issue,
        status,
        dateAdded: new Date().toISOString(),
        monthYear: selectedMonth,
      }
      setTrackedIssues((prev) => [...prev, trackedIssue])
    }
  }

  const updateIssueStatus = (issueNumber: number, newStatus: TrackedIssue["status"]) => {
    setTrackedIssues((prev) =>
      prev.map((issue) => (issue.number === issueNumber ? { ...issue, status: newStatus } : issue)),
    )
  }

  const removeFromTracking = (issueNumber: number) => {
    setTrackedIssues((prev) => prev.filter((issue) => issue.number !== issueNumber))
  }

  const clearAllData = () => {
    if (confirm("Are you sure you want to clear all tracked issues? This action cannot be undone.")) {
      setTrackedIssues([])
      localStorage.removeItem("trackedIssues")
      localStorage.removeItem("selectedMonth")
      localStorage.removeItem("repoOwner")
      localStorage.removeItem("repoName")
      setSelectedMonth(getCurrentMonthYear())
    }
  }

  const getStatusBadge = (status: TrackedIssue["status"]) => {
    switch (status) {
      case "EMPTY":
        return "bg-gray-100 text-gray-800 border-gray-200"
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "MERGED":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const filteredTrackedIssues = trackedIssues.filter((issue) => issue.monthYear === selectedMonth)

  const monthlyStats = {
    total: filteredTrackedIssues.length,
    empty: filteredTrackedIssues.filter((issue) => issue.status === "EMPTY").length,
    inProgress: filteredTrackedIssues.filter((issue) => issue.status === "IN_PROGRESS").length,
    merged: filteredTrackedIssues.filter((issue) => issue.status === "MERGED").length,
  }

  const availableMonths = getAvailableMonths(trackedIssues)
  if (availableMonths.length === 0) {
    availableMonths.push(getCurrentMonthYear())
  }

  if (!isInitialized) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your data...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-3 tracking-tight">Issues Dashboard</h1>
              <p className="text-muted-foreground text-lg">Track and manage GitHub repository issues with style</p>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              {trackedIssues.length > 0 && (
                <button
                  onClick={clearAllData}
                  className="px-4 py-2 text-red-600 hover:text-red-800 text-sm font-medium transition-colors duration-200"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={fetchIssues}
                disabled={loading}
                className="px-6 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-8 p-1 bg-muted rounded-xl">
            <button
              onClick={() => setActiveTab("issues")}
              className={`flex-1 px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === "issues"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Issues
              </div>
            </button>
            <button
              onClick={() => setActiveTab("tracking")}
              className={`flex-1 px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === "tracking"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Tracking ({trackedIssues.length})
              </div>
            </button>
          </div>

          {activeTab === "issues" && (
            <div className="space-y-6">
              <div className="flex gap-4">
                <input
                  className="flex-1 px-5 py-4 border-2 border-border bg-card rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                  placeholder="Paste GitHub repository URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <button
                  onClick={handleUrlSubmit}
                  className="px-8 py-4 bg-secondary text-secondary-foreground text-sm font-semibold rounded-xl hover:bg-secondary/90 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Load Repo
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  className="px-5 py-4 border-2 border-border bg-card rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                  placeholder="Owner"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                />
                <input
                  className="px-5 py-4 border-2 border-border bg-card rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                  placeholder="Repository"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                />
                <input
                  className="px-5 py-4 border-2 border-border bg-card rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                  placeholder="Search issues..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-5 py-4 border-2 border-border bg-card rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                >
                  {availableMonths.map((month) => (
                    <option key={month} value={month}>
                      Track for {formatMonthYear(month)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeTab === "tracking" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-5 py-3 border-2 border-border bg-card rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                >
                  {availableMonths.map((month) => (
                    <option key={month} value={month}>
                      {formatMonthYear(month)}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-4">
                  <div className="px-4 py-2 bg-accent text-accent-foreground rounded-full text-sm font-semibold">
                    {monthlyStats.total} Total
                  </div>
                  <div className="px-4 py-2 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">
                    {monthlyStats.empty} Empty
                  </div>
                  <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                    {monthlyStats.inProgress} In Progress
                  </div>
                  <div className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                    {monthlyStats.merged} Merged
                  </div>
                  {trackedIssues.length > 0 && (
                    <div className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                      Auto-saved
                    </div>
                  )}
                </div>
              </div>

              {filteredTrackedIssues.length > 0 ? (
                <div className="bg-card border-2 border-border rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 bg-muted border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">
                      {formatMonthYear(selectedMonth)} Issue Tracking
                    </h2>
                    <p className="text-sm text-muted-foreground">Track contributor progress and issue status</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">#</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Issue Link</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Contributor</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTrackedIssues.map((issue, index) => (
                          <tr key={issue.number} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                            <td className="px-6 py-4 text-sm font-mono text-foreground">#{issue.number}</td>
                            <td className="px-6 py-4">
                              <a
                                href={issue.html_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:text-primary/80 text-sm font-medium transition-colors duration-200 max-w-md truncate block"
                                title={issue.title}
                              >
                                {issue.title}
                              </a>
                            </td>
                            <td className="px-6 py-4 text-sm text-foreground">
                              {issue.assignee ? issue.assignee.login : "Unassigned"}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1.5 text-xs font-semibold rounded-lg border inline-block transition-all duration-200 ${getStatusBadge(issue.status)}`}>
                                {issue.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => removeFromTracking(issue.number)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors duration-200"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <p className="text-foreground font-semibold text-lg mb-2">
                    No Issues Tracked for {formatMonthYear(selectedMonth)}
                  </p>
                  <p className="text-muted-foreground mb-4">
                    Start tracking issues by selecting this month and clicking "Track" on any issue in the Issues tab
                  </p>
                  <button
                    onClick={() => setActiveTab("issues")}
                    className="px-6 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all duration-200"
                  >
                    Browse Issues
                  </button>
                </div>
              )}
            </div>
          )}
        </header>

        {activeTab === "issues" && (
          <div className="space-y-4">
            {filtered.length > 0 && (
              <div className="flex items-center gap-3 mb-8">
                <div className="px-4 py-2 bg-accent text-accent-foreground rounded-full text-sm font-semibold">
                  {filtered.length} issue{filtered.length !== 1 ? "s" : ""} found
                </div>
                <div className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                  Adding to {formatMonthYear(selectedMonth)}
                </div>
              </div>
            )}

            {filtered.map((issue) => (
              <div
                key={issue.number}
                className="bg-card border-2 border-border rounded-2xl p-8 hover:border-primary/50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="px-3 py-1 bg-primary/10 text-primary font-mono text-sm font-semibold rounded-lg border border-primary/20">
                        #{issue.number}
                      </span>
                      <a
                        href={issue.html_url}
                        className="text-foreground hover:text-primary font-semibold text-xl leading-tight transition-colors duration-200"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {issue.title}
                      </a>
                    </div>

                    {issue.labels.length > 0 && (
                      <div className="flex flex-wrap gap-3 mb-4">
                        {issue.labels.map((label) => (
                          <span
                            key={label.name}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm"
                            style={{ backgroundColor: `#${label.color}` }}
                          >
                            {label.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => addToTracking(issue)}
                    disabled={trackedIssues.some((t) => t.number === issue.number)}
                    className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {trackedIssues.some((t) => t.number === issue.number) ? "Tracked" : "Track"}
                  </button>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span className="text-muted-foreground">
                        Assignee:{" "}
                        {issue.assignee ? (
                          <span className="font-semibold text-foreground">{issue.assignee.login}</span>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      <span className="text-muted-foreground">
                        Comments: <span className="font-semibold text-foreground">{issue.comments}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Updated {new Date(issue.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}

            {filtered.length === 0 && !loading && (
              <div className="text-center py-20">
                <div className="text-muted-foreground mb-4">
                  <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-foreground font-semibold text-lg mb-2">No issues found</p>
                <p className="text-muted-foreground">
                  Try adjusting your search criteria or load a different repository
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
