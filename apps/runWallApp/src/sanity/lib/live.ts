import { defineLive } from "next-sanity/live";
import { client } from "./client";

/**
 * Live Content API. Render <SanityLive /> in the root layout once a Sanity
 * project is configured, then fetch with sanityFetch in server components.
 */
export const { sanityFetch, SanityLive } = defineLive({
  client,
  serverToken: process.env.SANITY_API_READ_TOKEN,
  browserToken: process.env.SANITY_API_READ_TOKEN,
});
