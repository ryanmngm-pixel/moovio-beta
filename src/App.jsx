
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CarFront,
  Check,
  CirclePlus,
  Copy,
  ExternalLink,
  Link2,
  LogOut,
  Plus,
  Trash2,
  Users,
  Wrench,
  X,
} from "lucide-react";

import { supabase } from "./lib/supabase";
import CustomerTracking from "./CustomerTracking";
import Dashboard from "./pages/Dashboard";
import RepairDetails from "./pages/RepairDetails";
import Team from "./pages/Team";
import "./App.css";

const EMPTY_JOB = {
  customer_name: "",
  vehicle_year: "",
  vehicle_make: "",
  vehicle_model: "",
  description: "",
  estimated_completion: "",
};

const OTP_LENGTH = 8;

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
  const [teamSignup, setTeamSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  function switchMode(nextMode, isTeam = false) {
    setMode(nextMode);
    setTeamSignup(isTeam);
    setMessage("");
    setVerificationCode("");
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setMessage("");

    const address = email.trim().toLowerCase();

    try {
      if (mode === "login") {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email: address,
            password,
          });

        if (error) {
          const unconfirmed =
            error.message?.toLowerCase().includes(
              "email not confirmed"
            );

          if (unconfirmed) {
            setVerificationEmail(address);
            setVerificationCode("");
            setMode("verify");
            setMessage(
              "Your email hasn't been verified yet. Enter the code from your email, or request another."
            );
            return;
          }

          throw error;
        }

        if (data.session) {
          onSession(data.session);
        }

        return;
      }

      const { data, error } =
        await supabase.auth.signUp({
          email: address,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

      if (error) throw error;

      if (data.session) {
        onSession(data.session);
        return;
      }

      setVerificationEmail(address);
      setVerificationCode("");
      setMode("verify");
      setMessage("");
    } catch (error) {
      setMessage(
        error.message || "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    if (busy) return;

    const code = verificationCode.trim();

    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code)) {
      setMessage(
        `Enter the ${OTP_LENGTH}-digit code from your email.`
      );
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const { data, error } =
        await supabase.auth.verifyOtp({
          email: verificationEmail,
          token: code,
          type: "signup",
        });

      if (error) throw error;

      if (data.session) {
        onSession(data.session);
      } else {
        setMode("login");
        setMessage(
          "Email verified! Sign in to continue."
        );
      }
    } catch (error) {
      setMessage(
        error.message || "Verification failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    if (!verificationEmail || busy) return;

    setBusy(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: verificationEmail,
      });

      if (error) throw error;

      setVerificationCode("");
      setMessage(
        "A new verification code has been sent. Check your inbox."
      );
    } catch (error) {
      setMessage(
        error.message || "Could not resend the code."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-showcase">
        <Brand />

        <div className="auth-headline">
          <span className="eyebrow">
            THE SHOP, IN MOTION.
          </span>

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
            {mode === "verify"
              ? "Verify your email."
              : mode === "login"
              ? "Welcome back."
              : teamSignup
              ? "Join your team."
              : "Let's get moving."}
          </h2>

          <p className="subtle">
            {mode === "verify"
              ? `Enter the ${OTP_LENGTH}-digit verification code sent to your email.`
              : mode === "login"
              ? "Sign in to your shop workspace."
              : teamSignup
              ? "Use the email your shop invited."
              : "Create your account to start managing repairs."}
          </p>

          {mode === "verify" ? (
            <>
              <div
                style={{
                  marginTop: 28,
                  marginBottom: 24,
                  padding: "16px 18px",
                  border: "1px solid rgba(29,146,232,.3)",
                  borderRadius: 12,
                  background: "rgba(29,146,232,.07)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    color: "#1D92E8",
                    marginBottom: 8,
                  }}
                >
                  VERIFICATION CODE SENT
                </div>

                <div
                  style={{
                    fontSize: 14,
                    overflowWrap: "anywhere",
                  }}
                >
                  {verificationEmail}
                </div>
              </div>

              <form
                className="form-stack"
                onSubmit={verifyCode}
              >
                <label>
                  Verification code

                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={OTP_LENGTH}
                    pattern="[0-9]{8}"
                    placeholder="00000000"
                    value={verificationCode}
                    onChange={(event) =>
                      setVerificationCode(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, OTP_LENGTH)
                      )
                    }
                    style={{
                      textAlign: "center",
                      fontSize: 25,
                      fontWeight: 700,
                      letterSpacing: 5,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  />
                </label>

                {message && (
                  <div
                    className="form-message"
                    role="status"
                  >
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    busy ||
                    verificationCode.length !== OTP_LENGTH
                  }
                >
                  {busy
                    ? "Verifying..."
                    : "Verify email"}

                  <ArrowRight size={18} />
                </button>
              </form>

              <div
                className="auth-account-links"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14,
                  marginTop: 22,
                }}
              >
                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  onClick={resendCode}
                >
                  Didn't get the code? Resend it
                </button>

                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  onClick={() => switchMode("login")}
                >
                  Back to sign in
                </button>
              </div>
            </>
          ) : (
            <>
              <form
                className="form-stack"
                onSubmit={submit}
              >
                <label>
                  Email address

                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@yourshop.com"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
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
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                  />
                </label>

                {message && (
                  <div
                    className="form-message"
                    role="status"
                  >
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  className="primary-button"
                  disabled={busy}
                >
                  {busy
                    ? "Please wait..."
                    : mode === "login"
                    ? "Sign in"
                    : "Create account"}

                  <ArrowRight size={18} />
                </button>
              </form>

              <div
                className="auth-account-links"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14,
                  width: "100%",
                  marginTop: 22,
                }}
              >
                <button
                  type="button"
                  className="text-button"
                  style={{
                    display: "block",
                    width: "fit-content",
                    margin: 0,
                    padding: "4px 0",
                    textAlign: "center",
                    lineHeight: 1.5,
                  }}
                  onClick={() =>
                    switchMode(
                      mode === "login" ? "signup" : "login"
                    )
                  }
                >
                  {mode === "login"
                    ? "New to Moovio? Create an account"
                    : "Already have an account? Sign in"}
                </button>

                {!(teamSignup && mode === "signup") && (
                  <button
                    type="button"
                    className="text-button team-signup-link"
                    style={{
                      display: "block",
                      width: "fit-content",
                      margin: 0,
                      padding: "4px 0",
                      textAlign: "center",
                      lineHeight: 1.5,
                    }}
                    onClick={() =>
                      switchMode("signup", true)
                    }
                  >
                    Are you a team member?
                  </button>
                )}
              </div>

              {teamSignup && mode === "signup" && (
                <p
                  className="team-auth-hint"
                  style={{
                    marginTop: 18,
                    textAlign: "center",
                    lineHeight: 1.7,
                  }}
                >
                  Use the email your shop added.
                  Verify it before joining.
                </p>
              )}
            </>
          )}
        </div>

        <span className="auth-footnote">
          MOOVIO © {new Date().getFullYear()} —
          MADE TO MOVE.
        </span>
      </div>
    </div>
  );
}

function Onboarding({
  onCreated,
  onSignOut,
  invitationError,
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const { error } = await supabase.rpc(
        "create_shop",
        { shop_name: name.trim() }
      );

      if (error) throw error;

      await onCreated();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="onboarding-page">
      <Brand />

      <div className="onboarding-card">
        <span className="eyebrow">
          01 / YOUR WORKSPACE
        </span>

        <h1>
          EVERY GREAT
          <br />
          SHOP STARTS
          <br />
          <em>SOMEWHERE.</em>
        </h1>

        <p>
          First things first.
          What do you call your shop?
        </p>

        {invitationError && (
          <div className="form-message" role="alert">
            Team invitation: {invitationError}
          </div>
        )}

        <form
          onSubmit={submit}
          className="form-stack"
        >
          <label>
            Shop name

            <input
              required
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="e.g. Precision Auto Body"
            />
          </label>

          {error && (
            <div className="form-message" role="alert">
              {error}
            </div>
          )}

          <button
            className="primary-button"
            disabled={busy}
          >
            {busy
              ? "Creating..."
              : "Create my shop"}

            <ArrowRight size={18} />
          </button>
        </form>

        <button
          type="button"
          className="text-button"
          onClick={onSignOut}
        >
          Sign out
        </button>
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

  function change(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
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
          description:
            form.description.trim() || null,
          estimated_completion:
            form.estimated_completion || null,
        })
        .select()
        .single();

      if (error) throw error;

      onCreated(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
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
            <span className="eyebrow">
              NEW REPAIR / 001
            </span>

            <h2 id="new-job-title">
              Add a vehicle.
            </h2>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={21} />
          </button>
        </div>

        <form
          onSubmit={submit}
          className="form-stack"
        >
          <label>
            Customer name

            <input
              required
              maxLength={120}
              placeholder="Customer's full name"
              value={form.customer_name}
              onChange={(event) =>
                change(
                  "customer_name",
                  event.target.value
                )
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
                onChange={(event) =>
                  change(
                    "vehicle_year",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Make

              <input
                required
                placeholder="Honda"
                value={form.vehicle_make}
                onChange={(event) =>
                  change(
                    "vehicle_make",
                    event.target.value
                  )
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
              onChange={(event) =>
                change(
                  "vehicle_model",
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Repair description

            <textarea
              rows={4}
              placeholder="Describe the damage and repairs..."
              value={form.description}
              onChange={(event) =>
                change(
                  "description",
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Estimated completion

            <input
              type="date"
              value={form.estimated_completion}
              onChange={(event) =>
                change(
                  "estimated_completion",
                  event.target.value
                )
              }
            />
          </label>

          {error && (
            <div className="form-message" role="alert">
              {error}
            </div>
          )}

          <button
            className="primary-button"
            disabled={busy}
          >
            {busy
              ? "Saving..."
              : "Create repair job"}

            <CirclePlus size={19} />
          </button>
        </form>
      </div>
    </div>
  );
}

function TrackingLinkModal({ job, onClose }) {
  const [links, setLinks] = useState([]);
  const [newUrl, setNewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadLinks() {
    const { data, error } = await supabase
      .from("repair_tracking_links")
      .select(
        "id, created_at, revoked_at, expires_at"
      )
      .eq("job_id", job.id)
      .eq("shop_id", job.shop_id)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      setError(error.message);
    } else {
      setLinks(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    let active = true;

    async function initialLoad() {
      const { data, error } = await supabase
        .from("repair_tracking_links")
        .select(
          "id, created_at, revoked_at, expires_at"
        )
        .eq("job_id", job.id)
        .eq("shop_id", job.shop_id)
        .order("created_at", {
          ascending: false,
        });

      if (!active) return;

      if (error) {
        setError(error.message);
      } else {
        setLinks(data ?? []);
      }

      setLoading(false);
    }

    initialLoad();

    return () => {
      active = false;
    };
  }, [job.id, job.shop_id]);

  async function createLink() {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { data: token, error } =
        await supabase.rpc(
          "create_tracking_link",
          { target_job: job.id }
        );

      if (error) throw error;

      const url =
        `${window.location.origin}/track/${token}`;

      setNewUrl(url);
      await loadLinks();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(newUrl);
      setNotice("Tracking link copied.");
    } catch {
      setNotice(
        "Select the link to copy it manually."
      );
    }
  }

  async function revokeLink(linkId) {
    if (
      !window.confirm(
        "Revoke this tracking link?"
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { error } = await supabase.rpc(
        "revoke_tracking_link",
        { target_link: linkId }
      );

      if (error) throw error;

      setNewUrl("");
      setNotice("Tracking link revoked.");
      await loadLinks();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  const activeCount = links.filter(
    (link) =>
      !link.revoked_at &&
      (!link.expires_at ||
        new Date(link.expires_at).getTime() >
          Date.now())
  ).length;

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
            <span className="eyebrow">
              CUSTOMER ACCESS
            </span>

            <h2 id="tracking-title">
              Tracking links.
            </h2>
          </div>

          <button
            type="button"
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
          Create a private link for your customer
          to follow their vehicle's repair progress
          without signing in.
        </p>

        <button
          type="button"
          className="primary-button tracking-create-button"
          onClick={createLink}
          disabled={busy}
        >
          <Plus size={18} />

          {busy
            ? "Working..."
            : "Create new tracking link"}
        </button>

        {newUrl && (
          <div className="generated-link">
            <div className="generated-link-heading">
              <Check size={17} />
              LINK CREATED
            </div>

            <p>
              Copy this link now. For security,
              Moovio cannot recover it later.
            </p>

            <input
              readOnly
              value={newUrl}
              aria-label="New tracking link"
              onFocus={(event) =>
                event.target.select()
              }
            />

            <div className="generated-actions">
              <button
                type="button"
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
            <span>{activeCount} active</span>
          </div>

          {loading ? (
            <div className="tracking-empty">
              Loading links...
            </div>
          ) : links.length === 0 ? (
            <div className="tracking-empty">
              No tracking links created yet.
            </div>
          ) : (
            <div className="tracking-links-list">
              {links.map((link) => {
                const expired =
                  link.expires_at &&
                  new Date(
                    link.expires_at
                  ).getTime() <= Date.now();

                const inactive = Boolean(
                  link.revoked_at || expired
                );

                return (
                  <div
                    className="tracking-link-row"
                    key={link.id}
                  >
                    <div className="tracking-link-icon">
                      <Link2 size={17} />
                    </div>

                    <div className="tracking-link-info">
                      <strong>
                        {inactive
                          ? "Inactive link"
                          : "Active link"}
                      </strong>

                      <small>
                        Created{" "}
                        {new Date(
                          link.created_at
                        ).toLocaleDateString()}
                      </small>
                    </div>

                    <span
                      className={
                        inactive
                          ? "tracking-status inactive"
                          : "tracking-status"
                      }
                    >
                      {link.revoked_at
                        ? "Revoked"
                        : expired
                        ? "Expired"
                        : "Active"}
                    </span>

                    {!inactive && (
                      <button
                        type="button"
                        className="tracking-revoke-button"
                        onClick={() =>
                          revokeLink(link.id)
                        }
                        disabled={busy}
                        aria-label="Revoke tracking link"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Workspace({
  session,
  shop,
  onSignOut,
}) {
  const [page, setPage] = useState("overview");
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] =
    useState(true);
  const [selectedJobId, setSelectedJobId] =
    useState(null);
  const [showNewJob, setShowNewJob] =
    useState(false);
  const [trackingJob, setTrackingJob] =
    useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadJobs() {
      setLoadingJobs(true);
      setError("");

      const { data, error } = await supabase
        .from("repair_jobs")
        .select("*")
        .eq("shop_id", shop.id)
        .order("created_at", {
          ascending: false,
        });

      if (!active) return;

      if (error) {
        setError(error.message);
      } else {
        setJobs(data ?? []);
      }

      setLoadingJobs(false);
    }

    loadJobs();

    return () => {
      active = false;
    };
  }, [shop.id]);

  const selectedJob = jobs.find(
    (job) => job.id === selectedJobId
  );

  function openRepair(job) {
    setSelectedJobId(job.id);
    setPage("repair");
  }

  function updateJob(updatedJob) {
    setJobs((previous) =>
      previous.map((job) =>
        job.id === updatedJob.id
          ? updatedJob
          : job
      )
    );
  }

  function createJob(job) {
    setJobs((previous) => [
      job,
      ...previous,
    ]);

    setShowNewJob(false);
    openRepair(job);
  }

  function navigate(nextPage) {
    setSelectedJobId(null);
    setPage(nextPage);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />

        <div className="sidebar-group">
          <span className="sidebar-caption">
            WORKSPACE
          </span>

          <button
            type="button"
            className={`sidebar-link ${
              page === "overview" ||
              page === "repair"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigate("overview")
            }
          >
            <Wrench size={18} />
            Overview
          </button>

          <button
            type="button"
            className={`sidebar-link ${
              page === "team"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigate("team")
            }
          >
            <Users size={18} />
            Team
          </button>
        </div>

        <div className="sidebar-bottom">
          <div className="shop-identity">
            <div className="shop-avatar">
              {shop.name
                ?.charAt(0)
                ?.toUpperCase() || "M"}
            </div>

            <div>
              <strong>{shop.name}</strong>
              <small>SHOP WORKSPACE</small>
            </div>
          </div>

          <button
            type="button"
            className="logout"
            onClick={onSignOut}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="workspace-header">
          <div className="workspace-breadcrumb">
            MOOVIO
            <span>/</span>

            {page === "overview"
              ? "OVERVIEW"
              : page === "team"
              ? "TEAM"
              : "REPAIR DETAILS"}
          </div>

          <div className="user-pill">
            <span className="online-dot" />
            {session.user.email}
          </div>
        </header>

        {error && (
          <div className="form-message" role="alert">
            {error}
          </div>
        )}

        {page === "overview" && (
          <Dashboard
            shop={shop}
            jobs={jobs}
            setJobs={setJobs}
            loading={loadingJobs}
            onNewJob={() =>
              setShowNewJob(true)
            }
            onOpenRepair={openRepair}
            onTracking={setTrackingJob}
          />
        )}

        {page === "repair" && selectedJob && (
          <RepairDetails
            job={selectedJob}
            shop={shop}
            user={session.user}
            onBack={() =>
              navigate("overview")
            }
            onUpdated={updateJob}
          />
        )}

        {page === "team" && (
          <Team
            shop={shop}
            user={session.user}
          />
        )}
      </div>

      {showNewJob && (
        <NewJobModal
          shopId={shop.id}
          userId={session.user.id}
          onClose={() =>
            setShowNewJob(false)
          }
          onCreated={createJob}
        />
      )}

      {trackingJob && (
        <TrackingLinkModal
          job={trackingJob}
          onClose={() =>
            setTrackingJob(null)
          }
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
  const [invitationError, setInvitationError] =
    useState("");

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;

        if (error) {
          setError(error.message);
        }

        setSession(data.session);
        setChecking(false);
      })
      .catch((error) => {
        if (!active) return;
        setError(error.message);
        setChecking(false);
      });

    const { data: listener } =
      supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          if (active) {
            setSession(nextSession);
          }
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
    setInvitationError("");

    if (!session) {
      setChecking(false);
      return;
    }

    setChecking(true);

    async function loadShop() {
      try {
        if (session.user.email_confirmed_at) {
          const { error: claimError } =
            await supabase.rpc(
              "claim_team_invitations"
            );

          if (claimError && active) {
            setInvitationError(
              claimError.message
            );
          }
        }

        const {
          data: memberships,
          error: memberError,
        } = await supabase
          .from("shop_members")
          .select("shop_id")
          .eq("user_id", session.user.id)
          .limit(1);

        if (!active) return;

        if (memberError) {
          setError(memberError.message);
          return;
        }

        if (!memberships?.length) {
          setShop(null);
          return;
        }

        const {
          data: shopData,
          error: shopError,
        } = await supabase
          .from("shops")
          .select("id, name")
          .eq("id", memberships[0].shop_id)
          .single();

        if (!active) return;

        if (shopError) {
          setError(shopError.message);
        } else {
          setShop(shopData);
        }
      } catch (error) {
        if (active) {
          setError(
            error.message || "Unable to load shop."
          );
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }

    loadShop();

    return () => {
      active = false;
    };
  }, [
    session?.user?.id,
    session?.user?.email_confirmed_at,
  ]);

  async function reloadShop() {
    setChecking(true);
    setError("");

    try {
      const {
        data: memberships,
        error: memberError,
      } = await supabase
        .from("shop_members")
        .select("shop_id")
        .eq("user_id", session.user.id)
        .limit(1);

      if (memberError) throw memberError;

      if (!memberships?.length) {
        setShop(null);
        return;
      }

      const { data, error } =
        await supabase
          .from("shops")
          .select("id, name")
          .eq("id", memberships[0].shop_id)
          .single();

      if (error) throw error;

      setShop(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setChecking(false);
    }
  }

  async function signOut() {
    const { error } =
      await supabase.auth.signOut();

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
          type="button"
          className="outline-button"
          onClick={() =>
            window.location.reload()
          }
        >
          Retry
          <ArrowRight size={16} />
        </button>

        {session && (
          <button
            type="button"
            className="text-button"
            onClick={signOut}
          >
            Sign out
          </button>
        )}
      </div>
    );
  }

  if (!session) {
    return (
      <AuthScreen
        onSession={setSession}
      />
    );
  }

  if (!shop) {
    return (
      <Onboarding
        onCreated={reloadShop}
        onSignOut={signOut}
        invitationError={invitationError}
      />
    );
  }

  return (
    <Workspace
      session={session}
      shop={shop}
      onSignOut={signOut}
    />
  );
}

export default function App() {
  const path = window.location.pathname;

  const trackingMatch = path.match(
    /^\/track\/([0-9a-f]{64})\/?$/
  );

  if (trackingMatch) {
    return (
      <CustomerTracking
        token={trackingMatch[1]}
      />
    );
  }

  if (path.startsWith("/track/")) {
    return (
      <div className="loading-screen">
        <Brand />

        <h2>Tracking link unavailable.</h2>

        <p>
          Check the link you received
          from your repair shop.
        </p>
      </div>
    );
  }

  return <ShopApp />;
}
