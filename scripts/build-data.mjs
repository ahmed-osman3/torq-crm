// Normalizes the Torq scraper output into a single clean lead model the CRM loads.
// Reads ../torq-leads/output/*.json, writes src/data/leads.json.
// Safe to re-run any time the scraper produces fresh output.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', '..', 'torq-leads', 'output')
const BIG = join(OUT_DIR, 'london_automotive_scored.json')
// Instagram-first SMB "hot" lists, one per region. Add a region here and it
// flows straight into the CRM.
const REGIONS = ['east', 'north', 'south', 'west']
const DEST = join(__dirname, '..', 'public', 'leads.json')

const load = (p) => {
  if (!existsSync(p)) return []
  const d = JSON.parse(readFileSync(p, 'utf8'))
  return Array.isArray(d) ? d : Object.values(d).find(Array.isArray) || []
}

// Junk placeholder emails the scraper sometimes picks up off template sites.
const JUNK_EMAIL = /mysite\.com|example\.com|yourdomain|domain\.com|sentry\.|wixpress|\.png$|\.jpg$|@2x|test@|no-?reply|sentry-next/i
const cleanEmail = (e) => {
  if (!e || typeof e !== 'string') return ''
  const s = e.trim()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) return ''
  if (JUNK_EMAIL.test(s)) return ''
  return s.toLowerCase()
}

// UK outward postcode (E10, RM8, TN16, HA3, TW3, SW1A...) from the tail of an address.
const areaFrom = (addr) => {
  if (!addr) return ''
  const m = String(addr).toUpperCase().match(/\b([A-Z]{1,2}\d[A-Z\d]?)\s*\d[A-Z]{2}\b/)
  return m ? m[1] : ''
}
// Broad district grouping for the outward code (E, RM, TN, HA...) — the letter prefix.
const districtFrom = (area) => (area.match(/^[A-Z]{1,2}/) || [''])[0]

const igHandle = (url) => {
  if (!url) return ''
  const m = String(url).match(/instagram\.com\/([^/?#]+)/i)
  return m ? m[1].replace(/\/$/, '') : ''
}

const splitCats = (s) =>
  String(s || '')
    .split(/;|,/)
    .map((x) => x.trim())
    .filter(Boolean)

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// In CI (e.g. GitHub Pages) the scraper folder isn't present. If the source is
// missing, keep whatever leads.json is already committed rather than wiping it.
if (!existsSync(BIG)) {
  console.log(
    existsSync(DEST)
      ? `⚠ ${BIG} not found — keeping existing public/leads.json (CI build).`
      : `⚠ ${BIG} not found and no existing leads.json — nothing to build.`,
  )
  process.exit(0)
}

const big = load(BIG)

// Merge every region's IG-enriched SMB list into one hot set, keyed by place_id.
// If a place shows up in two regions (rare, postcode-partitioned), keep the
// higher IG score. Each hot lead is tagged with the region it came from.
const hotById = new Map()
for (const region of REGIONS) {
  const rows = load(join(OUT_DIR, `${region}_london_leads.json`))
  for (const h of rows) {
    if (!h.place_id) continue
    const tagged = { ...h, region }
    const cur = hotById.get(h.place_id)
    if (!cur || (num(h.ig_score) ?? 0) > (num(cur.ig_score) ?? 0)) hotById.set(h.place_id, tagged)
  }
}

const leads = big
  .filter((b) => b.place_id && b.name && b.business_status !== 'CLOSED_PERMANENTLY')
  .map((b) => {
    const h = hotById.get(b.place_id)
    const area = areaFrom(b.address)
    const email = cleanEmail(b.email)
    return {
      id: b.place_id,
      name: b.name,
      categories: splitCats(b.category_matched),
      primaryType: b.primary_type || '',
      tier: b.tier || 'C',
      score: num(b.quality_score) ?? 0,
      scoreReasons: b.score_reasons || '',
      address: b.address || '',
      area,
      district: districtFrom(area),
      phone: b.phone || '',
      website: b.website || '',
      email,
      rating: num(b.rating),
      reviews: num(b.reviews) ?? 0,
      instagram: b.instagram || (h && h.instagram) || '',
      igHandle: igHandle(b.instagram || (h && h.instagram)),
      igFollowers: num(b.instagram_followers) ?? (h ? num(h.ig_followers) : null),
      igActive: b.instagram_active === 'yes' || (h && h.ig_last_post_days != null && h.ig_last_post_days < 30),
      facebook: b.facebook || '',
      tiktok: b.tiktok || '',
      youtube: b.youtube || '',
      googleMapsUrl: b.google_maps_url || (h && h.google_maps_url) || '',
      // High-signal Instagram enrichment (present for the "hot" SMB regional sets)
      hot: !!h,
      region: h ? h.region : '',
      igTier: h ? h.ig_tier : '',
      igScore: h ? num(h.ig_score) : null,
      igReasons: h ? h.ig_reasons : '',
      igBio: h ? h.ig_bio : '',
      igEngagementPct: h ? num(h.ig_engagement_pct) : null,
      igPostsPerWeek: h ? num(h.ig_posts_per_week) : null,
      igLastPostDays: h ? num(h.ig_last_post_days) : null,
      source: 'torq-automotive',
    }
  })
  // Best leads first so the pool opens on the strongest prospects.
  .sort((a, b) => (b.hot - a.hot) || (b.score - a.score) || (b.reviews - a.reviews))

const districts = [...new Set(leads.map((l) => l.district).filter(Boolean))].sort()
const categories = [...new Set(leads.flatMap((l) => l.categories))].sort()

writeFileSync(
  DEST,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      count: leads.length,
      districts,
      categories,
      leads,
    },
    null,
    0,
  ),
)

const byRegion = REGIONS.map((r) => `${r} ${leads.filter((l) => l.region === r).length}`).join(', ')
console.log(
  `✓ wrote ${leads.length} leads (${leads.filter((l) => l.hot).length} IG-hot: ${byRegion}; ` +
    `${leads.filter((l) => l.igTier === 'A').length} IG tier-A) → public/leads.json`,
)
