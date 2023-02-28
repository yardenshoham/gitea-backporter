import { serve } from "https://deno.land/std@0.178.0/http/server.ts";

serve(async (req: Request) => {
  const json = await req.json();
  console.log(json);
  return Response.json({ status: "OK" });
});
