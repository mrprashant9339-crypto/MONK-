import { Component, StrictMode, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";

class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("MONK interface error", error, info.componentStack);
  }
  render() {
    if (this.state.failed) return (
      <main className="auth-page" role="alert">
        <section className="auth-card">
          <a className="brand" href="/"><img className="brand-mark-image" src="/brand/monk-icon.svg" alt="" /> MONK<span className="brand-dot">.</span></a>
          <p className="eyebrow">UNEXPECTED INTERFACE ERROR</p>
          <h1>This page couldn't be displayed.</h1>
          <p className="muted">MONK encountered an unexpected error. Reload the page or return home. Avoid submitting the same form twice until you confirm its status.</p>
          <button className="primary full" type="button" onClick={() => window.location.reload()}>Reload page</button>
          <a className="text-button full" href="/">Go to MONK home</a>
        </section>
      </main>
    );
    return this.props.children;
  }
}

function NetworkNotice() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);
  if (online) return null;
  return <div role="status" aria-live="polite" style={{position:"fixed",zIndex:9999,left:12,right:12,bottom:12,margin:"auto",maxWidth:620,padding:"12px 15px",border:"1px solid #e7d7b6",borderRadius:12,background:"#fff8e9",color:"#765b2c",boxShadow:"0 8px 30px #0002",font:"600 12px system-ui,sans-serif"}}>You're offline. Some actions may not save. Reconnect before retrying forms or payments.</div>;
}

if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(error => console.warn("MONK offline support unavailable", error));
  }, { once: true });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter><AppErrorBoundary><NetworkNotice /><App /></AppErrorBoundary></BrowserRouter>
  </StrictMode>
);
