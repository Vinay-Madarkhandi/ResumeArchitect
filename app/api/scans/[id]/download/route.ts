import { detectAts } from "@/lib/ats";
import { currentUser } from "@/lib/auth/current-user";
import { getScan } from "@/lib/data/scans";
import { formatMatchReport } from "@/lib/report/formatMatchReport";

export async function GET(_request: Request, { params }: RouteContext<"/api/scans/[id]/download">) {
  const user = await currentUser();
  if (!user) return new Response("Sign in to download this report.", { status: 401 });
  const { id } = await params;
  const scan = await getScan(user.id, id);
  if (!scan) return new Response("Scan not found.", { status: 404 });
  return new Response(formatMatchReport(scan, detectAts({ url: scan.jobUrl, text: scan.jobText })), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="match-report.txt"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
