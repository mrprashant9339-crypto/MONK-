import { StrictMode, Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Link } from "react-router-dom";
import App from "./App";
import "./styles.css";
import "./ui-primitives.css";

class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("MONK interface error", error, info.componentStack);
  }
  render() {
    if (this.state.failed) {
      return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#f7f8f5",color:"#202a21",fontFamily:"system-ui,sans-serif"}}>
        <section style={{width:"min(100%,560px)",padding:32,border:"1px solid #e4e9e1",borderRadius:20,background:"#fff"}}>
          <strong style={{letterSpacing:1}}>MONK.</strong><p style={{color:"#71806f",fontSize:11,fontWeight:800,letterSpacing:1.5}}>UNEXPECTED INTERFACE ERROR</p>
          <h1 style={{fontSize:"clamp(30px,6vw,44px)",lineHeight:1.1}}>This page couldn't be displayed.</h1>
          <p style={{color:"#687268",lineHeight:1.7}}>The interface encountered an unexpected error. Reload the page or return to the home page. Avoid submitting the same form twice until you confirm its status.</p>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:22}}><button onClick={()=>window.location.reload()} style={{padding:"12px 16px",border:0,borderRadius:9,background:"#26392b",color:"#fff"}}>Reload page</button><Link to="/" style={{padding:"12px 16px",borderRadius:9,background:"#f0f3ed",color:"#344638",textDecoration:"none"}}>Go home</Link></div>
        </section>
      </main>;
    }
    return this.props.children;
  }
}

function NetworkNotice() {
  const [online,setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online",on);
    window.addEventListener("offline",off);
    return () => { window.removeEventListener("online",on); window.removeEventListener("offline",off); };
  }, []);
  if (online) return null;
  return <div role="status" aria-live="polite" style={{position:"fixed",zIndex:9999,left:12,right:12,bottom:12,margin:"auto",maxWidth:620,padding:"12px 15px",border:"1px solid #e7d7b6",borderRadius:12,background:"#fff8e9",color:"#765b2c",boxShadow:"0 8px 30px #0002",font:"600 12px system-ui,sans-serif"}}>You're offline. Some actions may not save. Reconnect before retrying forms or payments.</div>;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(error => console.warn("MONK offline support unavailable", error));
  }, { once: true });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter><AppErrorBoundary><NetworkNotice /><App /></AppErrorBoundary></BrowserRouter>
  </StrictMode>
);
