// pdf-parse ships no types. We import its library file directly (see services/resume.js).
declare module "pdf-parse/lib/pdf-parse.js" {
  export default function pdf(data: Uint8Array): Promise<{ text: string; numpages: number }>;
}
