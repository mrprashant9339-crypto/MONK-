import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Clock3, ExternalLink, LoaderCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import "../notifications.css";

type NotificationRecord = {
  id: string;
  category: string;
  title: string;
  body: string | null;
  resource_type: string | null;
  resource_id: string | null;
  read_at: string | null;
  created_at: string;
};

type Props = { organizationId: string; userId: string };

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(value).toLocaleDateString();
}

export default function NotificationsCenter({ organizationId, userId }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const unreadCount = useMemo(() => items.filter(item => !item.read_at).length, [items]);

  const loadNotifications = useCallback(async () => {
    if (!supabase || !organizationId || !userId) return;
    setError("");
    const { data, error: queryError } = await supabase
      .from("notifications")
      .select("id,category,title,body,resource_type,resource_id,read_at,created_at")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (queryError) {
      setError("Notifications could not be loaded. Check your connection and access.");
      setLoading(false);
      return;
    }
    setItems((data ?? []) as NotificationRecord[]);
    setLoading(false);
  }, [organizationId, userId]);

  useEffect(() => {
    let active = true;
    void loadNotifications();
    if (!supabase || !organizationId || !userId) return;
    const channel = supabase
      .channel(`notifications:${organizationId}:${userId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`
      }, () => {
        if (active) void loadNotifications();
      })
      .subscribe();
    return () => {
      active = false;
      void supabase?.removeChannel(channel);
    };
  }, [loadNotifications, organizationId, userId]);

  async function markRead(item: NotificationRecord) {
    if (!supabase || item.read_at || busyId) return;
    setBusyId(item.id);
    setError("");
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", item.id)
      .eq("organization_id", organizationId)
      .eq("user_id", userId);
    if (updateError) setError("Could not update this notification. Please retry.");
    else setItems(current => current.map(entry => entry.id === item.id ? { ...entry, read_at: new Date().toISOString() } : entry));
    setBusyId(null);
  }

  async function markAllRead() {
    if (!supabase || !unreadCount || busyId) return;
    setBusyId("all");
    setError("");
    const readAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .is("read_at", null);
    if (updateError) setError("Could not mark notifications as read. Please retry.");
    else setItems(current => current.map(item => item.read_at ? item : { ...item, read_at: readAt }));
    setBusyId(null);
  }

  return (
    <div className="notification-center">
      <button className="icon-btn notification-trigger" type="button" aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"} aria-expanded={open} onClick={() => setOpen(value => !value)}>
        <Bell size={18} />
        {unreadCount > 0 && <span className="notification-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      {open && <section className="notification-popover" aria-label="Notifications">
        <header className="notification-head">
          <div><span className="notification-kicker">WORKSPACE UPDATES</span><h2>Notifications</h2><p>{unreadCount ? `${unreadCount} unread updates` : "You're all caught up"}</p></div>
          <button type="button" className="notification-close" aria-label="Close notifications" onClick={() => setOpen(false)}>×</button>
        </header>
        {unreadCount > 0 && <button type="button" className="notification-mark-all" disabled={busyId !== null} onClick={() => void markAllRead()}><CheckCheck size={14}/> Mark all as read</button>}
        {error && <p className="notification-error" role="alert">{error}</p>}
        <div className="notification-list" aria-live="polite">
          {loading ? <div className="notification-state"><LoaderCircle size={17}/> Loading notifications…</div>
            : items.length === 0 ? <div className="notification-empty"><span><Bell size={20}/></span><b>No notifications yet</b><p>Important workspace updates will appear here.</p></div>
            : items.map(item => <article className={item.read_at ? "notification-item is-read" : "notification-item is-unread"} key={item.id}>
              <span className="notification-dot" aria-hidden="true"/>
              <div className="notification-copy">
                <div className="notification-item-top"><span>{item.category.replace(/[_-]/g, " ")}</span><time dateTime={item.created_at}><Clock3 size={11}/>{relativeTime(item.created_at)}</time></div>
                <h3>{item.title}</h3>
                {item.body && <p>{item.body}</p>}
                <div className="notification-item-actions">
                  {!item.read_at && <button type="button" disabled={busyId !== null} onClick={() => void markRead(item)}>{busyId === item.id ? "Saving…" : "Mark as read"}</button>}
                  {item.resource_type && item.resource_id && <span><ExternalLink size={11}/>{item.resource_type.replace(/[_-]/g, " ")}</span>}
                </div>
              </div>
            </article>)}
        </div>
        <footer className="notification-footer"><span>Only your account's updates are shown.</span><button type="button" onClick={() => void loadNotifications()} disabled={loading}><LoaderCircle size={12}/> Refresh</button></footer>
      </section>}
    </div>
  );
}
