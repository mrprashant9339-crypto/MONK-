import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import OrganizationHub from "./OrganizationHub";

type Props = { onClose: () => void };
type Mode = "login" | "signup" | "forgot" | "reset" | "legal" | "organization";
const TERMS_VERSION = "2026-11-12";
const PRIVACY_VERSION = "2026-11-12";

export default function AuthExperience({ onClose }: Props) {
  const [mode,setMode]=useState<Mode>("login");
  const [first,setFirst]=useState(""); const [last,setLast]=useState("");
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [newPassword,setNewPassword]=useState("");
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState(""); const [acceptedLegal,setAcceptedLegal]=useState(false);

  async function routeAuthenticated() {
    if (!supabase || !isSupabaseConfigured) return;
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user){setMode("login");return;}
    const {data:consent,error:consentError}=await supabase.from("legal_consents").select("id").eq("user_id",user.id).eq("terms_version",TERMS_VERSION).eq("privacy_version",PRIVACY_VERSION).limit(1).maybeSingle();
    if(consentError){setMessage("Unable to verify your legal consent. Please refresh and try again.");return;}
    setMode(consent?"organization":"legal");
  }

  useEffect(()=>{
    if(!supabase)return;
    void supabase.auth.getSession().then(({data})=>{if(data.session)void routeAuthenticated();});
    const {data}=supabase.auth.onAuthStateChange((event,session)=>{
      if(event==="PASSWORD_RECOVERY")setMode("reset");
      else if(session)window.setTimeout(()=>{void routeAuthenticated();},0);
    });
    return()=>data.subscription.unsubscribe();
  },[]);

  async function submit(e:FormEvent) {
    e.preventDefault();
    if(!supabase || !isSupabaseConfigured){setMessage("Authentication is not configured for this deployment. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");return;}
    setBusy(true);setMessage("");
    try {
      if(mode==="signup") {
        if(!first.trim()||!last.trim()){setMessage("Enter your first and last name.");return;}
        if(!acceptedLegal){setMessage("Accept the Terms of Service and Privacy Policy to create an account.");return;}
        if(password.length<10||!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password)){setMessage("Use at least 10 characters with uppercase, lowercase and a number.");return;}
        const {data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:window.location.origin,data:{full_name:first.trim()+" "+last.trim(),accepted_legal:true,terms_version:TERMS_VERSION,privacy_version:PRIVACY_VERSION}}});
        if(error)throw error;
        if(data.session)await routeAuthenticated();else setMessage("Account created. Check your email to verify your address, then return to sign in.");
      } else if(mode==="login") {
        const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
        if(error)throw error;
        await routeAuthenticated();
      } else if(mode==="forgot") {
        const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin});
        if(error)throw error;
        setMessage("If an account exists for this email, a password reset link has been sent.");
      } else if(mode==="reset") {
        if(newPassword.length<10||!/[A-Z]/.test(newPassword)||!/[a-z]/.test(newPassword)||!/[0-9]/.test(newPassword))throw new Error("Use at least 10 characters with uppercase, lowercase and a number.");
        const {error}=await supabase.auth.updateUser({password:newPassword});
        if(error)throw error;
        setMessage("Password updated.");await routeAuthenticated();
      } else if(mode==="legal") {
        if(!acceptedLegal)throw new Error("Accept the Terms of Service and Privacy Policy to continue.");
        const {error}=await supabase.rpc("record_legal_consent",{accepted_terms_version:TERMS_VERSION,accepted_privacy_version:PRIVACY_VERSION});
        if(error)throw error;
        setMode("organization");setMessage("");
      }
    } catch(err) { setMessage(err instanceof Error?err.message:"Authentication request failed."); }
    finally { setBusy(false); }
  }

  async function google() {
    if(!supabase || !isSupabaseConfigured)return;
    if(!acceptedLegal){setMessage("Accept the Terms of Service and Privacy Policy before continuing with Google.");return;}
    setBusy(true);setMessage("");
    const {error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin}});
    if(error){setMessage(error.message);setBusy(false);}
  }
  async function logout(){await supabase?.auth.signOut();setMode("login");setAcceptedLegal(false);setMessage("");}

  return <div className="auth-overlay" role="dialog" aria-modal="true" aria-label="MONK account access"><div className="auth-panel">
    <button className="auth-close" onClick={onClose} aria-label="Close"><X size={19}/></button><a className="wordmark auth-wordmark" href="#">monk<span>.</span></a>
    {mode==="organization"?<OrganizationHub onSignOut={logout}/>:<><div className="auth-kicker">{mode==="signup"?"CREATE YOUR MONK ACCOUNT":mode==="forgot"?"ACCOUNT RECOVERY":mode==="reset"?"PASSWORD RECOVERY":mode==="legal"?"LEGAL CONSENT":"WELCOME BACK"}</div>
      <h2>{mode==="signup"?<>A better way<br/><em>to work together.</em></>:mode==="forgot"||mode==="reset"?<>Reset your<br/><em>password.</em></>:mode==="legal"?<>One last step<br/><em>before your workspace.</em></>:<>Make room for<br/><em>meaningful work.</em></>}</h2>
      <p className="auth-intro">{mode==="signup"?"One account for the organizations you are part of.":mode==="forgot"?"We will email you a secure password reset link.":mode==="reset"?"Choose a new password for your account.":mode==="legal"?"Review and accept the current Terms of Service and Privacy Policy to continue.":"Sign in to continue to your MONK workspace."}</p>
      <form onSubmit={submit}>
        {mode==="signup"&&<div className="auth-name-row"><label>First name<input required autoComplete="given-name" value={first} onChange={e=>setFirst(e.target.value)}/></label><label>Last name<input required autoComplete="family-name" value={last} onChange={e=>setLast(e.target.value)}/></label></div>}
        {(mode==="signup"||mode==="legal"||mode==="login")&&<label className="auth-legal"><input type="checkbox" checked={acceptedLegal} onChange={e=>setAcceptedLegal(e.target.checked)}/> I agree to the <a href="/terms.html" target="_blank" rel="noreferrer">Terms of Service</a> and <a href="/privacy.html" target="_blank" rel="noreferrer">Privacy Policy</a> (v{TERMS_VERSION}).</label>}
        {mode!=="legal"&&<label>Email address<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>}
        {mode==="reset"?<label>New password<input required type="password" autoComplete="new-password" minLength={10} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="At least 10 characters"/></label>:mode!=="forgot"&&mode!=="legal"&&<label>Password<input required type="password" autoComplete={mode==="signup"?"new-password":"current-password"} minLength={mode==="signup"?10:1} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="signup"?"At least 10 characters":"Your password"}/></label>}
        {mode==="login"&&<button type="button" className="forgot-link" onClick={()=>{setMode("forgot");setMessage("");}}>Forgot password?</button>}
        <button className="auth-submit" disabled={busy}>{busy?<LoaderCircle className="spin"/>:mode==="signup"?"Create account":mode==="forgot"?"Send reset link":mode==="reset"?"Update password":mode==="legal"?"Accept and continue":"Sign in"} <ArrowUpRight size={16}/></button>
      </form>
      {mode==="login"&&<><div className="auth-divider"><span/>or continue with<span/></div><button className="google-button" disabled={busy} onClick={()=>void google()}><b>G</b> Continue with Google</button></>}
      {mode!=="forgot"&&mode!=="reset"&&mode!=="legal"&&<p className="auth-switch">{mode==="signup"?"Already have an account?":"New to MONK?"} <button onClick={()=>{setMode(mode==="signup"?"login":"signup");setAcceptedLegal(false);setMessage("");}}>{mode==="signup"?"Sign in":"Create an account"}</button></p>}
      {(mode==="forgot"||mode==="reset"||mode==="legal")&&<button className="auth-back" onClick={()=>mode==="legal"?void logout():setMode("login")}><ArrowLeft size={14}/> {mode==="legal"?"Sign out":"Back to sign in"}</button>}
    </>}
    {message&&<p className="auth-message" role="status">{message}</p>}<div className="auth-secure"><ShieldCheck size={14}/> Protected with Supabase Authentication</div>
  </div></div>;
}
