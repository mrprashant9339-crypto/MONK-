import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, EyeOff, GraduationCap, BriefcaseBusiness, ShieldCheck, Mail, LockKeyhole, CheckCircle2, LoaderCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import TurnstileWidget from "./TurnstileWidget";
import "./auth-experience.css";

type Vertical = "education" | "business";
type Mode = "login" | "signup" | "forgot" | "reset" | "pending";
type IntendedRole = "student" | "parent" | "teacher" | "hod" | "principal" | "institution" | "owner" | "admin" | "manager" | "sales" | "contributor" | "auditor" | "client" | "vendor" | "staff";

const TERMS_VERSION = "2026-11-22";
const PRIVACY_VERSION = "2026-11-22";

function safeVertical(value: string | null): Vertical {
  return value === "education" ? "education" : "business";
}

export default function AuthExperience() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const vertical = safeVertical(params.get("vertical") ?? new URLSearchParams(window.location.search).get("vertical"));
  const initialMode: Mode = location.pathname === "/forgot-password" ? "forgot"
    : location.pathname === "/reset-password" ? "reset"
    : location.pathname === "/auth/callback" ? "pending"
    : location.pathname === "/signup" || params.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<IntendedRole>(vertical === "education" ? "student" : "owner");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [callbackSession, setCallbackSession] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [institutionQuery, setInstitutionQuery] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [institutionOptions, setInstitutionOptions] = useState<Array<{id:string;canonical_name:string;city:string|null;state_code:string|null;institution_kind:string}>>([]);
  const [institutionLoading, setInstitutionLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (vertical !== "education" || mode !== "signup" || institutionQuery.trim().length < 2) {
      setInstitutionOptions([]);
      setInstitutionLoading(false);
      return;
    }
    let alive = true;
    const timer = window.setTimeout(async () => {
      setInstitutionLoading(true);
      const { data, error: directoryError } = await supabase
        .from("monk_directory_institutions")
        .select("id,canonical_name,city,state_code,institution_kind")
        .eq("published", true)
        .ilike("canonical_name", "%" + institutionQuery.trim().replace(/[%_]/g, "") + "%")
        .order("canonical_name", { ascending: true })
        .limit(20);
      if (!alive) return;
      setInstitutionOptions(directoryError ? [] : (data ?? []) as Array<{id:string;canonical_name:string;city:string|null;state_code:string|null;institution_kind:string}>);
      setInstitutionLoading(false);
    }, 250);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [vertical, mode, institutionQuery]);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive && data.session && location.pathname === "/auth/callback") setCallbackSession(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      if (event === "PASSWORD_RECOVERY") setMode("reset");
      if (session && location.pathname === "/auth/callback") setCallbackSession(true);
    });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, [location.pathname]);

  useEffect(() => {
    if (!supabase || !callbackSession || location.pathname !== "/auth/callback") return;
    let alive = true;
    void (async () => {
      try {
        const raw = sessionStorage.getItem("monk:oauth-consent");
        const { data: currentUserData, error: currentUserError } = await supabase.auth.getUser();
        if (currentUserError) throw currentUserError;
        const currentMetadata = currentUserData.user?.user_metadata ?? {};
        const consent: { terms: string; privacy: string; vertical?: Vertical; role?: IntendedRole; institutionId?: string | null } | null = raw
          ? JSON.parse(raw) as { terms: string; privacy: string; vertical: Vertical; role: IntendedRole; institutionId?: string | null }
          : typeof currentMetadata.terms_version === "string" && typeof currentMetadata.privacy_version === "string"
            ? { terms: currentMetadata.terms_version, privacy: currentMetadata.privacy_version }
            : null;
        if (consent) {
          if (raw && consent.vertical && consent.role) {
            const existingRole = currentMetadata.intended_role;
            const { error: metadataError } = await supabase.auth.updateUser({ data: {
              vertical: consent.vertical,
              intended_role: typeof existingRole === "string" ? existingRole : consent.role,
              institution_id: typeof currentMetadata.institution_id === "string" ? currentMetadata.institution_id : consent.institutionId ?? null,
              terms_version: consent.terms, privacy_version: consent.privacy
            }});
            if (metadataError) throw metadataError;
          }
          const { error: consentError } = await supabase.rpc("record_legal_consent", {
            p_terms_version: consent.terms, p_privacy_version: consent.privacy
          });
          if (consentError) throw consentError;
          if (raw) sessionStorage.removeItem("monk:oauth-consent");
        }
        if (alive) {
          const invite = new URLSearchParams(window.location.search).get("invite");
          const callbackVertical = consent?.vertical ?? (currentMetadata.vertical === "education" ? "education" : "business");
          const destination = invite
            ? "/?vertical=" + callbackVertical + "#invite=" + encodeURIComponent(invite)
            : "/?vertical=" + callbackVertical;
          navigate(destination, { replace: true });
        }
      } catch (caught) {
        if (alive) setError(caught instanceof Error ? caught.message : "Google account setup could not be completed.");
        await supabase.auth.signOut();
      }
    })();
    return () => { alive = false; };
  }, [callbackSession, location.pathname, navigate]);

  const roles = vertical === "education"
    ? [{ value: "student", label: "Student" }, { value: "parent", label: "Parent / Guardian" }, { value: "teacher", label: "Teacher / Faculty" }, { value: "hod", label: "Head of Department (HOD)" }, { value: "principal", label: "Principal" }, { value: "institution", label: "College / Institution administrator" }]
    : [{ value: "owner", label: "Business owner" }, { value: "admin", label: "Administrator" }, { value: "manager", label: "Manager" }, { value: "sales", label: "Sales" }, { value: "contributor", label: "Team contributor (Operations / Accounts / Staff)" }, { value: "auditor", label: "Auditor" }, { value: "client", label: "Client" }, { value: "vendor", label: "Vendor" }];

  function changeMode(next: Mode) {
    setError(""); setMessage(""); setMode(next);
    const path = next === "signup" ? "/signup" : next === "forgot" ? "/forgot-password" : next === "reset" ? "/reset-password" : "/login";
    navigate(path + (next === "login" || next === "signup" ? "?vertical=" + vertical : ""), { replace: true });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) { setError("Authentication is not configured. Please contact MONK support."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const requiresCaptcha = mode === "signup" || mode === "login" || mode === "forgot";
      if (requiresCaptcha && !captchaToken) throw new Error("Complete the security verification before continuing.");
      const currentCaptchaToken = captchaToken;
      if (mode === "forgot") {
        if (!email.trim()) throw new Error("Enter the email address linked to your MONK account.");
        const { error: requestError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: window.location.origin + "/reset-password",
          captchaToken: currentCaptchaToken
        });
        if (requestError) throw requestError;
        setMessage("If an account exists for this address, a password-reset email has been sent. Check your inbox and spam folder.");
        return;
      }
      if (mode === "reset") {
        if (password.length < 12) throw new Error("Use at least 12 characters for your new password.");
        if (password !== confirmPassword) throw new Error("The new passwords do not match.");
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setPassword(""); setConfirmPassword("");
        setMessage("Password updated. Your account is ready to use.");
        window.setTimeout(() => navigate("/login?vertical=" + vertical, { replace: true }), 900);
        return;
      }
      if (mode === "signup") {
        if (fullName.trim().length < 2) throw new Error("Enter your full name.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error("Enter a valid email address.");
        if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
          throw new Error("Use at least 12 characters with uppercase, lowercase and a number.");
        }
        if (password !== confirmPassword) throw new Error("The passwords do not match.");
        if (vertical === "education" && institutionOptions.length > 0 && !institutionId) {
          throw new Error("Select your college or institution to continue.");
        }
        if (!accepted) throw new Error("Accept the Terms of Service and Privacy Policy to create your account.");
        const { data, error: signupError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: (() => { const url = new URL(window.location.origin + "/auth/callback"); url.searchParams.set("vertical", vertical); const invite = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("invite"); if (invite) url.searchParams.set("invite", invite); return url.toString(); })(),
            captchaToken: currentCaptchaToken,
            data: {
              full_name: fullName.trim(),
              phone: phone.trim() || null,
              vertical,
              intended_role: role,
              institution_id: vertical === "education" ? institutionId || null : null,
              terms_version: TERMS_VERSION,
              privacy_version: PRIVACY_VERSION
            }
          }
        });
        if (signupError) throw signupError;
        if (data.session) {
          const { error: consentError } = await supabase.rpc("record_legal_consent", {
            p_terms_version: TERMS_VERSION, p_privacy_version: PRIVACY_VERSION
          });
          if (consentError) {
            await supabase.auth.signOut();
            throw new Error("We could not securely record your legal acceptance. Please try again or contact support.");
          }
          navigate("/", { replace: true });
        } else {
          setMode("pending");
          setMessage("Your account request was received. Verify your email using the secure link we sent before signing in.");
        }
        return;
      }
      if (!email.trim() || !password) throw new Error("Enter your email address and password.");
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password, options: { captchaToken: currentCaptchaToken }
      });
      if (loginError) throw loginError;
      navigate("/", { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed. Please try again.");
    } finally {
      setCaptchaToken("");
      setCaptchaResetKey(value => value + 1);
      setBusy(false);
    }
  }

  async function googleSignIn() {
    if (!supabase) { setError("Authentication is not configured."); return; }
    if (!accepted) { setError("Accept the Terms of Service and Privacy Policy before continuing with Google."); return; }
    setBusy(true); setError("");
    try {
      if (mode === "signup" || mode === "login") {
        try { sessionStorage.setItem("monk:oauth-consent", JSON.stringify({ terms: TERMS_VERSION, privacy: PRIVACY_VERSION, vertical, role, institutionId: institutionId || null })); } catch {}
      }
      const inviteToken = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("invite");
      const callbackUrl = new URL(window.location.origin + "/auth/callback");
      callbackUrl.searchParams.set("vertical", vertical);
      if (inviteToken) callbackUrl.searchParams.set("invite", inviteToken);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: { access_type: "offline", prompt: "select_account" }
        }
      });
      if (oauthError) throw oauthError;
    } catch (caught) {
      setBusy(false);
      setError(caught instanceof Error ? caught.message : "Google sign-in could not be started.");
    }
  }

  async function resendVerification() {
    if (!supabase || !email.trim() || resendCooldown > 0) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: resendError } = await supabase.auth.resend({ type: "signup", email: email.trim().toLowerCase(), options: { emailRedirectTo: (() => { const url = new URL(window.location.origin + "/auth/callback"); url.searchParams.set("vertical", vertical); const invite = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("invite"); if (invite) url.searchParams.set("invite", invite); return url.toString(); })() } });
      if (resendError) throw resendError;
      setMessage("If verification is still pending, a new confirmation email has been sent.");
      setResendCooldown(60);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not resend the verification email.");
    } finally { setBusy(false); }
  }

  const isSignup = mode === "signup";
  const isPasswordMode = mode === "login" || mode === "signup" || mode === "reset";
  const heading = mode === "signup" ? "Create your account."
    : mode === "forgot" ? "Recover your account."
    : mode === "reset" ? "Set a new password."
    : mode === "pending" ? "Check your inbox."
    : "Welcome back.";
  const subtitle = vertical === "education" ? "A secure space for colleges, students and faculty." : "A secure workspace for growing teams.";

  return (
    <main className="authx-page">
      <section className="authx-card" aria-labelledby="authx-heading">
        <a className="authx-brand" href="/" aria-label="MONK home"><img src="/brand/monk-icon.svg" alt="" /> MONK<span>.</span></a>
        <div className="authx-context">
          <span className="authx-context-icon">{vertical === "education" ? <GraduationCap size={18}/> : <BriefcaseBusiness size={18}/>}</span>
          <div><strong>{vertical === "education" ? "MONK Campus" : "MONK Business"}</strong><small>{subtitle}</small></div>
          <a href={vertical === "education" ? "/campus" : "/business"}>Explore</a>
        </div>
        <div className="authx-heading">
          <p className="authx-eyebrow"><ShieldCheck size={14}/> SECURE ACCOUNT ACCESS</p>
          <h1 id="authx-heading">{heading}</h1>
          <p>{mode === "pending" ? "One final step is required to activate your account." : mode === "forgot" ? "We will send a secure, time-limited reset link if the account is registered." : mode === "reset" ? "Choose a unique password that you do not use on other websites." : mode === "signup" ? "Register once, then join the right institution or business workspace." : "Sign in to continue to your organization workspace."}</p>
        </div>

        {mode === "pending" ? (
          <div className="authx-pending"><span><Mail size={24}/></span><h2>Verification email sent</h2><p>{message || "Open the confirmation link sent to your email address. The link returns you to MONK securely."}</p>{error && <p className="authx-alert" role="alert">{error}</p>}
            <label>Email address<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <button className="authx-secondary" type="button" onClick={() => void resendVerification()} disabled={busy || !email.trim() || resendCooldown > 0}>{busy ? "Sending…" : resendCooldown > 0 ? "Resend available in " + resendCooldown + "s" : "Resend verification email"}</button>
            <button className="authx-link" type="button" onClick={() => changeMode("login")}>Return to sign in</button>
          </div>
        ) : (
          <>
            {(mode === "login" || mode === "signup") && <button className="authx-google" type="button" onClick={() => void googleSignIn()} disabled={busy}><span className="authx-google-mark">G</span> Continue with Google <ArrowRight size={16}/></button>}
            {mode === "login" && <label className="authx-consent authx-google-consent"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}/><span>By continuing with Google, I agree to the <a href="/terms" target="_blank" rel="noreferrer">Terms of Service</a> and acknowledge the <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</span></label>}
            {(mode === "login" || mode === "signup") && <div className="authx-divider"><span>or continue with email</span></div>}
            <form className="authx-form" onSubmit={submit}>
              {isSignup && <>
                <label>Full name<input autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} maxLength={100} required placeholder="Your full name"/></label>
                <label>Phone number <span className="authx-optional">Optional</span><input type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={20} placeholder="+91"/></label>
                {vertical === "education" && <label>Find your college or institution
                  <input type="search" value={institutionQuery} onChange={e => { setInstitutionQuery(e.target.value); setInstitutionId(""); }} placeholder="Search by college or university name" autoComplete="off"/>
                  <select value={institutionId} onChange={e => setInstitutionId(e.target.value)} aria-label="Select your college or institution">
                    <option value="">{institutionLoading ? "Searching institutions…" : institutionQuery.trim().length < 2 ? "Enter at least 2 characters to search" : institutionOptions.length ? "Choose your institution" : "No published institution found"}</option>
                    {institutionOptions.map(item => <option key={item.id} value={item.id}>{item.canonical_name}{item.city ? " — " + item.city : ""}{item.state_code ? ", " + item.state_code : ""}</option>)}
                  </select>
                  {institutionQuery.trim().length >= 2 && !institutionLoading && institutionOptions.length === 0 && <span className="authx-optional">This institution is not in the published directory yet. You can still create an account, but access to a campus workspace requires an invitation from its administrator.</span>}
                </label>}
                <fieldset className="authx-role-field"><legend>{vertical === "education" ? "Choose your account type" : "Choose your workspace role"}</legend><div className="authx-role-grid" role="radiogroup" aria-label={vertical === "education" ? "Campus account type" : "Business workspace role"}>{roles.map((item, index) => <button className={"authx-role-option" + (role === item.value ? " is-selected" : "")} key={item.value} type="button" role="radio" aria-checked={role === item.value} onClick={() => setRole(item.value as IntendedRole)}><span className="authx-role-number">{String(index + 1).padStart(2, "0")}</span><span className="authx-role-label">{item.label}</span><span className="authx-role-check"><CheckCircle2 size={15}/></span></button>)}</div></fieldset>
                <p className="authx-hint">{vertical === "education" ? "Student, parent and faculty access is verified against institution records or a valid invitation. Selecting a role here does not grant permissions." : "Workspace permissions are granted by the organization owner or an authorized administrator after verification."}</p>
              </>}
              {mode !== "reset" && <label>Email address<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} placeholder="you@example.com"/></label>}
              {isPasswordMode && <>
                <label>{mode === "reset" ? "New password" : "Password"}<span className="authx-password"><input type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} required minLength={mode === "login" ? 1 : 12} placeholder={mode === "login" ? "Enter your password" : "At least 12 characters"}/><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label>
                {(isSignup || mode === "reset") && <label>Confirm password<span className="authx-password"><input type={showConfirm ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={12} placeholder="Enter password again"/><button type="button" aria-label={showConfirm ? "Hide confirmation" : "Show confirmation"} onClick={() => setShowConfirm(v => !v)}>{showConfirm ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label>}
                {isSignup && <p className="authx-hint"><LockKeyhole size={13}/> Use 12+ characters with uppercase, lowercase and a number. Never share your password or OTP.</p>}
              </>}
              {isSignup && <label className="authx-consent"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} required/><span>I agree to the <a href="/terms" target="_blank" rel="noreferrer">Terms of Service</a> and acknowledge the <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</span></label>}
              {mode === "login" && <button className="authx-link authx-forgot" type="button" onClick={() => changeMode("forgot")}>Forgot password?</button>}
              {mode !== "reset" && <div className="authx-captcha-wrap"><TurnstileWidget resetKey={captchaResetKey} onToken={setCaptchaToken} onError={() => setError("Security verification could not load. Refresh the page and try again.")}/></div>}
              {error && <p className="authx-alert" role="alert">{error}</p>}
              {message && <p className="authx-success" role="status"><CheckCircle2 size={16}/>{message}</p>}
              <button className="authx-submit" type="submit" disabled={busy || (mode !== "reset" && !captchaToken) || (isSignup && !accepted)}>{busy ? <><LoaderCircle className="authx-spin" size={17}/> Please wait…</> : mode === "signup" ? "Create secure account" : mode === "forgot" ? "Send reset link" : mode === "reset" ? "Update password" : "Sign in"} <ArrowRight size={17}/></button>
            </form>
            {(mode === "login" || mode === "signup") && <p className="authx-switch">{mode === "signup" ? "Already registered?" : "New to MONK?"} <button type="button" onClick={() => changeMode(isSignup ? "login" : "signup")}>{isSignup ? "Sign in" : "Create account"}</button></p>}
          </>
        )}
        {mode === "forgot" && <button className="authx-link authx-back" type="button" onClick={() => changeMode("login")}><ArrowLeft size={15}/> Back to sign in</button>}
        {mode === "reset" && <p className="authx-hint authx-reset-hint">Your reset link is single-use and expires according to your Supabase Auth configuration.</p>}
        <footer className="authx-footer"><ShieldCheck size={14}/> Protected by MONK and Supabase Auth <span>·</span><a href="/">Public website</a></footer>
      </section>
      <aside className="authx-aside"><div className="authx-aside-mark">M</div><p className="authx-aside-kicker">ONE PLATFORM. CLEAR PERMISSIONS.</p><h2>{vertical === "education" ? "Learning communities, connected." : "Build your work around what matters."}</h2><p>{vertical === "education" ? "Students, parents, teachers and institution teams get access to the records and workflows their verified role allows." : "Owners, managers and teams collaborate inside an organization-scoped workspace."}</p><div className="authx-assurances"><span><ShieldCheck size={16}/> Verified email and invitations</span><span><LockKeyhole size={16}/> Organization-scoped access</span><span><CheckCircle2 size={16}/> Audit-aware workflows</span></div></aside>
    </main>
  );
}
