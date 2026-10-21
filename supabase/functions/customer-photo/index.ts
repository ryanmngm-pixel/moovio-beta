
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers }
    );
  }

  try {
    const { token, photoId } = await request.json();

    if (
      typeof token !== "string" ||
      !/^[0-9a-f]{64}$/.test(token) ||
      typeof photoId !== "string" ||
      !/^[0-9a-f-]{36}$/.test(photoId)
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 400, headers }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: path, error } = await supabase.rpc(
      "get_tracking_photo_path",
      {
        raw_token: token,
        target_photo: photoId,
      }
    );

    if (error || !path) {
      return new Response(
        JSON.stringify({ error: "Photo unavailable" }),
        { status: 404, headers }
      );
    }

    const { data, error: signError } = await supabase.storage
      .from("repair-photos")
      .createSignedUrl(path, 60);

    if (signError || !data?.signedUrl) {
      throw new Error("Unable to create photo URL");
    }

    return new Response(
      JSON.stringify({ url: data.signedUrl }),
      { status: 200, headers }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Unable to load photo" }),
      { status: 500, headers }
    );
  }
});
