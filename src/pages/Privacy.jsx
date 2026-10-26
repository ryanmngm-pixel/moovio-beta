
import { ArrowLeft, ShieldCheck } from "lucide-react";
import "./LegalPages.css";

export default function Privacy() {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <a className="legal-brand" href="/">
          moovio<span>.</span>
        </a>
        <a className="legal-back" href="/">
          <ArrowLeft size={16} />
          Back to Moovio
        </a>
      </header>

      <article className="legal-card">
        <div className="legal-heading">
          <div className="legal-icon">
            <ShieldCheck size={24} />
          </div>
          <span className="legal-eyebrow">
            MOOVIO / LEGAL
          </span>
          <h1>Privacy Policy<span>.</span></h1>
          <p>Effective October 25, 2026</p>
        </div>

        <section>
          <h2>1. Introduction</h2>
          <p>
            Moovio is a repair management and customer
            communication platform operated by MNGM Group,
            LLC. This Privacy Policy describes how we
            collect, use, disclose, and protect information
            when repair shops, employees, and customers
            interact with Moovio.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <p>
            We may process shop account information,
            employee names and email addresses, vehicle
            details, customer names, repair descriptions,
            repair statuses, estimated completion dates,
            repair updates, uploaded photographs, and
            messages submitted to Moovio AI.
          </p>
          <p>
            We may also collect technical information
            needed to operate and secure the service,
            such as request timestamps and service logs.
          </p>
        </section>

        <section>
          <h2>3. How We Use Information</h2>
          <p>
            We use information to operate shop workspaces,
            manage repair records, display authorized
            customer-facing updates, provide Moovio AI,
            troubleshoot problems, maintain security,
            and improve the beta service.
          </p>
        </section>

        <section>
          <h2>4. Moovio AI</h2>
          <p>
            When a customer uses Moovio AI, their message,
            recent conversation history, and selected
            customer-visible repair information may be
            transmitted to OpenAI to generate a response.
          </p>
          <p>
            Moovio AI is designed to use information made
            available through the customer's authorized
            tracking page. It may produce inaccurate
            responses and should not be treated as an
            independent inspection or guaranteed repair
            assessment.
          </p>
        </section>

        <section>
          <h2>5. Service Providers</h2>
          <p>
            Moovio uses third-party technology providers,
            including Supabase for backend infrastructure
            and OpenAI for AI-generated responses. These
            providers may process information as necessary
            to deliver their respective services.
          </p>
          <p>
            Other providers may be used for hosting,
            authentication, email delivery, and related
            operational services.
          </p>
        </section>

        <section>
          <h2>6. Customer Tracking Links</h2>
          <p>
            Repair shops may provide customers with unique
            tracking links. Anyone who obtains a valid link
            may be able to view the information exposed
            through that link, so recipients should avoid
            sharing it publicly.
          </p>
          <p>
            Moovio uses token-based access controls to
            restrict tracking pages to the associated
            repair record.
          </p>
        </section>

        <section>
          <h2>7. Data Security</h2>
          <p>
            We use technical and organizational safeguards
            intended to protect information, including
            authentication, access controls, and
            restrictions on customer-facing repair data.
            No internet service can guarantee absolute
            security.
          </p>
        </section>

        <section>
          <h2>8. Data Retention and Deletion</h2>
          <p>
            We retain information as needed to operate
            the service, support participating shops,
            address security concerns, and comply with
            applicable legal obligations.
          </p>
          <p>
            Specific retention periods and deletion
            procedures are being finalized for the
            private beta. Participating shops should
            contact Moovio about deletion requests
            until those procedures are published.
          </p>
        </section>

        <section>
          <h2>9. Privacy Requests</h2>
          <p>
            To ask about personal information, request
            corrections or deletion, or raise a privacy
            concern, contact us at{" "}
            <a href="mailto:RyanMNGM@gmail.com">
              RyanMNGM@gmail.com
            </a>.
            Requests may require verification before
            information is disclosed or changed.
          </p>
        </section>

        <section>
          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this policy as Moovio develops.
            Material changes may require participating
            shops to review and accept updated terms
            before continuing to use affected features.
          </p>
        </section>

        <div className="legal-notice">
          This policy is a beta draft and must be reviewed
          and finalized before inviting real customer data
          into Moovio.
        </div>
      </article>

      <footer className="legal-footer">
        <span>© {new Date().getFullYear()} MNGM Group, LLC</span>
        <a href="/beta-terms">Private Beta Terms</a>
      </footer>
    </main>
  );
}
