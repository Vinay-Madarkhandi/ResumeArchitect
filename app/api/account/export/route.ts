import JSZip from "jszip";
import { currentUser } from "@/lib/auth/current-user";
import { exportAccountData } from "@/lib/data/account";

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });

  const zip = new JSZip();
  zip.file("resume-architect.json", JSON.stringify(await exportAccountData(user.id), null, 2));
  const archive = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
  return new Response(archive, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="resume-architect-data.zip"',
      "Cache-Control": "no-store",
    },
  });
}
