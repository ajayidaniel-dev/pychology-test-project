import { redirect } from "next/navigation"

/** Bookmarks and old nav links pointed here; account settings now live at /account. */
export default function LegacySettingsRedirect() {
  redirect("/account")
}
