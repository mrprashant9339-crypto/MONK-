import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, ShieldCheck } from "lucide-react";
import "../legal-pages.css";

type Section = { title: string; body: string[] };

const pages: Record<string, { title: string; intro: string; updated: string; sections: Section[] }> = {
  "/privacy": {
    title: "Privacy Policy",
    intro: "This notice explains what information MONK may process when you visit the public website or use a MONK workspace, why it is used, and how to contact us about it.",
    updated: "23 November 2026",
    sections: [
      { title: "1. Who operates MONK", body: ["MONK is an independently developed digital workspace project. For privacy questions, contact admin@monk.monster. The public website does not currently identify a separately incorporated operating company; this page does not claim that one exists."] },
      { title: "2. Information that may be processed", body: ["Account information such as your email address, authentication identifiers and account status. Contact and support request details submitted through the public forms, including your name, email address, request category, subject, message, generated ticket reference and submission timestamp. A local copy of selected support ticket details may be stored in your browser when you use the ticket list. Privacy-request drafts may also be stored locally until cleared. A hashed network identifier is processed for abuse prevention and rate limiting.", "Workspace information that you or your organisation submit, such as organisation details, projects, tasks, team membership, role assignments and activity records.", "For education workspaces, information entered by an institution or its authorised users may include student, guardian, faculty, admission, attendance, timetable, examination and result information, as well as documents uploaded to the institution's private workspace.", "Technical and security information needed to operate the service, such as request metadata, authentication events, error diagnostics and security logs. The website includes a consent-gated Google Analytics 4 integration, but no valid GA4 Measurement ID is configured in this release, so the analytics script is not loaded and GA4 usage events are not currently collected. If a valid ID is configured later, GA4 will load only after a visitor explicitly accepts optional analytics. The consent choice is offered to all visitors, including visitors in the EU, UK and Switzerland. Newsletter email addresses will be processed only if you actively subscribe. When paid checkout is introduced, payment processing will be handled by the selected payment provider; MONK does not intend to store full card numbers, CVV codes or UPI PINs. Do not submit passwords, payment-card details or information that is not needed for the relevant workflow."] },
      { title: "3. Why information is used", body: ["To create and authenticate accounts; provide the workspace and its features; maintain organisation boundaries and role permissions; process invitations; support education and business workflows; protect the service; troubleshoot faults; respond to support requests; and meet applicable legal obligations.", "MONK does not sell personal information or use it for behavioural advertising. Public contact and support forms submit request details to a Supabase Edge Function, which validates every field on the server, applies a hidden honeypot check and a limit of five submissions per network hash per hour, and stores accepted requests in the support database. Hashed network identifiers are used for rate limiting; raw IP addresses are not written into support ticket records. Email notifications are sent through Resend only when the required server-side provider credentials and verified sender address are configured. GA4 is not currently active because no valid Measurement ID is configured; if enabled later, it will load only after explicit optional-analytics consent. Newsletter subscriptions and paid checkout are not currently enabled in the reviewed public release."] },
      { title: "4. Institutions and workspace administrators", body: ["If you join a workspace created by a college, school, business or other organisation, that organisation may determine why certain workspace information is collected and how it is used. Its own privacy notice and instructions may also apply. Contact the organisation for requests about records it controls; MONK can assist with platform-related requests and technical access.", "Workspace owners and administrators should only invite authorised people, assign appropriate roles, and upload information they are permitted to share."] },
      { title: "5. Service providers and disclosures", body: ["MONK uses Supabase for authentication, database services and support-ticket storage. The application is configured to use Cloudflare for website delivery. Resend may be used to send support and invitation emails when the relevant server-side email integration is configured. Google Analytics 4 is integrated as an optional provider but is not active in this release because a valid Measurement ID has not been configured; if activated, it will process usage events only after explicit consent. These providers process information as needed to provide their services under their own terms and safeguards.", "Information may also be disclosed where required by law, to protect users or the service, or as part of a legitimate business transfer. MONK does not sell personal information."] },
      { title: "6. Storage, security and retention", body: ["MONK uses access controls and database policies intended to restrict workspace information to authorised users. No internet service can guarantee absolute security. Keep account credentials confidential and notify us promptly if you suspect unauthorised access.", "Support requests are retained while needed to investigate and respond, maintain a support history, prevent abuse, resolve disputes or meet legal obligations. Expired rate-limit records are removed during subsequent support submissions. Other information is retained for as long as needed to provide the service, maintain workspace history and security, or meet legal obligations. Exact retention periods may depend on the workspace, institution instructions, backup cycles and applicable law. A deletion request may not immediately remove information from protected backups or records that must be retained."] },
      { title: "7. Your choices and requests", body: ["You may contact admin@monk.monster to request access to, correction of, or deletion of information associated with your account, or to raise a privacy concern. Please identify the account and workspace involved, but do not send passwords or identity documents unless we specifically explain a secure process.", "We may need to verify the request and coordinate with the relevant workspace administrator. Some records may need to be retained where required by law or for security, dispute-resolution or legitimate operational purposes."] },
      { title: "8. Children and education records", body: ["MONK may be used by educational institutions whose learners include children. Institutions and authorised administrators are responsible for ensuring that they have the legal authority, notices and parent or guardian permissions required before adding or processing a child's information. Do not create an account for a child or upload a child's personal information unless the institution's authorised process and applicable law permit it.", "We do not ask users to provide children's information on the public marketing pages."] },
      { title: "9. Changes and contact", body: ["This policy may change as MONK features, providers or legal requirements change. The updated date above indicates the latest revision. Material changes will be reflected on this page.", "Privacy contact: admin@monk.monster. MONK is developed in India and this notice is intended to be read with applicable data-protection laws, including India's Digital Personal Data Protection Act, 2023 and rules to the extent they are in force and applicable. This page is not a legal opinion or a representation of completed legal compliance."] }
    ]
  },
  "/terms": {
    title: "Terms of Service",
    intro: "These terms govern access to the MONK public website and workspaces. During account registration, you must actively confirm that you have read and agree to these terms before creating an account. Browsing public pages does not require account registration.",
    updated: "22 November 2026",
    sections: [
      { title: "1. About the service", body: ["MONK is an independently developed platform with Campus and Business workspace experiences. Features may be changed, paused or withdrawn during development. Public previews may contain illustrative data and are not live institutional or business records."] },
      { title: "2. Accounts and eligibility", body: ["Provide accurate account information, protect your sign-in credentials and promptly report suspected account compromise to admin@monk.monster.", "If an organisation invites you, you must use the intended account and follow its access instructions. An account does not itself establish employment, student status, institutional affiliation or authority to access records.", "For users who are minors, account creation and processing must occur only through an institutionally authorised process with any permissions required by applicable law."] },
      { title: "3. Organisation workspaces", body: ["Workspace owners and administrators are responsible for inviting appropriate users, assigning least-privilege roles, maintaining accurate records and ensuring that they have authority to submit the information they upload.", "You must not access another organisation's workspace, attempt to bypass role restrictions, scrape private data, probe systems without permission, or use the service to store unlawful, infringing, harmful or unauthorised material."] },
      { title: "4. Acceptable use", body: ["Do not use MONK to impersonate a person or institution; falsify academic, identity, affiliation or business records; distribute malware; interfere with service availability; or violate privacy, intellectual-property or other applicable laws.", "Do not rely on a public directory preview, sample metric, generated summary or demonstration workflow as official confirmation of an institution, qualification, admission, result, payment or business transaction."] },
      { title: "5. Intellectual property", body: ["MONK's name, branding, software and original site content are protected by applicable intellectual-property laws. You retain rights in information you submit, while allowing MONK to host and process it as needed to operate the workspace and provide requested features. You must have permission to upload third-party content."] },
      { title: "6. Availability and changes", body: ["The service is provided on an evolving basis. We aim to maintain availability and protect stored information, but do not promise uninterrupted access, error-free operation, permanent availability of any feature or a particular recovery time. We may perform maintenance, change features or restrict access where reasonably necessary for security, legal compliance or service integrity."] },
      { title: "7. Third-party services", body: ["Authentication, hosting, email and other integrations may rely on third-party providers. Their services are subject to their own terms and availability. MONK is not responsible for independent third-party websites or services."] },
      { title: "8. Suspension and termination", body: ["Access may be suspended or terminated where these terms are materially breached, an account threatens service security, access is unauthorised, or suspension is required by law. You may request account closure by contacting admin@monk.monster. Workspace administrators may separately manage membership, subject to applicable retention duties."] },
      { title: "9. Disclaimers and liability", body: ["To the extent permitted by law, MONK is provided without warranties that are not expressly required by law. Nothing in these terms excludes liability that cannot legally be excluded, including applicable consumer rights or liability for fraud or wilful misconduct.", "To the extent permitted by law, MONK is not liable for indirect or consequential loss arising from reliance on illustrative previews, user-submitted records, third-party services or temporary service interruption."] },
      { title: "10. Governing law and contact", body: ["These terms are governed by the laws of India, subject to mandatory consumer and other legal protections and the jurisdiction of competent courts. Nothing in this clause removes a right that cannot lawfully be waived.", "Questions about these terms: admin@monk.monster."] }
    ]
  },
  "/cookies": {
    title: "Cookie & Browser Storage Policy",
    intro: "MONK uses essential browser storage for authentication and the cookie-preference record. A consent-gated Google Analytics 4 integration is prepared, but no valid Measurement ID is configured in this release, so no analytics script is loaded. The opt-in banner is shown to all visitors, including visitors in the EU, UK and Switzerland.",
    updated: "23 November 2026",
    sections: [
      { title: "1. Essential storage", body: ["The sign-in experience may use browser storage managed by Supabase to maintain an authenticated session. Essential storage supports account security, sign-in continuity and the operation of a requested workspace feature.", "The public website stores a cookie-preference record in localStorage. The support-ticket list can store a local reference copy on your device, including the ticket reference, subject, category, message, email address and submission date; this local copy is not the authoritative support database. Privacy-request drafts are stored locally until you clear browser storage. A temporary support or signup confirmation context is held in sessionStorage and removed when the thank-you page reads it. Security-disclosure and privacy-request forms prepare an email in your email application; the site does not send those drafts itself. Submitting a support request also uses essential network requests to the MONK support intake service; these are required to deliver the form and are not advertising trackers."] },
      { title: "2. Analytics and advertising", body: ["Google Analytics 4 is not active in this release because a valid Measurement ID has not been configured. If a valid ID is added later, the GA4 script will load only after you accept optional analytics. Rejecting optional analytics prevents the script from loading; withdrawing consent disables further analytics collection. MONK does not use behavioural advertising or cross-site advertising cookies."] },
      { title: "3. Managing storage", body: ["You can clear cookies and site data through your browser settings. Clearing essential authentication storage may sign you out or reset saved preferences. Blocking all storage may prevent sign-in and workspace features from working."] },
      { title: "4. Contact", body: ["Questions about browser storage: admin@monk.monster."] }
    ]
  },
  "/refunds": {
    title: "Refund & Cancellation Policy",
    intro: "The current MONK public release does not offer a paid subscription, accept payment or process purchases. No refund is due for a payment that MONK has not collected.",
    updated: "22 November 2026",
    sections: [
      { title: "1. Current payment status", body: ["Paid plans, checkout and in-product payment collection are planned but are not currently enabled in the reviewed public release. Do not send money to an individual or third party claiming to sell a MONK subscription unless a verified MONK checkout is published on monk.monster."] },
      { title: "2. Future paid services", body: ["If MONK introduces paid plans, the applicable price, billing interval, cancellation method, refund eligibility, taxes and support contact will be displayed before you place an order. The policy in force at the time of purchase will govern that transaction, subject to mandatory law."] },
      { title: "3. Incorrect or unauthorised payment", body: ["If you believe a payment was collected using an authorised MONK checkout, or you see a transaction you did not authorise, contact admin@monk.monster with the transaction reference and date. Never email full card numbers, CVV codes, passwords or one-time passcodes."] }
    ]
  },
  "/disclaimer": {
    title: "Disclaimer",
    intro: "MONK is an independent software project. Public information and product previews should not be mistaken for official institutional, academic, legal, financial or government advice.",
    updated: "22 November 2026",
    sections: [
      { title: "1. Independent project", body: ["MONK is not a government portal, statutory authority, university, examination board, accreditation body or official representative of any college or business unless a specific relationship is separately verified and expressly stated."] },
      { title: "2. Directory and education information", body: ["College names, programme descriptions, directory entries and links may be incomplete, illustrative or out of date. Verify affiliation, approval, admission, fees, examination and result information directly with the relevant institution or official authority before relying on it. A listing is not an endorsement or verification certificate."] },
      { title: "3. Demonstrations and sample data", body: ["Numbers, profiles, schedules, attendance, business examples and workflow previews marked demo, sample or illustrative are not live records and must not be used as evidence of actual activity, customers, students or institutional participation."] },
      { title: "4. No professional advice", body: ["Content on MONK is general product information, not legal, financial, academic or professional advice. Obtain advice from a qualified professional for decisions requiring it."] },
      { title: "5. Contact", body: ["Report an error or ask a question at admin@monk.monster."] }
    ]
  },
  "/security": {
    title: "Security Overview",
    intro: "Security is built into the MONK architecture, but this page is a summary of design measures, not a security certification or independent audit report.",
    updated: "22 November 2026",
    sections: [
      { title: "1. Current design controls", body: ["MONK uses Supabase authentication, PostgreSQL row-level security and organisation-scoped access policies for application data. Sensitive education documents are designed to use a private storage bucket with scoped policies. Browser code is not intended to contain Supabase service-role credentials. Legal acceptance records are written through an authenticated, row-level-security-protected database workflow with server timestamps.", "These controls reduce risk but do not guarantee that every feature, configuration or account is free from vulnerabilities. The Supabase security advisor still reports privileged application RPC functions that require individual review, and leaked-password protection has not yet been enabled. These items remain pre-launch hardening work."] },
      { title: "2. Responsible access", body: ["Use a unique password, keep access credentials private, sign out on shared devices and assign workspace roles carefully. Do not upload information unless you have authority to do so."] },
      { title: "3. Report a security issue", body: ["Email admin@monk.monster with the affected page, a clear description and steps to reproduce. Do not include real student records, passwords, tokens or other sensitive data. Do not exploit, access, modify or delete another user's information while investigating."] },
      { title: "4. Certifications and audits", body: ["MONK does not claim ISO 27001, SOC 2, CERT-In empanelment, government approval or any other third-party security certification on this page. Any future certification claim will identify the issuing body, scope and validity period and will be published only after verification."] }
    ]
  },
  "/accessibility": {
    title: "Accessibility",
    intro: "MONK aims to make its public website and workspace usable across common screen sizes and input methods. A formal accessibility audit has not yet been completed.",
    updated: "22 November 2026",
    sections: [
      { title: "1. Our approach", body: ["We aim to use semantic page structure, readable contrast, keyboard-operable controls, visible focus states, responsive layouts and reduced-motion support where practical. This is an ongoing development goal, not a claim of WCAG certification."] },
      { title: "2. Report a barrier", body: ["If you encounter a barrier, email admin@monk.monster and include the page, device/browser and the task you were trying to complete. Avoid sending sensitive account or student information."] }
    ]
  },
  "/data-rights": {
    title: "Data Rights & Account Requests",
    intro: "Use this page to understand how to submit a request about personal information held in a MONK account or workspace.",
    updated: "22 November 2026",
    sections: [
      { title: "1. Requests you can make", body: ["You may ask about personal information associated with your account, request correction of inaccurate details, request deletion where applicable, withdraw a permission where the relevant feature supports it, or raise a privacy complaint."] },
      { title: "2. How to submit a request", body: ["Email admin@monk.monster from the address associated with your account. Include the workspace name, the type of request and enough detail to locate the relevant record. Do not include passwords, one-time passcodes or full identity documents in an ordinary email."] },
      { title: "3. Institution-managed records", body: ["If your information was entered by a school, college, employer or other workspace owner, we may need to refer the request to that organisation or obtain its instructions. We may verify your identity and authority before acting."] },
      { title: "4. Limits and timing", body: ["Some information may be retained for security, legal compliance, dispute resolution or backup integrity. We will explain where a request cannot be completed in full. Response timing depends on the request, verification, applicable law and whether an institution must be involved."] }
    ]
  }
};

const legalLinks = [
  ["/privacy", "Privacy"], ["/terms", "Terms"], ["/cookies", "Cookies"],
  ["/refunds", "Refunds"], ["/disclaimer", "Disclaimer"], ["/security", "Security"],
  ["/accessibility", "Accessibility"], ["/data-rights", "Data rights"]
];

export function CookieNotice() {
  const [visible, setVisible] = useState(false);
  const [manage, setManage] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const location = useLocation();
  const measurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined;
  const validMeasurementId = Boolean(measurementId && /^G-[A-Z0-9]{10}$/i.test(measurementId) && measurementId !== "G-XXXXXXXXXX");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("monk-cookie-preferences-v1");
      if (!saved) setVisible(true);
      else {
        const parsed = JSON.parse(saved) as { analytics?: boolean };
        setAnalytics(parsed.analytics === true);
        setVisible(false);
      }
    } catch { setVisible(true); }
    const openSettings = () => {
      try {
        const saved = localStorage.getItem("monk-cookie-preferences-v1");
        if (saved) setAnalytics((JSON.parse(saved) as { analytics?: boolean }).analytics === true);
      } catch { setAnalytics(false); }
      setManage(true);
      setVisible(true);
    };
    window.addEventListener("monk:open-cookie-settings", openSettings);
    const syncPreferences = () => {
      try {
        const saved = localStorage.getItem("monk-cookie-preferences-v1");
        setAnalytics(saved ? (JSON.parse(saved) as { analytics?: boolean }).analytics === true : false);
      } catch { setAnalytics(false); }
    };
    window.addEventListener("monk:cookie-preferences-changed", syncPreferences);
    return () => {
      window.removeEventListener("monk:open-cookie-settings", openSettings);
      window.removeEventListener("monk:cookie-preferences-changed", syncPreferences);
    };
  }, []);

  useEffect(() => {
    if (!validMeasurementId || !measurementId) return;
    const gaWindow = window as Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
    if (!analytics) {
      Object.assign(window, { [`ga-disable-${measurementId}`]: true });
      gaWindow.gtag?.("consent", "update", { analytics_storage: "denied" });
      return;
    }
    Object.assign(window, { [`ga-disable-${measurementId}`]: false });
    if (!gaWindow.gtag) {
      gaWindow.dataLayer = gaWindow.dataLayer ?? [];
      gaWindow.gtag = (...args: unknown[]) => { gaWindow.dataLayer?.push(args); };
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      script.dataset.monkGa4 = measurementId;
      document.head.appendChild(script);
      gaWindow.gtag("js", new Date());
      gaWindow.gtag("config", measurementId, { anonymize_ip: true, send_page_view: false });
    }
    gaWindow.gtag("consent", "update", { analytics_storage: "granted" });
    const flushConversion = () => {
      try {
        const preferences = JSON.parse(localStorage.getItem("monk-cookie-preferences-v1") || "{}") as { analytics?: boolean };
        const pending = sessionStorage.getItem("monk:thank-you-conversion");
        if (!preferences.analytics || !pending) return;
        if (pending !== "support" && pending !== "signup") {
          sessionStorage.removeItem("monk:thank-you-conversion");
          return;
        }
        gaWindow.gtag?.("event", pending === "signup" ? "sign_up" : "generate_lead", {
          method: pending === "signup" ? "email" : "support_form"
        });
        sessionStorage.removeItem("monk:thank-you-conversion");
      } catch {}
    };
    window.addEventListener("monk:thank-you-ready", flushConversion);
    flushConversion();
    return () => window.removeEventListener("monk:thank-you-ready", flushConversion);
  }, [analytics, measurementId, validMeasurementId]);

  useEffect(() => {
    if (!analytics || !validMeasurementId) return;
    const gaWindow = window as Window & { gtag?: (...args: unknown[]) => void };
    gaWindow.gtag?.("event", "page_view", { page_path: location.pathname + location.search, page_title: document.title });
  }, [analytics, location.pathname, location.search, validMeasurementId]);

  function saveChoice(allowAnalytics: boolean) {
    const preference = { necessary: true, analytics: allowAnalytics, updatedAt: new Date().toISOString(), version: 2 };
    try { localStorage.setItem("monk-cookie-preferences-v1", JSON.stringify(preference)); } catch {}
    setAnalytics(allowAnalytics);
    setVisible(false);
    setManage(false);
  }
  if (!visible) return null;
  return <aside className="cookie-notice" aria-label="Cookie preferences" role="dialog" aria-modal="false">
    <div className="cookie-copy">
      <strong>Cookie preferences</strong>
      <p>MONK uses essential storage for sign-in and site preferences. {validMeasurementId ? "Optional Google Analytics 4 loads only after you accept analytics." : "Optional analytics are not active in this release because no valid GA4 Measurement ID is configured."} This opt-in choice is shown to all visitors, including visitors in the EU, UK and Switzerland. <Link to="/cookies">Cookie policy</Link>.</p>
      {manage && <div className="cookie-options">
        <label><input type="checkbox" checked disabled /> <span><b>Essential storage</b><small>Required for authentication and basic site operation.</small></span></label>
        <label><input type="checkbox" checked={analytics} onChange={event => setAnalytics(event.target.checked)} /> <span><b>Optional analytics</b><small>{validMeasurementId ? "Google Analytics 4; loads only after explicit consent." : "Preference is saved, but analytics will remain inactive until a valid ID is configured."}</small></span></label>
      </div>}
    </div>
    <div className="cookie-actions">
      {manage ? <>
        <button type="button" className="cookie-secondary" onClick={() => saveChoice(false)}>Reject optional</button>
        <button type="button" onClick={() => saveChoice(analytics)}>Save choices</button>
      </> : <>
        <button type="button" className="cookie-secondary" onClick={() => setManage(true)}>Manage</button>
        <button type="button" className="cookie-secondary" onClick={() => saveChoice(false)}>Reject optional</button>
        <button type="button" onClick={() => saveChoice(true)}>Accept optional</button>
      </>}
    </div>
  </aside>;
}

export default function LegalPage() {
  const { pathname } = useLocation();
  const page = pages[pathname];
  if (!page) return <main className="legal-page"><div className="legal-not-found"><h1>Page not found</h1><Link to="/">Return to MONK</Link></div></main>;
  return <main className="legal-page">
    <div className="legal-top"><Link to="/" className="legal-brand"><span className="legal-mark">M</span> MONK<span>.</span></Link><Link to="/" className="legal-back"><ArrowLeft size={15}/> Back to website</Link></div>
    <header className="legal-heading"><span className="legal-eyebrow"><ShieldCheck size={14}/> MONK TRUST CENTRE</span><h1>{page.title}</h1><p>{page.intro}</p><small>Last updated: {page.updated}</small></header>
    <nav className="legal-nav" aria-label="Trust centre pages">{legalLinks.map(([href, label]) => <Link key={href} to={href} className={pathname === href ? "active" : ""}>{label}</Link>)}</nav>
    <article className="legal-content">{page.sections.map(section => <section key={section.title}><h2>{section.title}</h2>{section.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</section>)}</article>
    <aside className="legal-contact"><div><strong>Need help with a privacy or account request?</strong><p>Contact the MONK support team. Do not send passwords or one-time passcodes.</p></div><a href="mailto:admin@monk.monster">admin@monk.monster <ArrowUpRight size={15}/></a></aside>
    <footer className="legal-footer"><span>© {new Date().getFullYear()} MONK. Independent project in development.</span><Link to="/">monk.monster</Link></footer>
  </main>;
}
