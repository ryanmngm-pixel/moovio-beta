
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CarFront,
  Check,
  ChevronDown,
  CirclePlus,
  Clock3,
  Copy,
  ExternalLink,
  Link2,
  LoaderCircle,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import CustomerTracking from "./CustomerTracking";
import "./App.css";

const STAGES = [
  ["checked_in", "Checked in"],
  ["estimating", "Estimating"],
  ["waiting_parts", "Waiting on parts"],
  ["in_repair", "In repair"],
  ["paint", "Paint"],
  ["quality_check", "Quality check"],
  ["ready", "Ready for pickup"],
  ["delivered", "Delivered"],
];

const EMPTY_JOB = {
  customer_name: "",
  vehicle_year: "",
  vehicle_make: "",
  vehicle_model: "",
  description: "",
  estimated_completion: "",
};

const stageName = (status) =>
  STAGES.find(([key]) => key === status)?.[1] ?? status;

function Brand() {
  return (
    <div className="brand">
      <div className="brand-icon">
        <span className="brand-cut" />
      </div>
      <span>
        moovio<span className="brand-period">.</span>
      </span>
    </div>
  );
}

function AuthScreen({ onSession }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({
            email,
            password,
          })
        : await supabase.auth.signUp({
            email,
            password,
          });

    if (result.error) {
      setMessage(result.error.message);
    } else if (mode === "signup" && !result.data.session) {
      setMessage(
        "Account created! Check your email to confirm your account."
      );
    } else if (result.data.session) {
      onSession(result.data.session);
    }

    setBusy(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-showcase">
        <Brand />

        <div className="auth-headline">
          <span className="eyebrow">THE SHOP, IN MOTION.</span>
          <h1>
            LESS
            <br />
            CALLING.
            <br />
            <em>MORE</em>
            <br />
            MOOVING.
          </h1>
          <p>
            Repair updates without the back-and-forth.
            Built for the people who keep cars moving.
          </p>
        </div>

        <div className="showcase-bottom">
          <span>MOOVIO / BETA 01</span>
          <span>BUILT FOR THE BAY.</span>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-box">
          <div className="auth-label">
            WELCOME TO MOOVIO
            <ArrowUpRight size={17} />
          </div>

          <h2>
            {mode === "login"
              ? "Welcome back."
              : "Let's get moving."}
          </h2>

          <p className="subtle">
            {mode === "login"
              ? "Sign in to your shop workspace."
              : "Create your account to start managing repairs."}
          </p>

          <form onSubmit={submit} className="form-stack">
            <label>
              Email address
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@yourshop.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label>
              Password
              <input
                type="password"
                required
                minLength={6}
                autoComplete={
                  mode === "login"
                    ? "current-password"
                    : "new-password"
                }
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {message && (
              <div className="form-message" role="status">
                {message}
              </div>
            )}

            <button className="primary-button" disabled={busy}>
              {busy
                ? "Please wait..."
                : mode === "login"
                ? "Sign in"
                : "Create account"}
              <ArrowRight size={18} />
            </button>
          </form>

          <button
            className="text-button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setMessage("");
            }}
          >
            {mode === "login"
              ? "New to Moovio? Create an account"
              : "Already have an account? Sign in"}
          </button>
        </div>

        <span className="auth-footnote">
          MOOVIO © {new Date().getFullYear()} — MADE TO MOVE.
        </span>
      </div>
    </div>
  );
}

function Onboarding({ onCreated }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const { error } = await supabase.rpc("create_shop", {
      shop_name: name.trim(),
    });

    if (error) {
      setError(error.message);
    } else {
      await onCreated();
    }

    setBusy(false);
  }

  return (
    <div className="onboarding-page">
      <Brand />

      <div className="onboarding-card">
        <span className="eyebrow">01 / YOUR WORKSPACE</span>

        <h1>
          EVERY GREAT
          <br />
          SHOP STARTS
          <br />
          <em>SOMEWHERE.</em>
        </h1>

        <p>First things first. What do you call your shop?</p>

        <form onSubmit={submit} className="form-stack">
          <label>
            Shop name
            <input
              required
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Precision Auto Body"
            />
          </label>

          {error && <div className="form-message">{error}</div>}

          <button className="primary-button" disabled={busy}>
            {busy ? "Creating..." : "Create my shop"}
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

function NewJobModal({
  shopId,
  userId,
  onClose,
  onCreated,
}) {
  const [form, setForm] = useState(EMPTY_JOB);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function change(key, value) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const { data, error } = await supabase
      .from("repair_jobs")
      .insert({
        shop_id: shopId,
        created_by: userId,
        customer_name: form.customer_name.trim(),
        vehicle_year: form.vehicle_year
          ? Number(form.vehicle_year)
          : null,
        vehicle_make: form.vehicle_make.trim(),
        vehicle_model: form.vehicle_model.trim(),
        description: form.description.trim() || null,
        estimated_completion:
          form.estimated_completion || null,
      })
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else {
      onCreated(data);
    }

    setBusy(false);
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-job-title"
      >
        <div className="modal-top">
          <div>
            <span className="eyebrow">NEW REPAIR / 001</span>
            <h2 id="new-job-title">Add a vehicle.</h2>
          </div>

          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={21} />
          </button>
        </div>

        <form onSubmit={submit} className="form-stack">
          <label>
            Customer name
            <input
              required
              maxLength={120}
              placeholder="Customer's full name"
              value={form.customer_name}
              onChange={(e) =>
                change("customer_name", e.target.value)
              }
            />
          </label>

          <div className="form-grid">
            <label>
              Year
              <input
                type="number"
                min="1900"
                max="2100"
                placeholder="2022"
                value={form.vehicle_year}
                onChange={(e) =>
                  change("vehicle_year", e.target.value)
                }
              />
            </label>

            <label>
              Make
              <input
                required
                placeholder="Honda"
                value={form.vehicle_make}
                onChange={(e) =>
                  change("vehicle_make", e.target.value)
                }
              />
            </label>
          </div>

          <label>
            Model
            <input
              required
              placeholder="Accord"
              value={form.vehicle_model}
              onChange={(e) =>
                change("vehicle_model", e.target.value)
              }
            />
          </label>

          <label>
            Repair details
            <textarea
              rows={3}
              placeholder="Describe the damage or repair..."
              value={form.description}
              onChange={(e) =>
                change("description", e.target.value)
              }
            />
          </label>

          <label>
            Estimated completion
            <input
              type="date"
              value={form.estimated_completion}
              onChange={(e) =>
                change("estimated_completion", e.target.value)
              }
            />
          </label>

          {error && <div className="form-message">{error}</div>}

          <button className="primary-button" disabled={busy}>
            {busy ? "Saving..." : "Create repair job"}
            <CirclePlus size={19} />
          </button>
        </form>
      </div>
    </div>
  );
}

/*
 * TRACKING LINK MANAGER
 *
 * The database stores only hashed tokens.
 * A new raw token is returned once when created.
 * Existing links can be revoked, but their original
 * URLs cannot be recovered from the database.
 */

function TrackingLinkModal({ job, onClose }) {
  const [links, setLinks] = useState([]);
  const [newUrl, setNewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    async function loadLinks() {
      const { data, error } = await supabase
        .from("repair_tracking_links")
        .select("id, created_at, revoked_at, expires_at")
        .eq("job_id", job.id)
        .eq("shop_id", job.shop_id)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (error) setError(error.message);
      else setLinks(data ?? []);

      setLoading(false);
    }

    loadLinks();

    return () => {
      active = false;
    };
  }, [job.id, job.shop_id]);

  async function createLink() {
    setBusy(true);
    setError("");
    setNotice("");

    const { data: token, error } = await supabase.rpc(
      "create_tracking_link",
      { target_job: job.id }
    );

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    const url = `${window.location.origin}/track/${token}`;
    setNewUrl(url);

    const { data: refreshed, error: refreshError } =
      await supabase
        .from("repair_tracking_links")
        .select("id, created_at, revoked_at, expires_at")
        .eq("job_id", job.id)
        .eq("shop_id", job.shop_id)
        .order("created_at", { ascending: false });

    if (refreshError) {
      setError(refreshError.message);
    } else {
      setLinks(refreshed ?? []);
    }

    setBusy(false);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(newUrl);
      setNotice("Tracking link copied to clipboard.");
    } catch {
      setNotice("Select the link above to copy it manually.");
    }
  }

  async function revokeLink(linkId) {
    if (!window.confirm("Revoke this tracking link? It will stop working immediately.")) {
      return;
    }

    setBusy(true);
    setError("");

    const { error } = await supabase.rpc(
      "revoke_tracking_link",
      { target_link: linkId }
    );

    if (error) {
      setError(error.message);
    } else {
      setLinks((previous) =>
        previous.map((link) =>
          link.id === linkId
            ? { ...link, revoked_at: new Date().toISOString() }
            : link
        )
      );

      // The newest URL may correspond to the revoked link.
      // Clear it so we don't encourage sharing a revoked link.
      setNewUrl("");
      setNotice("Tracking link revoked.");
    }

    setBusy(false);
  }

  const activeLinks = links.filter(
    (link) =>
      !link.revoked_at &&
      (!link.expires_at ||
        new Date(link.expires_at).getTime() > Date.now())
  );

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="modal tracking-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tracking-title"
      >
        <div className="modal-top">
          <div>
            <span className="eyebrow">CUSTOMER ACCESS</span>
            <h2 id="tracking-title">Tracking links.</h2>
          </div>

          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={21} />
          </button>
        </div>

        <div className="tracking-vehicle">
          <div className="vehicle-icon">
            <CarFront size={23} />
          </div>

          <div>
            <strong>
              {[
                job.vehicle_year,
                job.vehicle_make,
                job.vehicle_model,
              ]
                .filter(Boolean)
                .join(" ")}
            </strong>
            <small>{job.customer_name}</small>
          </div>
        </div>

        <p className="tracking-explanation">
          Create a private link that lets your customer see
          this vehicle's repair progress without signing in.
          The link does not grant access to your shop dashboard.
        </p>

        <button
          className="primary-button tracking-create-button"
          onClick={createLink}
          disabled={busy}
        >
          <Plus size={18} />
          {busy ? "Working..." : "Create new tracking link"}
        </button>

        {newUrl && (
          <div className="generated-link">
            <div className="generated-link-heading">
              <Check size={17} />
              LINK CREATED
            </div>

            <p>
              Copy this link now. For security, Moovio
              cannot recover it later.
            </p>

            <input
              readOnly
              value={newUrl}
              aria-label="New customer tracking URL"
              onFocus={(e) => e.target.select()}
            />

            <div className="generated-actions">
              <button
                className="primary-button"
                onClick={copyLink}
              >
                <Copy size={17} />
                Copy link
              </button>

              <a
                className="outline-button"
                href={newUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Preview
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        )}

        {error && (
          <div className="form-message" role="alert">
            {error}
          </div>
        )}

        {notice && (
          <div className="form-message" role="status">
            {notice}
          </div>
        )}

        <div className="tracking-links-section">
          <div className="tracking-links-heading">
            <strong>Existing links</strong>
            <span>{activeLinks.length} ACTIVE</span>
          </div>

          {loading ? (
            <p className="tracking-empty">Loading links...</p>
          ) : links.length === 0 ? (
            <p className="tracking-empty">
              No tracking links created yet.
            </p>
          ) : (
            <div className="tracking-links-list">
              {links.map((link) => {
                const expired =
                  link.expires_at &&
                  new Date(link.expires_at).getTime() <= Date.now();

                const inactive = Boolean(link.revoked_at || expired);

                return (
                  <div className="tracking-link-row" key={link.id}>
                    <div className="tracking-link-info">
                      <Link2 size={18} />
                      <div>
                        <strong>
                          {inactive
                            ? link.revoked_at
                              ? "Revoked link"
                              : "Expired link"
                            : "Active customer link"}
                        </strong>
                        <small>
                          Created{" "}
                          {new Date(link.created_at).toLocaleDateString()}
                        </small>
                      </div>
                    </div>

                    {!inactive && (
                      <button
                        className="revoke-button"
                        disabled={busy}
                        onClick={() => revokeLink(link.id)}
                        title="Revoke link"
                        aria-label="Revoke tracking link"
                      >
                        <Trash2 size={17} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="tracking-security-note">
          <ShieldCheck size={16} />
          Anyone with an active link can view the published
          repair overview. Only share it with the intended customer.
        </p>
      </div>
    </div>
  );
}

function Dashboard({ session, shop, onSignOut }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [showNewJob, setShowNewJob] = useState(false);
  const [trackingJob, setTrackingJob] = useState(null);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadJobs() {
      setLoading(true);

      const { data, error } = await supabase
        .from("repair_jobs")
        .select("*")
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (error) {
        setError(error.message);
      } else {
        setJobs(data ?? []);
      }

      setLoading(false);
    }

    loadJobs();

    return () => {
      active = false;
    };
  }, [shop.id]);

  const stats = useMemo(
    () => ({
      total: jobs.length,
      active: jobs.filter(
        (job) =>
          !["ready", "delivered"].includes(job.status)
      ).length,
      ready: jobs.filter(
        (job) => job.status === "ready"
      ).length,
      completed: jobs.filter(
        (job) => job.status === "delivered"
      ).length,
    }),
    [jobs]
  );

  const filtered = useMemo(() => {
    const search = query.toLowerCase();

    return jobs.filter((job) => {
      const text = [
        job.customer_name,
        job.vehicle_year,
        job.vehicle_make,
        job.vehicle_model,
        stageName(job.status),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(search);
    });
  }, [jobs, query]);

  async function changeStatus(job, status) {
    if (status === job.status) return;

    setSavingId(job.id);
    setError("");

    const { data, error } = await supabase
      .from("repair_jobs")
      .update({ status })
      .eq("id", job.id)
      .eq("shop_id", shop.id)
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else {
      setJobs((previous) =>
        previous.map((item) =>
          item.id === job.id ? data : item
        )
      );
    }

    setSavingId(null);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />

        <div className="sidebar-group">
          <span className="sidebar-caption">WORKSPACE</span>

          <div className="sidebar-link active">
            <CarFront size={19} />
            Overview
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="shop-identity">
            <div className="shop-avatar">
              {shop.name.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{shop.name}</strong>
              <small>SHOP WORKSPACE</small>
            </div>
          </div>

          <button className="logout" onClick={onSignOut}>
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="workspace-header">
          <div className="workspace-breadcrumb">
            WORKSPACE <span>/</span> OVERVIEW
          </div>

          <div className="user-pill">
            <span className="online-dot" />
            {session.user.email}
          </div>
        </header>

        <main className="dashboard-main">
          <div className="dashboard-heading">
            <div>
              <span className="eyebrow">
                YOUR SHOP, AT A GLANCE.
              </span>

              <h1>
                Good to see you<span>.</span>
              </h1>

              <p>Here's what's happening at {shop.name}.</p>
            </div>

            <button
              className="primary-button new-job-button"
              onClick={() => setShowNewJob(true)}
            >
              <CirclePlus size={19} />
              New repair
            </button>
          </div>

          <div className="stats-grid">
            {[
              ["Total repairs", stats.total, CarFront],
              ["In progress", stats.active, Wrench],
              ["Ready for pickup", stats.ready, Clock3],
              ["Delivered", stats.completed, Check],
            ].map(([label, value, Icon], index) => (
              <div className="stat-card" key={label}>
                <div className="stat-top">
                  <span>{label}</span>
                  <Icon size={19} />
                </div>

                <strong>{value}</strong>

                <span className="stat-index">
                  0{index + 1} / LIVE
                </span>
              </div>
            ))}
          </div>

          <div className="repairs-section">
            <div className="repairs-heading">
              <div>
                <span className="eyebrow">
                  THE WORK IN MOTION
                </span>

                <h2>
                  Repair jobs <span>({jobs.length})</span>
                </h2>
              </div>

              <div className="search-field">
                <Search size={18} />

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search repairs..."
                  aria-label="Search repairs"
                />
              </div>
            </div>

            {error && (
              <div className="form-message" role="alert">
                {error}
              </div>
            )}

            {loading ? (
              <div className="empty-state">
                <LoaderCircle size={28} />
                <p>Loading your shop's repairs...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <CarFront size={32} />
                </div>

                <h3>
                  {query ? "No matching repairs." : "A clean slate."}
                </h3>

                <p>
                  {query
                    ? "Try a different search."
                    : "Your first repair job is one click away."}
                </p>

                {!query && (
                  <button
                    className="outline-button"
                    onClick={() => setShowNewJob(true)}
                  >
                    Add your first repair
                    <ArrowUpRight size={17} />
                  </button>
                )}
              </div>
            ) : (
              <div className="jobs-list">
                <div className="jobs-list-header">
                  <span>VEHICLE / CUSTOMER</span>
                  <span>CREATED</span>
                  <span>STATUS</span>
                  <span>CUSTOMER ACCESS</span>
                </div>

                {filtered.map((job) => (
                  <div className="job-row" key={job.id}>
                    <div className="job-vehicle">
                      <div className="vehicle-icon">
                        <CarFront size={22} />
                      </div>

                      <div>
                        <strong>
                          {[
                            job.vehicle_year,
                            job.vehicle_make,
                            job.vehicle_model,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        </strong>

                        <small>{job.customer_name}</small>
                      </div>
                    </div>

                    <div className="job-date">
                      {new Date(
                        job.created_at
                      ).toLocaleDateString()}
                    </div>

                    <div className="status-wrap">
                      <select
                        className={`status-select status-${job.status}`}
                        aria-label={`Status for ${job.vehicle_make} ${job.vehicle_model}`}
                        value={job.status}
                        disabled={savingId === job.id}
                        onChange={(e) =>
                          changeStatus(job, e.target.value)
                        }
                      >
                        {STAGES.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>

                      <ChevronDown size={14} />
                    </div>

                    <button
                      className="customer-link-button"
                      onClick={() => setTrackingJob(job)}
                    >
                      <Link2 size={16} />
                      Manage link
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dashboard-foot">
            <ShieldCheck size={16} />
            Your shop data is protected by workspace access rules.
          </div>
        </main>
      </div>

      {showNewJob && (
        <NewJobModal
          shopId={shop.id}
          userId={session.user.id}
          onClose={() => setShowNewJob(false)}
          onCreated={(job) => {
            setJobs((previous) => [job, ...previous]);
            setShowNewJob(false);
          }}
        />
      )}

      {trackingJob && (
        <TrackingLinkModal
          job={trackingJob}
          onClose={() => setTrackingJob(null)}
        />
      )}
    </div>
  );
}

function ShopApp() {
  const [session, setSession] = useState(null);
  const [shop, setShop] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;

      if (error) setError(error.message);
      setSession(data.session);
      setChecking(false);
    });

    const { data: listener } =
      supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          setSession(nextSession);
        }
      );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    setShop(null);
    setError("");

    if (!session) return;

    setChecking(true);

    async function loadShop() {
      const { data, error } = await supabase
        .from("shops")
        .select("id, name")
        .order("created_at", { ascending: true })
        .limit(1);

      if (!active) return;

      if (error) {
        setError(error.message);
      } else {
        setShop(data?.[0] ?? null);
      }

      setChecking(false);
    }

    loadShop();

    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  async function reloadShop() {
    setChecking(true);
    setError("");

    const { data, error } = await supabase
      .from("shops")
      .select("id, name")
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) setError(error.message);
    else setShop(data?.[0] ?? null);

    setChecking(false);
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setError(error.message);
    } else {
      setShop(null);
      setSession(null);
    }
  }

  if (checking) {
    return (
      <div className="loading-screen">
        <Brand />
        <span>GETTING THINGS MOOVING...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-screen">
        <Brand />
        <p role="alert">{error}</p>

        <button
          className="outline-button"
          onClick={() => window.location.reload()}
        >
          Retry <ArrowRight size={16} />
        </button>

        {session && (
          <button className="text-button" onClick={signOut}>
            Sign out
          </button>
        )}
      </div>
    );
  }

  if (!session) {
    return <AuthScreen onSession={setSession} />;
  }

  if (!shop) {
    return <Onboarding onCreated={reloadShop} />;
  }

  return (
    <Dashboard
      session={session}
      shop={shop}
      onSignOut={signOut}
    />
  );
}

/*
 * PUBLIC ROUTING
 *
 * Customer routes render independently of shop authentication.
 * Access to repair data is checked by the Supabase RPC.
 */

export default function App() {
  const path = window.location.pathname;

  const trackingMatch = path.match(
    /^\/track\/([0-9a-f]{64})\/?$/
  );

  if (trackingMatch) {
    return <CustomerTracking token={trackingMatch[1]} />;
  }

  if (path.startsWith("/track/")) {
    return (
      <div className="loading-screen">
        <Brand />
        <h2>Tracking link unavailable.</h2>
        <p>
          Check the link you received from your repair shop.
        </p>
      </div>
    );
  }

  return <ShopApp />;
}
