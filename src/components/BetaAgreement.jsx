
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import "./BetaAgreement.css";

export default function BetaAgreement({
  shopId,
  shopName,
  onAccepted,
  onSignOut,
}) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [authorizedData, setAuthorizedData] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canContinue =
    acceptedTerms &&
    acceptedPrivacy &&
    authorizedData &&
    !busy;

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canContinue) return;

    setBusy(true);
    setError("");

    try {
      if (!shopId) {
        throw new Error("Shop information is missing.");
      }

      const { error: rpcError } = await supabase.rpc(
        "accept_moovio_beta",
        {
          p_shop_id: shopId,
          p_confirms_customer_authority: true,
        }
      );

      if (rpcError) throw rpcError;

      if (onAccepted) {
        await onAccepted();
      }
    } catch (err) {
      setError(
        err.message ||
          "Unable to save your agreement. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="beta-agreement-page">
      <header className="beta-agreement-header">
        <a className="beta-brand" href="/">
          <span className="beta-brand-icon">
            <span />
          </span>
          <span>
            moovio<span className="beta-brand-dot">.</span>
          </span>
        </a>

        <span className="beta-header-label">
          PRIVATE BETA / 01
        </span>
      </header>

      <section className="beta-agreement-card">
        <div className="beta-agreement-intro">
          <div className="beta-intro-icon">
            <ShieldCheck size={25} />
          </div>

          <span className="beta-eyebrow">
            BEFORE YOU GET STARTED
          </span>

          <h1>
            Let's make it
            <br />
            <span>official.</span>
          </h1>

          <p>
            Welcome to the Moovio private beta
            {shopName ? `, ${shopName}` : ""}.
            Before your shop begins using Moovio, please
            review the agreements below.
          </p>
        </div>

        <div className="beta-agreement-documents">
          <a
            href="/beta-terms"
            target="_blank"
            rel="noopener noreferrer"
            className="beta-document-link"
          >
            <span className="beta-document-icon">
              <FileText size={20} />
            </span>

            <span className="beta-document-copy">
              <strong>Private Beta Terms</strong>
              <small>
                Participation, responsibilities, and
                beta limitations
              </small>
            </span>

            <ArrowRight size={18} />
          </a>

          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="beta-document-link"
          >
            <span className="beta-document-icon">
              <LockKeyhole size={20} />
            </span>

            <span className="beta-document-copy">
              <strong>Privacy Policy</strong>
              <small>
                How Moovio handles shop and customer data
              </small>
            </span>

            <ArrowRight size={18} />
          </a>
        </div>

        <form
          className="beta-agreement-form"
          onSubmit={handleSubmit}
        >
          <div className="beta-agreement-section-title">
            <span>YOUR AGREEMENT</span>
            <span>01 — 03</span>
          </div>

          <label className="beta-check-option">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) =>
                setAcceptedTerms(event.target.checked)
              }
            />

            <span>
              I have read and agree to the{" "}
              <a
                href="/beta-terms"
                target="_blank"
                rel="noopener noreferrer"
              >
                Moovio Private Beta Terms
              </a>
              .
            </span>
          </label>

          <label className="beta-check-option">
            <input
              type="checkbox"
              checked={acceptedPrivacy}
              onChange={(event) =>
                setAcceptedPrivacy(event.target.checked)
              }
            />

            <span>
              I have reviewed the{" "}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Moovio Privacy Policy
              </a>
              .
            </span>
          </label>

          <label className="beta-check-option">
            <input
              type="checkbox"
              checked={authorizedData}
              onChange={(event) =>
                setAuthorizedData(event.target.checked)
              }
            />

            <span>
              I confirm that I am authorized to act on
              behalf of this repair shop and that the shop
              has the necessary authority and permissions
              to provide customer-visible repair
              information to Moovio, including processing
              that information through Moovio AI.
            </span>
          </label>

          {error && (
            <div
              className="beta-agreement-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            className="beta-agreement-submit"
            type="submit"
            disabled={!canContinue}
          >
            {busy ? (
              "Saving agreement..."
            ) : (
              <>
                Accept & continue
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="beta-agreement-security">
          <CheckCircle2 size={17} />
          <span>
            Your acceptance is recorded securely with
            your shop account and the current agreement
            versions.
          </span>
        </div>

        <button
          className="beta-agreement-signout"
          type="button"
          onClick={onSignOut}
          disabled={busy}
        >
          Sign out instead
        </button>
      </section>

      <footer className="beta-agreement-footer">
        <span>MOOVIO © {new Date().getFullYear()}</span>
        <span>BUILT FOR THE BAY.</span>
      </footer>
    </main>
  );
}
