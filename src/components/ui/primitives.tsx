import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet"; icon?: ReactNode };
export function Button({variant="primary",icon,children,className="",...props}:ButtonProps) {
  return <button className={`ui-button ui-button-${variant} ${className}`.trim()} {...props}>{children}{icon}</button>;
}
export function Field({label,hint,error,children}:{label:string;hint?:string;error?:string;children:ReactNode}) {
  return <div className="ui-field"><label>{label}{children}</label>{hint&&<small>{hint}</small>}{error&&<small role="alert" className="ui-field-error">{error}</small>}</div>;
}
export function TextInput(props:InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`ui-input ${props.className||""}`.trim()}/>;
}
export function StatusMessage({kind="info",children}:{kind?:"info"|"success"|"warning"|"error";children:ReactNode}) {
  return <div className={`ui-status ui-status-${kind}`} role={kind==="error"?"alert":"status"}>{children}</div>;
}
export function EmptyState({title,description,action}:{title:string;description:string;action?:ReactNode}) {
  return <section className="ui-empty"><h2>{title}</h2><p>{description}</p>{action}</section>;
}
