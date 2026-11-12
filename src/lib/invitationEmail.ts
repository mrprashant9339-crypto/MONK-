import { supabase } from "./supabase";

// The server validates the token against the invitation row before contacting Resend.
export type InvitationDelivery = { sent: boolean; message: string };

export async function sendOrganizationInvitation(
  organizationId: string,
  email: string,
  role: string,
  token: string,
): Promise<InvitationDelivery> {
  if (!supabase) return { sent: false, message: "Email delivery is unavailable; copy and share the secure invitation link." };
  const { data, error } = await supabase.functions.invoke("send-education-invitation", {
    body: { organizationId, email: email.trim().toLowerCase(), role, token },
  });
  if (error || data?.sent !== true) {
    return {
      sent: false,
      message: data?.error || error?.message || "Email delivery is not configured; copy and share the secure invitation link.",
    };
  }
  return { sent: true, message: "Invitation email sent successfully." };
}
