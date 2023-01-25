const Watcher = require("feed-watcher");

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

getGiteaMajorMinorVersion().then((version) => {
  console.log(version);
});

const watcher = new Watcher("https://github.com/yardenshoham.atom", 10);
// Check for new entries every n seconds.
watcher.on("new entries", function (entries) {
  entries.forEach(function (entry) {
    console.log(entry.title);
  });
});

// Start watching the feed.
watcher
  .start()
  .then(function (entries) {
    entries.forEach(function (entry) {
      console.log(entry.title);
    });
    console.log("Watching for new entries...");
  })
  .catch(function (error) {
    console.error(error);
  });
