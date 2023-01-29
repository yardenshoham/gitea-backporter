import { serve } from "https://deno.land/std@0.175.0/http/server.ts";
import { triggerBackportAction } from "./github.ts";

if (
  Deno.env.get("GITEA_FORK") === undefined ||
  Deno.env.get("GITHUB_TOKEN") === undefined ||
  Deno.env.get("WEBHOOK_SECRET_SHA256") === undefined
) {
  console.log("Missing environment variables");
  Deno.exit(1);
}

serve(async (req: Request) => {
  if (req.url.endsWith("/trigger")) {
    if (
      req.headers.get("X-Hub-Signature-256") ===
      "sha256=" + Deno.env.get("WEBHOOK_SECRET_SHA256")
    ) {
      await triggerBackportAction();
      return Response.json({ message: "Triggered backport" });
    } else {
      return Response.json({ message: "Invalid signature" });
    }
  } else {
    return Response.json({ status: "OK" });
  }
});
