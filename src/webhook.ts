import { serve } from "https://deno.land/std@0.178.0/http/server.ts";

serve((req: Request) => {
  if (req.url.endsWith("/trigger")) {
    return Response.json({ message: "Triggered backport" });
  } else {
    return Response.json({ status: "OK" });
  }
});
