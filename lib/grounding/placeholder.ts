export const VERIFY_CLAIM = "[Verify claim]";
export const hasUnverifiedClaim = (text: string) => /\[Verify claim(?: \d+)?\]/i.test(text);
export const RESOLVE_CLAIMS = "Replace or remove each verification placeholder before sharing or exporting.";
