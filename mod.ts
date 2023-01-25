import Watcher from "npm:feed-watcher";

const getGiteaMajorMinorVersion = async () => {
  const versionRequest = await fetch("https://dl.gitea.io/gitea/version.json");
  const versionJson: { "latest": { "version": string } } = await versionRequest
    .json();
  const majorMinorVersionRegexResult = versionJson.latest.version.match(
    /(1\.\d+).*/,
  );
  if (majorMinorVersionRegexResult === null) {
    Deno.exit(1);
  }
  return majorMinorVersionRegexResult[1];
};

const majorMinorVersion = await getGiteaMajorMinorVersion();
console.log(majorMinorVersion);

const watcher = new Watcher("https://github.com/yardenshoham.atom");
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
    console.log(entries);
  })
  .catch(function (error) {
    console.error(error);
  });
