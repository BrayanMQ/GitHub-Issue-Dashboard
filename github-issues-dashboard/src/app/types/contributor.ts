export type ContributorStatus = "EMPTY" | "IN_PROGRESS" | "MERGED"

export type TrackedIssue = {
  issueNumber: number
  contributor: string
  status: ContributorStatus
  notes?: string
}

export type ContributorData = {
  [repoKey: string]: TrackedIssue[]
}
