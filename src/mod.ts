import { cherryPickPr, initializeGitRepo } from "./git.ts";
import { GiteaVersion } from "./giteaVersion.ts";
import {
  addBackportDoneLabel,
  backportPrExists,
  createBackportPr,
  fetchCandidates,
  fetchPr,
} from "./github.ts";

const run = async () => {
  const giteaVersion = await GiteaVersion.fetch();
  const candidates = await fetchCandidates(giteaVersion.majorMinorVersion);
  if (candidates.total_count === 0) {
    console.log("No candidates found");
    return;
  }
  await initializeGitRepo();
  for (const candidate of candidates.items) {
    if (await backportPrExists(candidate, giteaVersion.majorMinorVersion)) {
      continue;
    }
    const originalPr = await fetchPr(candidate.number);
    console.log(`Cherry-picking #${originalPr.number}`);
    await cherryPickPr(
      originalPr.merge_commit_sha,
      originalPr.number,
      giteaVersion.majorMinorVersion
    );

    console.log(`Creating backport PR for #${originalPr.number}`);
    await createBackportPr(originalPr, giteaVersion);

    console.log(`Adding backport/done label to #${originalPr.number}`);
    await addBackportDoneLabel(originalPr.number);
  }
};

run();
