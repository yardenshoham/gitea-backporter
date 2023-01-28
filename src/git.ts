export const getPrBranchName = (
  prNumber: number,
  giteaMajorMinorVersion: string,
) => `backport-${prNumber}-v${giteaMajorMinorVersion}`;

export const initializeGitRepo = async () => {
  await Deno.run({
    cmd: [
      "git",
      "clone",
      `https://github.com/${Deno.env.get("GITEA_FORK")}.git`,
    ],
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

export const cherryPickPr = async (
  commitHash: string,
  prNumber: number,
  giteaMajorMinorVersion: string,
) => {
  // fetch the upstream main branch
  await Deno.run({
    cwd: "gitea",
    cmd: ["git", "fetch", "upstream", "main"],
  }).status();

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
