
import { useCallback, useEffect, useState } from "react";
import {
  CarFront,
  Clock3,
  ShieldCheck,
  Camera,
  RefreshCw,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import "./CustomerTracking.css";

const stages = [
  ["checked_in", "Checked in"],
  ["estimating", "Estimating"],
  ["waiting_parts", "Waiting on parts"],
  ["in_repair", "In repair"],
  ["paint", "Paint"],
  ["quality_check", "Quality check"],
  ["ready", "Ready for pickup"],
  ["delivered", "Delivered"],
];

const REFRESH_INTERVAL = 60000;

function normalizeCollection(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeTrackingResponse(data) {
  let result = data;

  if (typeof result === "string") {
    try {
      result = JSON.parse(result);
    } catch {
      return null;
    }
  }

  if (Array.isArray(result)) {
    result = result[0] ?? null;
  }

  if (!result || typeof result !== "object") {
    return null;
  }

  return {
    ...result,
    updates: normalizeCollection(result.updates).filter(
      (update) =>
        update &&
        typeof update === "object" &&
        update.customer_visible !== false
    ),
    photos: normalizeCollection(result.photos).filter(
      (photo) =>
        photo &&
        typeof photo === "object" &&
        photo.customer_visible !== false
    ),
  };
}

function formatDate(value, options) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString(undefined, options);
}

function formatDateTime(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString();
}

function formatCompletion(value) {
  if (!value) return "To be determined";

  const datePart = String(value).slice(0, 10);
  const date = new Date(`${datePart}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "To be determined";
  }

  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function CustomerPhoto({ photo, token }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPhoto = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    setUrl("");

    try {
      if (!photo?.id) {
        throw new Error("Photo identifier is missing.");
      }

      const { data, error: functionError } =
        await supabase.functions.invoke("customer-photo", {
          body: {
            token,
            photoId: photo.id,
          },
        });

      if (signal.cancelled) return;

      if (functionError) {
        let detail = functionError.message;

        if (functionError.context) {
          try {
            const response = functionError.context;
            const payload = await response.clone().json();

            detail =
              payload?.error ||
              payload?.message ||
              detail;
          } catch {
            // Keep the original function error.
          }
        }

        throw new Error(
          detail || "Photo service is unavailable."
        );
      }

      if (!data?.url || typeof data.url !== "string") {
        throw new Error(
          "The photo service did not return an image URL."
        );
      }

      setUrl(data.url);
    } catch (err) {
      if (!signal.cancelled) {
        setError(
          err.message || "Unable to load this photo."
        );
      }
    } finally {
      if (!signal.cancelled) {
        setLoading(false);
      }
    }
  }, [photo?.id, token]);

  useEffect(() => {
    const signal = { cancelled: false };

    loadPhoto(signal);

    return () => {
      signal.cancelled = true;
    };
  }, [loadPhoto]);

  return (
    <div className="customer-photo">
      {loading ? (
        <div
          className="customer-photo-placeholder"
          style={{
            minHeight: 170,
            display: "grid",
            placeItems: "center",
            padding: 20,
            textAlign: "center",
          }}
        >
          Loading photo...
        </div>
      ) : error ? (
        <div
          className="customer-photo-placeholder"
          style={{
            minHeight: 170,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 20,
            textAlign: "center",
          }}
        >
          <Camera size={24} />
          <span>Photo unavailable</span>
          <small style={{ overflowWrap: "anywhere" }}>
            {error}
          </small>
          <button
            type="button"
            onClick={() => {
              const signal = { cancelled: false };
              loadPhoto(signal);
            }}
            style={{
              padding: "8px 14px",
              border: "1px solid currentColor",
              borderRadius: 8,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <img
          src={url}
          alt={photo.caption || "Vehicle repair progress"}
          loading="lazy"
          onError={() => {
            setUrl("");
            setError(
              "The image link expired or the image could not be opened."
            );
          }}
        />
      )}

      {photo.caption && <p>{photo.caption}</p>}
    </div>
  );
}

export default function CustomerTracking({ token }) {
  const [repair, setRepair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastChecked, setLastChecked] = useState(null);

  const load = useCallback(
    async ({ initial = false } = {}) => {
      if (initial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        if (!token || typeof token !== "string") {
          throw new Error(
            "This tracking link is missing its access token."
          );
        }

        const { data, error: rpcError } = await supabase.rpc(
          "get_customer_tracking",
          { raw_token: token }
        );

        if (rpcError) {
          throw new Error(
            `Unable to retrieve repair tracking: ${rpcError.message}`
          );
        }

        const normalized = normalizeTrackingResponse(data);

        if (!normalized) {
          setRepair(null);
          setError(
            "This tracking link is invalid, revoked, or has expired."
          );
          return;
        }

        setRepair(normalized);
        setError("");
        setLastChecked(new Date());
      } catch (err) {
        setError(
          err.message ||
            "Unable to load your repair right now."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    let active = true;

    async function initialLoad() {
      if (active) {
        await load({ initial: true });
      }
    }

    initialLoad();

    const timer = setInterval(() => {
      if (active && !document.hidden) {
        load();
      }
    }, REFRESH_INTERVAL);

    function onFocus() {
      if (active) {
        load();
      }
    }

    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const index = repair
    ? stages.findIndex(
        ([key]) => key === repair.repair_status
      )
    : -1;

  const progress =
    index >= 0
      ? Math.round(((index + 1) / stages.length) * 100)
      : 0;

  const updates = repair?.updates ?? [];
  const photos = repair?.photos ?? [];

  return (
    <div className="customer-page">
      <header className="customer-header">
        <div className="customer-brand">
          <span className="customer-brand-mark">m</span>
          moovio<span>.</span>
        </div>

        <div className="customer-header-label">
          <ShieldCheck size={15} />
          PRIVATE REPAIR TRACKING
        </div>
      </header>

      <main className="customer-main">
        {loading && !repair ? (
          <div className="customer-message">
            Loading your repair...
          </div>
        ) : error && !repair ? (
          <div className="customer-message">
            <h1>Link unavailable.</h1>
            <p>{error}</p>

            <button
              type="button"
              onClick={() => load({ initial: true })}
              style={{
                marginTop: 18,
                padding: "10px 16px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        ) : repair ? (
          <>
            <div className="customer-intro">
              <span className="customer-eyebrow">
                YOUR VEHICLE. YOUR UPDATES.
              </span>

              <h1>
                You're in
                <br />
                <em>the loop.</em>
              </h1>

              <p>
                Follow your vehicle's repair progress,
                without making a call.
              </p>
            </div>

            {error && (
              <div
                className="customer-message"
                role="alert"
                style={{
                  marginBottom: 24,
                  overflowWrap: "anywhere",
                }}
              >
                <p>
                  Couldn't refresh the latest information.
                  Showing the last successfully loaded repair.
                </p>
                <small>{error}</small>
              </div>
            )}

            <section className="customer-card">
              <div className="customer-card-top">
                <span>VEHICLE OVERVIEW</span>
                <CarFront size={21} />
              </div>

              <h2>
                {repair.vehicle_year} {repair.vehicle_make}
                <br />
                {repair.vehicle_model}
              </h2>

              <p>
                Being taken care of by {repair.shop_name}
              </p>

              <div className="customer-progress-heading">
                <span>REPAIR PROGRESS</span>
                <strong>
                  {stages[index]?.[1] ?? "Updating"}
                </strong>
              </div>

              <div
                className="customer-progress-bar"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Repair stage progress"
              >
                <div style={{ width: `${progress}%` }} />
              </div>

              <div className="customer-timeline">
                {stages.map(([key, label], i) => (
                  <div
                    className={`customer-stage ${
                      i < index ? "completed" : ""
                    } ${
                      i === index ? "current" : ""
                    }`}
                    key={key}
                  >
                    <span className="customer-stage-dot" />
                    <span>{label}</span>

                    {i === index && (
                      <small>CURRENT STAGE</small>
                    )}
                  </div>
                ))}
              </div>

              <div className="customer-details">
                <div>
                  <Clock3 size={19} />
                  <span>Estimated completion</span>
                  <strong>
                    {formatCompletion(
                      repair.estimated_completion
                    )}
                  </strong>
                </div>

                <div>
                  <ShieldCheck size={19} />
                  <span>Last updated</span>
                  <strong>
                    {formatDateTime(repair.last_updated)}
                  </strong>
                </div>
              </div>

              {photos.length > 0 && (
                <div className="customer-extra-section">
                  <span className="customer-eyebrow">
                    FROM THE SHOP
                  </span>

                  <h3>
                    <Camera size={22} />
                    Repair photos.
                  </h3>

                  <div className="customer-photo-grid">
                    {photos.map((photo) => (
                      <CustomerPhoto
                        key={photo.id}
                        photo={photo}
                        token={token}
                      />
                    ))}
                  </div>
                </div>
              )}

              {updates.length > 0 && (
                <div className="customer-extra-section">
                  <span className="customer-eyebrow">
                    REPAIR JOURNAL
                  </span>

                  <h3>Latest updates.</h3>

                  <div className="customer-updates">
                    {updates.map((update) => (
                      <div
                        className="customer-update"
                        key={update.id}
                      >
                        <small>
                          {formatDate(update.created_at)}
                        </small>
                        <p>{update.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {photos.length === 0 &&
                updates.length === 0 && (
                  <div className="customer-extra-section">
                    <span className="customer-eyebrow">
                      FROM THE SHOP
                    </span>
                    <h3>More updates are on the way.</h3>
                    <p>
                      Your repair status is available above.
                      Photos and progress notes shared by
                      the shop will appear here.
                    </p>
                  </div>
                )}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  marginTop: 28,
                  paddingTop: 18,
                  borderTop: "1px solid rgba(128,128,128,.2)",
                }}
              >
                <small>
                  {lastChecked
                    ? `Checked ${formatDateTime(lastChecked)}`
                    : "Waiting for latest information"}
                </small>

                <button
                  type="button"
                  disabled={refreshing}
                  onClick={() => load()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    border: "1px solid rgba(128,128,128,.35)",
                    borderRadius: 8,
                    padding: "9px 13px",
                    background: "transparent",
                    color: "inherit",
                    cursor: refreshing
                      ? "wait"
                      : "pointer",
                  }}
                >
                  <RefreshCw size={15} />
                  {refreshing
                    ? "Refreshing..."
                    : "Refresh updates"}
                </button>
              </div>
            </section>

            <div className="customer-disclaimer">
              <p>
                Repair timelines are estimates and may
                change as work progresses.
              </p>

              <p>
                Questions about your vehicle? Contact{" "}
                {repair.shop_name} directly.
              </p>
            </div>
          </>
        ) : (
          <div className="customer-message">
            <h1>Repair unavailable.</h1>
            <p>Please try again later.</p>
          </div>
        )}
      </main>

      <footer className="customer-footer">
        <span>POWERED BY MOOVIO</span>
        <span>LESS CALLING. MORE MOOVING.</span>
      </footer>
    </div>
  );
}
