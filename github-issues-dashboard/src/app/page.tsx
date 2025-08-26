"use client"

import { useEffect, useState } from "react"

type Issue = {
  number: number
  title: string
  html_url: string
  labels: { name: string; color: string }[]
  assignee: { login: string } | null
  comments: number
  updated_at: string
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

export default function Home() {
  const [owner, setOwner] = useState("AquaStark")
  const [repo, setRepo] = useState("Aqua-Stark")
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState("")
  const [url, setUrl] = useState("")

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
    fetchIssues()
  }, [])

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
      fetchIssues()
    } else {
      alert("Invalid GitHub URL. Please use format: https://github.com/owner/repo")
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <header className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-3 tracking-tight">Issues Dashboard</h1>
              <p className="text-muted-foreground text-lg">Track and manage GitHub repository issues with style</p>
            </div>
            <button
              onClick={fetchIssues}
              disabled={loading}
              className="px-6 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>
          </div>
        </header>

        <div className="space-y-4">
          {filtered.length > 0 && (
            <div className="flex items-center gap-3 mb-8">
              <div className="px-4 py-2 bg-accent text-accent-foreground rounded-full text-sm font-semibold">
                {filtered.length} issue{filtered.length !== 1 ? "s" : ""} found
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
              <p className="text-muted-foreground">Try adjusting your search criteria or load a different repository</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
