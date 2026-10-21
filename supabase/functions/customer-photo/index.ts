
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "repair-photos";
const SIGNED_URL_SECONDS = 300;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const responseHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function json(
  body: Record<string, unknown>,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders,
  });
}

function isValidToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{64}$/i.test(value)
  );
}

function isValidUUID(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return json(
      { error: "Method not allowed." },
      405
    );
  }

  try {
    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return json(
        { error: "Invalid JSON request body." },
        400
      );
    }

    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      return json(
        { error: "Invalid request body." },
        400
      );
    }

    const { token, photoId } = payload as {
      token?: unknown;
      photoId?: unknown;
    };

    if (!isValidToken(token)) {
      return json(
        { error: "Invalid tracking token." },
        400
      );
    }

    if (!isValidUUID(photoId)) {
      return json(
        { error: "Invalid photo identifier." },
        400
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        "[customer-photo] Missing Supabase environment configuration."
      );

      return json(
        { error: "Photo service is not configured." },
        503
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // The database function must validate:
    // 1. The tracking token is valid and not revoked.
    // 2. The tracking token has not expired.
    // 3. The photo belongs to the tracked repair.
    // 4. The photo is marked customer_visible.
    //
    // Never accept a storage path directly from the client.

    const { data: storagePath, error: lookupError } =
      await supabase.rpc("get_tracking_photo_path", {
        raw_token: token,
        target_photo: photoId,
      });

    if (lookupError) {
      console.error(
        "[customer-photo] Photo authorization lookup failed:",
        lookupError.code,
        lookupError.message
      );

      return json(
        { error: "Unable to verify photo access." },
        500
      );
    }

    if (
      typeof storagePath !== "string" ||
      !storagePath.trim()
    ) {
      return json(
        {
          error:
            "Photo unavailable. The tracking link may have expired, or this photo may not be shared with customers.",
        },
        404
      );
    }

    // The storage path comes from the trusted database RPC,
    // not from the incoming HTTP request.

    const { data: signedData, error: signedError } =
      await supabase.storage
        .from(BUCKET)
        .createSignedUrl(
          storagePath,
          SIGNED_URL_SECONDS
        );

    if (signedError || !signedData?.signedUrl) {
      console.error(
        "[customer-photo] Signed URL creation failed:",
        signedError?.message || "No URL returned"
      );

      return json(
        { error: "Unable to retrieve this photo." },
        502
      );
    }

    return json({
      url: signedData.signedUrl,
      expiresIn: SIGNED_URL_SECONDS,
    });
  } catch (error) {
    console.error(
      "[customer-photo] Unexpected error:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return json(
      { error: "Unable to load photo right now." },
      500
    );
  }
});
