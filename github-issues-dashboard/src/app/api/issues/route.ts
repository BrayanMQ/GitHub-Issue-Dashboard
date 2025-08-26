import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner") || "AquaStark"; 
  const repo = searchParams.get("repo") || "Aqua-Stark";     

  // Fetch to REST public API from GitHub
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=50`
  );

  const data = await res.json();

  // Filtering only issues (no PRs)
  const issues = (Array.isArray(data) ? data : []).filter((i: any) => !i.pull_request);

  return NextResponse.json({
    repo: `${owner}/${repo}`,
    count: issues.length,
    issues,
  });
}
