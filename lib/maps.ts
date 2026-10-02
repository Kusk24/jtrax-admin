/** Google's keyless embed — no API key, no billing account, just a search
    query rendered as a map. It is not the officially supported Maps Embed
    API, but it has worked unauthenticated for years and this app has no
    Maps/Places key to spend on a fancier version. */
export function mapEmbedUrl(venue: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(venue)}&output=embed`;
}

/** The link stored with the tournament and handed to registrants — Google's
    own documented "Maps URLs" scheme, so it opens the venue in the Maps app
    on a phone and in the browser on a desktop, both without a key. */
export function mapSearchUrl(venue: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`;
}
