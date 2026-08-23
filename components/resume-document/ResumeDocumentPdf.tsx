import { Document, Page, View, Text, Link, StyleSheet } from "@react-pdf/renderer";
import type { ResumeContent } from "@/lib/schemas/resume";
import { pdfColors, pdfFonts, pdfType } from "@/lib/pdf/tokens";
import { registerResumeFonts } from "@/lib/pdf/fonts";

registerResumeFonts();

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: pdfFonts.doc,
    fontSize: pdfType.body,
    color: pdfColors.ink,
    lineHeight: 1.4,
  },
  header: {
    textAlign: "center",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottom: `1pt solid ${pdfColors.hairline}`,
  },
  name: {
    fontFamily: pdfFonts.sans,
    fontSize: pdfType.name,
    fontWeight: 700,
    lineHeight: 1.2,
    marginBottom: 6,
  },
  headline: {
    fontFamily: pdfFonts.sans,
    fontSize: pdfType.headline,
    lineHeight: 1.2,
    color: pdfColors.inkMuted,
    marginBottom: 6,
  },
  contactLine: {
    fontFamily: pdfFonts.mono,
    fontSize: pdfType.meta,
    color: pdfColors.inkMuted,
  },
  section: { marginBottom: 12 },
  sectionHeader: {
    fontFamily: pdfFonts.sans,
    fontSize: pdfType.sectionHeader,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: pdfColors.ink,
    borderBottom: `0.75pt solid ${pdfColors.hairline}`,
    paddingBottom: 3,
    marginBottom: 6,
  },
  entry: { marginBottom: 8 },
  entryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 2,
  },
  entryTitle: {
    fontFamily: pdfFonts.sans,
    fontSize: pdfType.body + 0.5,
    fontWeight: 600,
  },
  entryTitleMuted: {
    fontFamily: pdfFonts.sans,
    fontWeight: 400,
    color: pdfColors.inkMuted,
  },
  entryDates: {
    fontFamily: pdfFonts.mono,
    fontSize: pdfType.meta,
    color: pdfColors.inkMuted,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 2,
    paddingLeft: 4,
  },
  bulletGlyph: { width: 10, fontSize: pdfType.body },
  bulletText: { flex: 1, fontSize: pdfType.body },
  skillLine: { marginBottom: 3, fontSize: pdfType.body },
  skillCategory: { fontFamily: pdfFonts.sans, fontWeight: 600 },
  link: { color: pdfColors.accent, textDecoration: "none" },
});

function ContactLine({ content }: { content: ResumeContent }) {
  const { email, phone, location, links } = content.personalInfo;
  const parts = [location, email, phone, ...links.map((l) => l.url)].filter(Boolean);
  return <Text style={styles.contactLine}>{parts.join("   •   ")}</Text>;
}

function SectionHeader({ children }: { children: string }) {
  return <Text style={styles.sectionHeader}>{children}</Text>;
}

function formatDateRange(startDate?: string | null, endDate?: string | null, isCurrent?: boolean) {
  const start = startDate ?? "";
  const end = isCurrent ? "Present" : (endDate ?? "");
  if (!start && !end) return "";
  return [start, end].filter(Boolean).join(" – ");
}

export function ResumeDocumentPdf({ content }: { content: ResumeContent }) {
  const { personalInfo, summary, experience, projects, education, skills, certifications } = content;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{personalInfo.fullName}</Text>
          {personalInfo.headline && <Text style={styles.headline}>{personalInfo.headline}</Text>}
          <ContactLine content={content} />
        </View>

        {summary && (
          <View style={styles.section}>
            <SectionHeader>Summary</SectionHeader>
            <Text>{summary}</Text>
          </View>
        )}

        {experience.length > 0 && (
          <View style={styles.section}>
            <SectionHeader>Experience</SectionHeader>
            {experience.map((entry) => (
              <View key={entry.id} style={styles.entry} wrap={false}>
                <View style={styles.entryHeaderRow}>
                  <Text style={styles.entryTitle}>
                    {entry.role}
                    {entry.company ? <Text style={styles.entryTitleMuted}> — {entry.company}</Text> : null}
                  </Text>
                  <Text style={styles.entryDates}>{formatDateRange(entry.startDate, entry.endDate, entry.isCurrent)}</Text>
                </View>
                {entry.bullets.map((bullet) => (
                  <View key={bullet.id} style={styles.bulletRow}>
                    <Text style={styles.bulletGlyph}>•</Text>
                    <Text style={styles.bulletText}>{bullet.text}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {projects.length > 0 && (
          <View style={styles.section}>
            <SectionHeader>Projects</SectionHeader>
            {projects.map((entry) => (
              <View key={entry.id} style={styles.entry} wrap={false}>
                <View style={styles.entryHeaderRow}>
                  <Text style={styles.entryTitle}>
                    {entry.url ? <Link src={entry.url} style={styles.link}>{entry.name}</Link> : entry.name}
                  </Text>
                  {entry.technologies.length > 0 && (
                    <Text style={styles.entryDates}>{entry.technologies.join(", ")}</Text>
                  )}
                </View>
                {entry.description && <Text style={{ marginBottom: 2 }}>{entry.description}</Text>}
                {entry.bullets.map((bullet) => (
                  <View key={bullet.id} style={styles.bulletRow}>
                    <Text style={styles.bulletGlyph}>•</Text>
                    <Text style={styles.bulletText}>{bullet.text}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {education.length > 0 && (
          <View style={styles.section}>
            <SectionHeader>Education</SectionHeader>
            {education.map((entry) => (
              <View key={entry.id} style={styles.entry} wrap={false}>
                <View style={styles.entryHeaderRow}>
                  <Text style={styles.entryTitle}>
                    {entry.institution}
                    {entry.degree ? <Text style={styles.entryTitleMuted}> — {entry.degree}</Text> : null}
                  </Text>
                  <Text style={styles.entryDates}>{formatDateRange(entry.startDate, entry.endDate)}</Text>
                </View>
                {(entry.gpa || entry.honors.length > 0) && (
                  <Text style={{ color: pdfColors.inkMuted, fontSize: pdfType.body }}>
                    {[entry.gpa ? `GPA: ${entry.gpa}` : null, ...entry.honors].filter(Boolean).join(" · ")}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {skills.length > 0 && (
          <View style={styles.section}>
            <SectionHeader>Skills</SectionHeader>
            {skills.map((group) => (
              <Text key={group.id} style={styles.skillLine}>
                <Text style={styles.skillCategory}>{group.category}: </Text>
                {group.items.join(", ")}
              </Text>
            ))}
          </View>
        )}

        {certifications.length > 0 && (
          <View style={styles.section} wrap={false}>
            <SectionHeader>Certifications</SectionHeader>
            {certifications.map((cert) => (
              <Text key={cert.id} style={{ marginBottom: 3, fontSize: pdfType.body }}>
                <Text style={{ fontFamily: pdfFonts.sans, fontWeight: 600 }}>{cert.name}</Text>
                {cert.issuer ? ` — ${cert.issuer}` : ""}
                {cert.date ? ` (${cert.date})` : ""}
              </Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
