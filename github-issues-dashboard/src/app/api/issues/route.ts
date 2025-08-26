import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner"); 
  const repo = searchParams.get("repo");     

  // Fetch to REST public API from GitHub
  const issuesRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=50`
  );

  const issuesData = await issuesRes.json();

  // Get all issues and their associated PRs
  const issues = await Promise.all((Array.isArray(issuesData) ? issuesData : [])
    .filter((i: any) => !i.pull_request)
    .map(async (issue: any) => {
      // Check if there's a PR linked to this issue
      const prRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues/${issue.number}/timeline?per_page=100`
      );
      const timeline = await prRes.json();
      
      // Find if there's a merged PR that references this issue
      const mergedPR = Array.isArray(timeline) && timeline.find((event: any) => 
        event.event === 'merged' && 
        event.commit_url && 
        event.commit_id
      );

      return {
        ...issue,
        merged: !!mergedPR
      };
    }));

  return NextResponse.json({
    repo: `${owner}/${repo}`,
    count: issues.length,
    issues,
  });
}
