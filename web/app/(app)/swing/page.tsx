import { redirect } from "next/navigation";

// Swing is now the "Momentum Run" lens inside the unified picks board.
// Legacy /swing bookmarks land pre-filtered to momentum-led setups.
export default function SwingRedirect() {
  redirect("/picks?lens=momentum");
}
