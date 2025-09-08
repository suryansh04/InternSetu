import Vapi from "@vapi-ai/web";

export const vapi = new Vapi({
  apiKey: import.meta.env.VITE_VAPI_API_KEY,
});
