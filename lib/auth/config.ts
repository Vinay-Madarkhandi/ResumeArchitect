export const appUrl = () => new URL(process.env.APP_URL ?? "http://localhost:3100");
export const adminEmails = () => (process.env.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
