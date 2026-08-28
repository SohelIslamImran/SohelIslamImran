import { ownerEmails } from "@/data/folio";

export function isOwnerEmail(email: string | null | undefined) {
  if (!email) return false;
  return ownerEmails.includes(email.toLowerCase() as (typeof ownerEmails)[number]);
}
