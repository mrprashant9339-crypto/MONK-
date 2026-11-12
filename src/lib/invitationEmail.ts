import { supabase } from "./supabase";

// The server validates the token against the invitation row before contacting Resend.
export type InvitationDelivery = { sent: boolean; message: string };

export async function sendOrganizationInvitation(
  organizationId: string,
  email: string,
  role: string,
  token: string,
): Promise<InvitationDelivery> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!organizationId || !token) return { sent: false, message: "Invitation details are incomplete; copy the secure invitation link." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return { sent: false, message: "The invitation email address is invalid." };
  if (!supabase) return { sent: false, message: "Email delivery is unavailable; copy and share the secure invitation link." };
  const { data, error } = await supabase.functions.invoke("send-education-invitation", {
    body: { organizationId, email: normalizedEmail, role, token },
  });
  if (error || data?.sent !== true) {
    let providerMessage = data?.error as string | undefined;
    const response = (error as { context?: Response } | null)?.context;
    if (!providerMessage && response && typeof response.clone === "function") {
      try {
        const payload = await response.clone().json() as { error?: string };
        providerMessage = payload.error;
      } catch { /* Keep the safe manual-link fallback message. */ }
    }
    return {
      sent: false,
      message: providerMessage || error?.message || "Email delivery is not configured; copy and share the secure invitation link.",
    };
  }
  return { sent: true, message: "Invitation email sent successfully." };
}
