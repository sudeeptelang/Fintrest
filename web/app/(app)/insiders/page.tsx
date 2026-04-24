import { redirect } from "next/navigation";

// /insiders as a standalone firehose page is retired in v3. The data
// now lives on the ticker detail (per-ticker insider activity card)
// and as a filter dimension in the screener. Bookmarks land on
// /markets so users aren't dead-ended.
export default function InsidersRedirect() {
  redirect("/markets");
}
