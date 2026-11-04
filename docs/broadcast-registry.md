# Broadcast registry (production)

Ninety can resolve authorized broadcasts without depending on a successful PPV.ST catalogue request.

Configure both environment variables in the **server/Cloudflare deployment**:

- `NINETY_BROADCAST_ALLOWED_HOSTS`: comma-separated exact HTTPS embed hostnames approved for playback (not the catalogue API host unless it serves embeds).
- `NINETY_BROADCAST_REGISTRY_JSON`: JSON object containing an `events` array.

Example (replace the placeholder hostname and URL with a real authorized embed):
```json
{
  "events": [
    {
      "id": "fixture-001",
      "name": "Home Team vs Away Team",
      "category_name": "Football",
      "starts_at": 1793710800,
      "ends_at": 1793718000,
      "substreams": [
        {
          "id": "hd",
          "iframe": "https://approved-embed.example/player/fixture-001",
          "source_tag": "HD",
          "hd": true
        }
      ]
    }
  ]
}
```

The event name must contain both fixture team names, and `starts_at` must be within six hours of kickoff. The existing Match Centre attaches `source: ppv` and the watch page resolves the embed from this registry. A source already known by ID is resolved locally without calling the blocked API. When the registry is empty, the existing provider API fallback remains unchanged.

The registry is **not** an automatic discovery feed. It needs to be updated when authorized embed URLs change. Keep configuration in server secrets/environment, not in public client code. Never include credentials in embed URLs. Configure exact embed hosts rather than wildcard domains.

Deployment checklist: populate both variables; deploy; confirm `/api/matches` attaches a source to a matching fixture; confirm `/api/streams?source=ppv&id=fixture-001` returns the registered source; open the watch page and confirm video and audio manually. The iframe's `onError` does not reliably detect failures inside a cross-origin player.
