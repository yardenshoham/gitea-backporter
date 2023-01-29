import { serve } from "https://deno.land/std@0.175.0/http/server.ts";
import { triggerBackportAction } from "./github.ts";

if (
  Deno.env.get("GITEA_FORK") === undefined ||
  Deno.env.get("GITHUB_TOKEN") === undefined
) {
  console.log("GITEA_FORK and GITHUB_TOKEN must be set");
  Deno.exit(1);
}

serve(async (_: Request) => {
  await triggerBackportAction();
  return new Response("OK");
});
