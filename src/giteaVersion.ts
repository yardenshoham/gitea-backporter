// returns the current Gitea version
const getGiteaVersion = async () => {
  const versionRequest = await fetch("https://dl.gitea.io/gitea/version.json");
  const versionJson = await versionRequest.json();
  return versionJson.latest.version;
};

// returns the current Gitea major minor version
const getGiteaMajorMinorVersion = async () => {
  const version = await getGiteaVersion();
  const majorMinorVersionRegexResult = version.match(/(1\.\d+).*/);
  if (majorMinorVersionRegexResult === null) {
    throw new Error("Failed to extract major minor version from Gitea version");
  }
  return majorMinorVersionRegexResult[1];
};

// returns the current Gitea version with the patch version set incremented by 1
const getGiteaNextPatchVersion = async () => {
  const version = await getGiteaVersion();
  const nextPatchVersionRegexResult = version.match(/(1\.\d+\.)(\d+)/);
  if (nextPatchVersionRegexResult === null) {
    throw new Error("Failed to extract next patch version from Gitea version");
  }
  return (
    nextPatchVersionRegexResult[1] +
    (parseInt(nextPatchVersionRegexResult[2]) + 1)
  );
};

export class GiteaVersion {
  majorMinorVersion: string;
  nextPatchVersion: string;

  static async fetch() {
    const giteaVersion = new GiteaVersion();
    await giteaVersion.init();
    return giteaVersion;
  }

  private constructor() {
    this.majorMinorVersion = "";
    this.nextPatchVersion = "";
  }

  async init() {
    this.majorMinorVersion = await getGiteaMajorMinorVersion();
    this.nextPatchVersion = await getGiteaNextPatchVersion();
  }
}
