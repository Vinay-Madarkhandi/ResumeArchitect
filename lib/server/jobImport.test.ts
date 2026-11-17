import { describe, expect, it } from "vitest";
import { extractJob, htmlToText, isPrivateAddress } from "@/lib/server/jobImport";

describe("isPrivateAddress", () => {
  it("blocks internal ranges and allows public ones", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "::1", "fd00::1", "::ffff:127.0.0.1", "0.0.0.0"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
    for (const ip of ["8.8.8.8", "104.16.1.1", "2606:4700::1111"]) expect(isPrivateAddress(ip), ip).toBe(false);
  });
});

describe("extractJob", () => {
  it("prefers JSON-LD JobPosting data", () => {
    const html = `<html><head><title>Careers</title><script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: "Senior Backend Engineer",
      hiringOrganization: { "@type": "Organization", name: "Northwind" },
      description: "&lt;p&gt;Own payments.&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Go&lt;/li&gt;&lt;li&gt;PostgreSQL&lt;/li&gt;&lt;/ul&gt;",
    })}</script></head><body>nav junk</body></html>`;
    const job = extractJob(html);
    expect(job.title).toBe("Senior Backend Engineer");
    expect(job.company).toBe("Northwind");
    expect(job.text).toContain("Own payments.");
    expect(job.text).toContain("- Go");
  });

  it("falls back to readable main text without scripts or styles", () => {
    expect(htmlToText("<main><h1>Role</h1><script>evil()</script><p>Build &amp; ship.</p></main>")).toBe("Role\nBuild & ship.");
  });
});
