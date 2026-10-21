
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "repair-photos";
const SIGNED_URL_SECONDS = 300;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "POST") {
    return respond({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await request.json().catch(() => null);

    const token =
      typeof body?.token === "string"
        ? body.token.toLowerCase()
        : "";

    const photoId = body?.photoId;

    if (!/^[0-9a-f]{64}$/.test(token)) {
      return respond({ error: "Invalid tracking token" }, 400);
    }

    if (
      typeof photoId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(photoId)
    ) {
      return respond({ error: "Invalid photo ID" }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!url || !key) {
      console.error("Missing Supabase configuration");
      return respond({ error: "Photo service unavailable" }, 503);
    }

    const admin = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: path, error: lookupError } = await admin.rpc(
      "get_tracking_photo_path",
      {
        raw_token: token,
        target_photo: photoId,
      }
    );

    if (lookupError) {
      console.error("Photo lookup:", lookupError);
      return respond({ error: "Photo authorization failed" }, 500);
    }

    if (typeof path !== "string" || !path) {
      return respond(
        { error: "Photo not shared or tracking link expired" },
        404
      );
    }

    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_SECONDS);

    if (error || !data?.signedUrl) {
      console.error("Signed URL:", error);
      return respond({ error: "Unable to load photo" }, 502);
    }

    return respond({
      url: data.signedUrl,
      expiresIn: SIGNED_URL_SECONDS,
    });
  } catch (error) {
    console.error("Customer photo error:", error);
    return respond({ error: "Unexpected photo service error" }, 500);
  }
});
