#!/usr/bin/env node
// Convert an explicitly configured catalogue into Ninety's validated registry shape.
// This tool never fetches URLs and never synthesizes playback URLs.
import fs from 'node:fs';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw Error('Usage: node normalize-broadcast-catalogue.mjs INPUT OUTPUT');
const source = JSON.parse(fs.readFileSync(input, 'utf8'));
if (!source || typeof source !== 'object' || Array.isArray(source)) throw Error('Catalogue must be a JSON object');
if (source.success === false || source.error) throw Error('Upstream reported a catalogue error');

const allowed = new Set((process.env.ALLOWED_HOSTS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
if (!allowed.size) throw Error('ALLOWED_HOSTS is required');

function verifiedEmbed(value) {
  if (typeof value !== 'string' || !value) return null;
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !allowed.has(url.hostname.toLowerCase())) return null;
  return url.toString();
}
function normalizeEvent(item) {
  if (!item || typeof item !== 'object') return null;
  const id = String(item.id ?? '');
  const name = item.name ?? item.title;
  if (!/^[a-zA-Z0-9._~-]{1,180}$/.test(id) || typeof name !== 'string' || !name.trim() || name.length > 200) return null;
  const candidates = Array.isArray(item.substreams) ? item.substreams : Array.isArray(item.streams) ? item.streams : [];
  const substreams = candidates.map((s, i) => {
    if (!s || typeof s !== 'object') return null;
    const iframe = verifiedEmbed(s.iframe ?? s.embed_url ?? s.embedUrl);
    if (!iframe) return null;
    return { id: String(s.id ?? i), iframe, source_tag: String(s.source_tag ?? s.label ?? 'Stream'), hd: s.hd === true };
  }).filter(Boolean);
  const direct = verifiedEmbed(item.iframe ?? item.embed_url ?? item.embedUrl);
  if (direct) substreams.unshift({ id: 'primary', iframe: direct, source_tag: 'Primary', hd: false });
  if (!substreams.length) return null;
  return {
    id, name: name.trim(),
    category_name: String(item.category_name ?? item.category ?? 'Football'),
    ...(Number.isFinite(Number(item.starts_at)) ? { starts_at: Number(item.starts_at) } : {}),
    ...(Number.isFinite(Number(item.ends_at)) ? { ends_at: Number(item.ends_at) } : {}),
    substreams
  };
}
let items;
if (Array.isArray(source.events)) items = source.events;
else if (Array.isArray(source.streams)) {
  // Grouped catalogues must supply explicit event objects; do not guess IDs or embeds.
  items = source.streams.flatMap(group => {
    if (!group || typeof group !== 'object') return [];
    const category = String(group.category ?? group.category_name ?? '').toLowerCase().trim();
    const entries = Array.isArray(group.streams) ? group.streams : Array.isArray(group.events) ? group.events : [group];
    return entries.filter(item => {
      const itemCategory = String(item?.category_name ?? item?.category ?? category).toLowerCase().trim();
      return ['football', 'soccer', 'association football'].includes(itemCategory);
    }).map(item => ({...item, category_name: 'Football'}));
  });
} else throw Error('Expected events or streams array');

const events = items.map(normalizeEvent).filter(Boolean);
if (!events.length) throw Error('No events with valid IDs, names and approved HTTPS embeds; registry unchanged');
if (events.length > 1000) throw Error('Too many events');
if (new Set(events.map(e => e.id)).size !== events.length) throw Error('Duplicate event IDs');
fs.writeFileSync(output, JSON.stringify({ events }));
console.log('Normalized', events.length, 'events from', items.length, 'candidate records');
