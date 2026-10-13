import { unstable_rethrow } from "next/navigation";

/**
 * Turns an error thrown by a server action into a message we can show inline,
 * instead of letting it bubble up and crash the page. Next.js redirects are
 * rethrown so they still navigate.
 */
export function actionErrorMessage(e: unknown): string {
  unstable_rethrow(e);
  const msg = e instanceof Error ? e.message : "";
  // After a new deploy, a page loaded before it points at server actions that no longer exist.
  if (/Server Action/i.test(msg)) return "The app was just updated. Refresh the page and try again.";
  return "Couldn't save that. Check your connection and try again.";
}
