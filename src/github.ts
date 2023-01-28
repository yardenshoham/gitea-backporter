import { getPrBranchName } from "./git.ts";

const GITHUB_API = "https://api.github.com";
const HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${Deno.env.get("GITHUB_TOKEN")}`,
};

// returns a list of PRs that are merged and have the backport label for the current Gitea version
export const fetchCandidates = async (giteaMajorMinorVersion: string) => {
  const response = await fetch(
    `${GITHUB_API}/search/issues?q=` +
      encodeURIComponent(
        `is:pr is:merged label:backport/v${giteaMajorMinorVersion} -label:backport/done repo:go-gitea/gitea`
      )
  );
  return await response.json();
};

// returns the PR
export const fetchPr = async (prNumber: number) => {
  const response = await fetch(
    `${GITHUB_API}/repos/go-gitea/gitea/pulls/${prNumber}`
  );
  return response.json();
};

// returns true if a backport PR exists for the given PR number and Gitea version
export const backportPrExists = async (
  pr: { number: number },
  giteaMajorMinorVersion: string
) => {
  const response = await fetch(
    `${GITHUB_API}/search/issues?q=` +
      encodeURIComponent(
        `is:pr is:open repo:go-gitea/gitea base:release/v${giteaMajorMinorVersion} ${pr.number} in:title`
      )
  );
  const json = await response.json();
  return json.total_count > 0;
};

export const createBackportPr = async (
  originalPr: {
    title: string;
    number: number;
    body: string;
    labels: [{ name: string }];
    user: { login: string };
  },
  giteaMajorMinorVersion: string
) => {
  const response = await fetch(`${GITHUB_API}/repos/go-gitea/gitea/pulls`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      title: `${originalPr.title} (#${originalPr.number})`,
      head: `yardenshoham:${getPrBranchName(
        originalPr.number,
        giteaMajorMinorVersion
      )}`,
      base: `release/v${giteaMajorMinorVersion}`,
      body: `Backport #${originalPr.number}\n\n` + originalPr.body,
      maintainer_can_modify: true,
    }),
  });
  const json = await response.json();
  console.log(`Created backport PR: ${json.html_url}`);

  // filter lgtm/* and backport/* labels
  const labels = originalPr.labels
    .map((label) => label.name)
    .filter((label) => {
      return !label.startsWith("lgtm/") && !label.startsWith("backport/");
    });

  // set labels, assignees and (TODO) milestone
  await fetch(`${GITHUB_API}/repos/go-gitea/gitea/issues/${json.number}`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify({
      labels,
      assignees: [originalPr.user.login],
    }),
  });
};

export const addBackportDoneLabel = async (prNumber: number) => {
  const response = await fetch(
    `${GITHUB_API}/repos/go-gitea/gitea/issues/${prNumber}/labels`,
    {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ labels: ["backport/done"] }),
    }
  );
  const json = await response.json();
  console.log(`Added backport/done label to PR: ${json.url}`);
};
