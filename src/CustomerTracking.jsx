
import { useEffect, useState } from "react";
import {
  CarFront,
  Clock3,
  ShieldCheck,
  Camera,
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

function CustomerPhoto({ photo, token }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPhoto() {
      const { data, error } = await supabase.functions.invoke(
        "customer-photo",
        {
          body: {
            token,
            photoId: photo.id,
          },
        }
      );

      if (active && !error && data?.url) {
        setUrl(data.url);
      }
    }

    loadPhoto();

    return () => {
      active = false;
    };
  }, [photo.id, token]);

  if (!url) return null;

  return (
    <div className="customer-photo">
      <img
        src={url}
        alt={photo.caption || "Vehicle repair progress"}
        loading="lazy"
      />
      {photo.caption && <p>{photo.caption}</p>}
    </div>
  );
}

export default function CustomerTracking({ token }) {
  const [repair, setRepair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const { data, error } = await supabase.rpc(
        "get_customer_tracking",
        { raw_token: token }
      );

      if (!active) return;

      if (error) {
        setError("Unable to load your repair right now.");
        setRepair(null);
      } else if (!data?.length) {
        setError("This tracking link is invalid or has expired.");
        setRepair(null);
      } else {
        setRepair(data[0]);
        setError("");
      }

      setLoading(false);
    }

    load();
    const timer = setInterval(load, 60000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [token]);

  const index = repair
    ? stages.findIndex(
        ([key]) => key === repair.repair_status
      )
    : -1;

  const progress =
    index >= 0
      ? Math.round(((index + 1) / stages.length) * 100)
      : 0;

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
        {loading ? (
          <div className="customer-message">
            Loading your repair...
          </div>
        ) : error ? (
          <div className="customer-message">
            <h1>Link unavailable.</h1>
            <p>{error}</p>
          </div>
        ) : (
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
                    } ${i === index ? "current" : ""}`}
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
                    {repair.estimated_completion
                      ? new Date(
                          `${repair.estimated_completion}T12:00:00`
                        ).toLocaleDateString(undefined, {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "To be determined"}
                  </strong>
                </div>

                <div>
                  <ShieldCheck size={19} />
                  <span>Last updated</span>
                  <strong>
                    {new Date(
                      repair.last_updated
                    ).toLocaleString()}
                  </strong>
                </div>
              </div>

              {repair.description && (
                <div className="customer-extra-section">
                  <span className="customer-eyebrow">
                    REPAIR DETAILS
                  </span>
                  <h3>What's being repaired.</h3>
                  <p>{repair.description}</p>
                </div>
              )}

              {repair.photos?.length > 0 && (
                <div className="customer-extra-section">
                  <span className="customer-eyebrow">
                    FROM THE SHOP
                  </span>
                  <h3>
                    <Camera size={22} />
                    Repair photos.
                  </h3>

                  <div className="customer-photo-grid">
                    {repair.photos.map((photo) => (
                      <CustomerPhoto
                        key={photo.id}
                        photo={photo}
                        token={token}
                      />
                    ))}
                  </div>
                </div>
              )}

              {repair.updates?.length > 0 && (
                <div className="customer-extra-section">
                  <span className="customer-eyebrow">
                    REPAIR JOURNAL
                  </span>
                  <h3>Latest updates.</h3>

                  <div className="customer-updates">
                    {repair.updates.map((update) => (
                      <div
                        className="customer-update"
                        key={update.id}
                      >
                        <small>
                          {new Date(
                            update.created_at
                          ).toLocaleDateString()}
                        </small>
                        <p>{update.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <div className="customer-disclaimer">
              <p>
                Repair timelines are estimates and may change
                as work progresses.
              </p>
              <p>
                Questions about your vehicle? Contact{" "}
                {repair.shop_name} directly.
              </p>
            </div>
          </>
        )}
      </main>

      <footer className="customer-footer">
        <span>POWERED BY MOOVIO</span>
        <span>LESS CALLING. MORE MOOVING.</span>
      </footer>
    </div>
  );
}
