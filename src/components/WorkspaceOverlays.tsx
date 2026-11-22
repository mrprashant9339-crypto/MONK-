import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Activity, Bell, CheckSquare, Command, FolderKanban, Search, ShieldCheck, X, Zap } from "lucide-react";
import "../workspace-overlays.css";

type Project={id:string;name:string;code:string};
type Task={id:string;title:string;status:string;priority:string};
type Mode="command"|"notifications"|null;
export default function WorkspaceOverlays({mode,onClose,onNavigate,projects,tasks,onSelectProject}:{mode:Mode;onClose:()=>void;onNavigate:(section:string)=>void;projects:Project[];tasks:Task[];onSelectProject:(id:string)=>void}) {
  const [query,setQuery]=useState("");const [activeIndex,setActiveIndex]=useState(0);const [digest,setDigest]=useState(true);const [product,setProduct]=useState(true);
  useEffect(()=>{if(mode!=="command"){setQuery("");setActiveIndex(0);}},[mode]);
  useEffect(()=>{try{const p=JSON.parse(localStorage.getItem("monk-notification-preferences-v1")||"{}");setDigest(p.digest!==false);setProduct(p.product!==false);}catch{}},[]);
  function savePrefs(next:{digest:boolean;product:boolean}){setDigest(next.digest);setProduct(next.product);try{localStorage.setItem("monk-notification-preferences-v1",JSON.stringify(next));}catch{}}
  const items=useMemo(()=>[
    ...["Overview","Projects","Tasks","CRM","Sales","Documents","Team","Activity","Analytics","Finance","Marketplace","AI Copilot","Education","Focus","Settings","Calendar"].map(name=>({kind:"section",label:name,detail:"Open workspace section",key:"section-"+name})),
    ...projects.map(p=>({kind:"project",label:p.name,detail:"Project · "+p.code,key:"project-"+p.id,id:p.id})),
    ...tasks.map(t=>({kind:"task",label:t.title,detail:"Task · "+t.priority+" priority · "+t.status.replace("_"," "),key:"task-"+t.id}))
  ].filter(x=>(x.label+" "+x.detail).toLowerCase().includes(query.trim().toLowerCase())).slice(0,12),[projects,tasks,query]);
  if(!mode)return null;
  function handleSearchKey(event:KeyboardEvent<HTMLInputElement>){if(event.key==="ArrowDown"){event.preventDefault();setActiveIndex(index=>Math.min(items.length-1,index+1));}else if(event.key==="ArrowUp"){event.preventDefault();setActiveIndex(index=>Math.max(0,index-1));}else if(event.key==="Enter"&&items[activeIndex]){event.preventDefault();choose(items[activeIndex]);}}
  function choose(item:(typeof items)[number]){if(item.kind==="project"&&"id"in item&&typeof item.id==="string"){onSelectProject(item.id);onNavigate("Projects");}else if(item.kind==="task"){onNavigate("Tasks");}else onNavigate(item.label);onClose();}
  return <div className="wo-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className={mode==="command"?"wo-dialog":"wo-dialog wo-notification-dialog"} role="dialog" aria-modal="true" aria-label={mode==="command"?"Search and command menu":"Notifications and preferences"}>
      <header className="wo-header"><span>{mode==="command"?<Command/>:<Bell/>}{mode==="command"?"Search MONK":"Notifications"}</span><button onClick={onClose} aria-label="Close dialog"><X/></button></header>
      {mode==="command"?<><label className="wo-search"><Search/><input autoFocus value={query} onChange={e=>{setQuery(e.target.value);setActiveIndex(0);}} onKeyDown={handleSearchKey} placeholder="Search pages, projects and tasks…" aria-label="Search pages, projects and tasks"/><kbd>ESC</kbd></label><div className="wo-results" role="listbox" aria-label="Search results">{items.map((item,index)=><button key={item.key} role="option" aria-selected={index===activeIndex} className={index===activeIndex?"is-active":""} onMouseEnter={()=>setActiveIndex(index)} onClick={()=>choose(item)}><span className="wo-result-icon">{item.kind==="project"?<FolderKanban/>:item.kind==="task"?<CheckSquare/>:<Zap/>}</span><span><strong>{item.label}</strong><small>{item.detail}</small></span><kbd>↵</kbd></button>)}{items.length===0&&<p className="wo-empty">No matching pages or work items. Try a different search.</p>}</div><footer className="wo-hints"><span><kbd>Ctrl</kbd> + <kbd>K</kbd> Open search</span><span><kbd>ESC</kbd> Close</span></footer></>:<><div className="wo-empty wo-notice-empty"><span className="wo-empty-icon"><Bell/></span><strong>No new notifications</strong><p>Notifications will appear here when event and notification delivery is connected to your workspace.</p></div><div className="wo-preferences"><div><span><Activity/><strong>Daily digest preference</strong></span><label className="wo-switch"><input type="checkbox" checked={digest} onChange={e=>savePrefs({digest:e.target.checked,product})}/><i/></label></div><div><span><ShieldCheck/><strong>Product updates preference</strong></span><label className="wo-switch"><input type="checkbox" checked={product} onChange={e=>savePrefs({digest,product:e.target.checked})}/><i/></label></div><small>Preferences are stored on this device only. Email/push delivery is not connected.</small></div></>}
    </section>
  </div>;
}
