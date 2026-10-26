
import { ArrowLeft, FileText } from "lucide-react";
import "./LegalPages.css";

export default function BetaTerms() {
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
            <FileText size={24} />
          </div>
          <span className="legal-eyebrow">
            MOOVIO / BETA 01
          </span>
          <h1>Private Beta Terms<span>.</span></h1>
          <p>Effective October 25, 2026</p>
        </div>

        <section>
          <h2>1. About the Private Beta</h2>
          <p>
            These Private Beta Terms govern participation
            in the Moovio private beta operated by
            MNGM Group, LLC.
          </p>
          <p>
            The beta provides participating automotive
            repair shops with early access to repair
            management, customer tracking, team
            collaboration, and AI-assisted customer
            communication features.
          </p>
        </section>

        <section>
          <h2>2. Beta Participation</h2>
          <p>
            Participation is by invitation or approval.
            Moovio may limit the number of participating
            shops and the features available during the
            testing period.
          </p>
          <p>
            The initial private beta is intended to run
            for 30 days without a subscription charge.
            Continued access after the beta is not
            guaranteed and may be subject to separate
            pricing and terms.
          </p>
        </section>

        <section>
          <h2>3. Shop Responsibilities</h2>
          <p>
            Participating shops are responsible for the
            accuracy of the repair information they enter,
            the accounts they authorize, and the repair
            updates they choose to share with customers.
          </p>
          <p>
            Shops must use Moovio lawfully, protect their
            login credentials, and avoid uploading
            information they are not authorized to process
            or disclose.
          </p>
        </section>

        <section>
          <h2>4. Customer Information and Authorization</h2>
          <p>
            By participating, the shop confirms that it
            has the necessary authority and permissions
            to provide relevant customer and vehicle
            information to Moovio for repair tracking,
            customer communication, and related services.
          </p>
          <p>
            The shop must determine which repair updates
            and photographs are appropriate to share with
            customers and must comply with applicable
            privacy and consumer protection requirements.
          </p>
        </section>

        <section>
          <h2>5. Moovio AI</h2>
          <p>
            Moovio AI is an experimental feature that
            answers customer questions using selected
            customer-visible repair information.
          </p>
          <p>
            AI responses may be inaccurate, incomplete,
            or outdated. They do not replace the shop's
            professional judgment, repair documentation,
            or direct approval procedures.
          </p>
          <p>
            Customer messages and selected repair data
            may be processed by OpenAI to provide this
            feature, as described in the Privacy Policy.
          </p>
        </section>

        <section>
          <h2>6. Service Availability</h2>
          <p>
            Moovio is provided as a testing service.
            Features may change, experience interruptions,
            contain errors, or become temporarily
            unavailable.
          </p>
          <p>
            Participating shops should maintain their
            existing repair records and operational
            processes rather than relying exclusively
            on Moovio during the beta.
          </p>
        </section>

        <section>
          <h2>7. Feedback and Bug Reports</h2>
          <p>
            Participants are encouraged to report
            technical issues, confusing experiences,
            inaccurate AI responses, and suggestions
            for improvement.
          </p>
          <p>
            Moovio may use voluntarily submitted
            feedback to improve the platform, without
            disclosing confidential customer information.
          </p>
        </section>

        <section>
          <h2>8. Ending Participation</h2>
          <p>
            A shop may request to end its participation
            by contacting Moovio. Moovio may also
            suspend or terminate beta access for security
            concerns, misuse, or discontinuation of
            the testing program.
          </p>
          <p>
            Data export, retention, and deletion
            arrangements should be confirmed before
            the shop ends participation.
          </p>
        </section>

        <section>
          <h2>9. Legal Terms</h2>
          <p>
            Appropriate warranty disclaimers, liability
            limitations, governing law, dispute
            procedures, and other applicable contractual
            provisions must be finalized before these
            terms are used as a binding commercial
            agreement.
          </p>
        </section>

        <section>
          <h2>10. Contact</h2>
          <p>
            Questions about participation can be sent
            to{" "}
            <a href="mailto:RyanMNGM@gmail.com">
              RyanMNGM@gmail.com
            </a>{" "}
            or by phone at{" "}
            <a href="tel:+14352782290">
              (435) 278-2290
            </a>.
          </p>
        </section>

        <div className="legal-notice">
          These are draft beta terms, not a finalized
          commercial agreement. Review them before
          onboarding external repair shops.
        </div>
      </article>

      <footer className="legal-footer">
        <span>© {new Date().getFullYear()} MNGM Group, LLC</span>
        <a href="/privacy">Privacy Policy</a>
      </footer>
    </main>
  );
}
