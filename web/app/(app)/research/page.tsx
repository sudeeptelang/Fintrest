/**
 * Research — Today's drop (default sub-tab).
 *
 * Per docs/FINTREST_UX_SPEC.md §06, Research lands on today's drop. The
 * existing dashboard page carries that content; this file re-exports it
 * so the canonical /research URL serves the same view without moving
 * the underlying page. Polish in a dedicated pass post-launch.
 */
export { default } from "../dashboard/page";
