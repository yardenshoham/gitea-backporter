import { GitHubResponse } from "./types.ts";

const versionRequest = await fetch("https://dl.gitea.io/gitea/version.json");
const versionJson: { "latest": { "version": string } } = await versionRequest
  .json();
const majorMinorVersionRegexResult = versionJson.latest.version.match(
  /(1\.\d+).*/,
);
if (majorMinorVersionRegexResult === null) {
  Deno.exit(1);
}
const majorMinorVersion = majorMinorVersionRegexResult[1];
console.log(majorMinorVersion);

const pullsRequest = await fetch(
  "https://api.github.com/search/issues?q=" +
    encodeURIComponent(
      `is:pr label:backport/v${majorMinorVersion} -label:backport/done repo:go-gitea/gitea`,
    ),
);
const pullsJson: GitHubResponse = await pullsRequest.json();
console.log(pullsJson.items[0].number);
