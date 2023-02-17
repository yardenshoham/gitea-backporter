import * as semver from "https://deno.land/std@0.177.0/semver/mod.ts";
import { getPrBranchName } from "./git.ts";
import { GiteaVersion } from "./giteaVersion.ts";

const GITHUB_API = "https://api.github.com";
const HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${Deno.env.get("BACKPORTER_GITHUB_TOKEN")}`,
};

// returns a list of PRs that are merged and have the backport label for the current Gitea version
export const fetchCandidates = async (giteaMajorMinorVersion: string) => {
  const response = await fetch(
    `${GITHUB_API}/search/issues?q=` +
      encodeURIComponent(
        `is:pr is:merged label:backport/v${giteaMajorMinorVersion} -label:backport/done repo:go-gitea/gitea`,
      ),
  );
  const json = await response.json();
  for (const item of json.items) {
    console.log(`- ${item.title} (#${item.number})`);
  }
  return json;
};

// returns the PR
export const fetchPr = async (prNumber: number) => {
  const response = await fetch(
    `${GITHUB_API}/repos/go-gitea/gitea/pulls/${prNumber}`,
  );
  return response.json();
};

// returns true if a backport PR exists for the given PR number and Gitea version
export const backportPrExists = async (
  pr: { number: number },
  giteaMajorMinorVersion: string,
) => {
  const response = await fetch(
    `${GITHUB_API}/search/issues?q=` +
      encodeURIComponent(
        `is:pr is:open repo:go-gitea/gitea base:release/v${giteaMajorMinorVersion} ${pr.number} in:title`,
      ),
  );
  const json = await response.json();
  return json.total_count > 0;
};

// get Gitea milestones
export const getMilestones = async () => {
  const response = await fetch(`${GITHUB_API}/repos/go-gitea/gitea/milestones`);
  const json = await response.json();
  return json.filter((m: { title: string }) => semver.valid(m.title));
};

export const createBackportPr = async (
  originalPr: {
    title: string;
    number: number;
    body: string;
    labels: [{ name: string }];
    user: { login: string };
  },
  giteaVersion: GiteaVersion,
) => {
  let response = await fetch(`${GITHUB_API}/repos/go-gitea/gitea/pulls`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      title: `${originalPr.title} (#${originalPr.number})`,
      head: `${Deno.env.get("BACKPORTER_GITEA_FORK")?.split("/")[0]}:${
        getPrBranchName(
          originalPr.number,
          giteaVersion.majorMinorVersion,
        )
      }`,
      base: `release/v${giteaVersion.majorMinorVersion}`,
      body: `Backport #${originalPr.number}\n\n` + originalPr.body,
      maintainer_can_modify: true,
    }),
  });
  const json = await response.json();
  console.log("Created backport PR");
  console.log(json);

  // filter lgtm/*, backport/* and reviewed/* labels
  const labels = originalPr.labels
    .map((label) => label.name)
    .filter((label) => {
      return (
        !label.startsWith("lgtm/") &&
        !label.startsWith("backport/") &&
        !label.startsWith("reviewed/")
      );
    });

  // add labels
  response = await fetch(
    `${GITHUB_API}/repos/go-gitea/gitea/issues/${json.number}/labels`,
    {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ labels }),
    },
  );

  // set assignees and milestone
  await fetch(
    `${GITHUB_API}/repos/go-gitea/gitea/issues/${json.number}`,
    {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({
        assignees: [originalPr.user.login],
        milestone: giteaVersion.milestoneNumber,
      }),
    },
  );
};

export const addBackportDoneLabel = async (prNumber: number) => {
  const response = await fetch(
    `${GITHUB_API}/repos/go-gitea/gitea/issues/${prNumber}/labels`,
    {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ labels: ["backport/done"] }),
    },
  );
  const json = await response.json();
  console.log(
    `Added backport/done label to PR #${prNumber}: ${
      json.map((l: { name: string }) => l.name)
    }`,
  );
};

// trigger GitHub action using workflow_dispatch
export const triggerBackportAction = async () => {
  const response = await fetch(
    `${GITHUB_API}/repos/yardenshoham/gitea-backporter/actions/workflows/backport.yml/dispatches`,
    {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ ref: "main" }),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to trigger backport action: ${response.status}`);
  }
  console.log(`Triggered backport action`);
};
