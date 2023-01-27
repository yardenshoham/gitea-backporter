const GITHUB_API = "https://api.github.com";

// returns the current Gitea major minor version
const getGiteaMajorMinorVersion = async () => {
  const versionRequest = await fetch("https://dl.gitea.io/gitea/version.json");
  const versionJson = await versionRequest.json();
  const majorMinorVersionRegexResult =
    versionJson.latest.version.match(/(1\.\d+).*/);
  if (majorMinorVersionRegexResult === null) {
    throw new Error("Failed to extract major minor version from Gitea version");
  }
  return majorMinorVersionRegexResult[1];
};

// returns a list of PRs that are merged and have the backport label for the current Gitea version
const fetchCandidates = async (giteaMajorMinorVersion: string) => {
  const response = await fetch(
    `${GITHUB_API}/search/issues?q=` +
      encodeURIComponent(
        `is:pr is:merged label:backport/v${giteaMajorMinorVersion} -label:backport/done repo:go-gitea/gitea`
      )
  );
  return await response.json();
};

// returns the PRs merged commit hash
const getCommitHash = async (prNumber: number) => {
  const response = await fetch(
    `${GITHUB_API}/repos/go-gitea/gitea/pulls/${prNumber}`
  );
  const json = await response.json();
  return json.merge_commit_sha;
};

// returns true if a backport PR exists for the given PR number and Gitea version
const doesBackportPRExist = async (
  prNumber: number,
  giteaMajorMinorVersion: string
) => {
  const response = await fetch(
    `${GITHUB_API}/search/issues?q=` +
      encodeURIComponent(
        `is:pr is:open repo:go-gitea/gitea base:release/v${giteaMajorMinorVersion} ${prNumber} in:title`
      )
  );
  const json = await response.json();
  return json.total_count > 0;
};

const initializeGitRepo = async () => {
  await Deno.run({
    cmd: ["git", "clone", "https://github.com/yardenshoham/gitea.git"],
  }).status();
  await Deno.run({
    cwd: "gitea",
    cmd: [
      "git",
      "remote",
      "add",
      "upstream",
      "https://github.com/go-gitea/gitea.git",
    ],
  }).status();
};

const getPrBranchName = (prNumber: number, giteaMajorMinorVersion: string) =>
  `backport-${prNumber}-v${giteaMajorMinorVersion}`;

const cherryPickPR = async (
  prNumber: number,
  giteaMajorMinorVersion: string
) => {
  // fetch the upstream release branch
  await Deno.run({
    cwd: "gitea",
    cmd: ["git", "fetch", "upstream", `release/v${giteaMajorMinorVersion}`],
  }).status();

  // create the backport branch from the upstream release branch
  await Deno.run({
    cwd: "gitea",
    cmd: [
      "git",
      "checkout",
      `upstream/release/v${giteaMajorMinorVersion}`,
      "-b",
      getPrBranchName(prNumber, giteaMajorMinorVersion),
    ],
  }).status();

  // get the commit hash of the PR
  const commitHash = await getCommitHash(prNumber);
  console.log(`Cherry-picking ${commitHash}`);

  // cherry-pick the PR
  const cherryPickStatus = await Deno.run({
    cwd: "gitea",
    cmd: ["git", "cherry-pick", commitHash],
  }).status();

  if (!cherryPickStatus.success) {
    console.log("Cherry-pick failed");
    return;
  }

  // push the branch to the fork
  await Deno.run({
    cwd: "gitea",
    cmd: [
      "git",
      "push",
      "origin",
      getPrBranchName(prNumber, giteaMajorMinorVersion),
    ],
  }).status();
};

const createBackportPR = async (
  originalPr: { title: string; number: number; body: string },
  giteaMajorMinorVersion: string
) => {
  const response = await fetch(`${GITHUB_API}/repos/go-gitea/gitea/pulls`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("GITHUB_TOKEN")}`,
    },
    body: JSON.stringify({
      title: `${originalPr.title} (#${originalPr.number})`,
      head: `yardenshoham:${getPrBranchName(
        originalPr.number,
        giteaMajorMinorVersion
      )}`,
      base: `release/v${giteaMajorMinorVersion}`,
      body: `Backport #${originalPr.number}\n` + originalPr.body,
    }),
  });
  const json = await response.json();
  console.log(`Created backport PR: ${json.html_url}`);
};

const addBackportDoneLabel = async (prNumber: number) => {
  const response = await fetch(
    `${GITHUB_API}/repos/go-gitea/gitea/issues/${prNumber}/labels`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("GITHUB_TOKEN")}`,
      },
      body: JSON.stringify({ labels: "backport/done" }),
    }
  );
  const json = await response.json();
  console.log(`Added backport/done label to PR: ${json.html_url}`);
};

const run = async () => {
  const giteaMajorMinorVersion = await getGiteaMajorMinorVersion();
  const candidates = await fetchCandidates(giteaMajorMinorVersion);
  if (candidates.total_count === 0) {
    console.log("No candidates found");
    return;
  }
  await initializeGitRepo();
  for (const candidate of candidates.items) {
    if (await doesBackportPRExist(candidate.number, giteaMajorMinorVersion)) {
      continue;
    }
    console.log(`Cherry-picking #${candidate.number}`);
    await cherryPickPR(candidate.number, giteaMajorMinorVersion);

    console.log(`Creating backport PR for #${candidate.number}`);
    await createBackportPR(candidate, giteaMajorMinorVersion);

    console.log(`Adding backport/done label to #${candidate.number}`);
    await addBackportDoneLabel(candidate.number);
  }
};

run();
