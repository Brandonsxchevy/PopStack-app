import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@/database/database.service';
import axios from 'axios';
import * as dns from 'dns/promises';

interface Signal {
  source: 'html' | 'header' | 'dns' | 'url';
  signal: string;
  platform: string;
  weight: number;
}

interface FingerprintResult {
  platform: string;
  confidence: number;
  signals: Signal[];
}

// Detection rules: [pattern, platform, weight, label]
const HTML_RULES: [RegExp, string, number, string][] = [
  [/data-mesh-id|dataItem-[a-z0-9]+/i,           'WIX',         30, 'wix data attr'],
  [/static\.wixstatic\.com/,                       'WIX',         25, 'wix static cdn'],
  [/\/wp-content\/|\/wp-json\//,                  'WORDPRESS',   30, 'wp path'],
  [/<meta[^>]+generator[^>]+WordPress/i,           'WORDPRESS',   20, 'wp meta generator'],
  [/cdn\.shopify\.com|Shopify\.theme|shopify\.com\/s\/files/,'SHOPIFY', 35, 'shopify cdn'],
  [/static\.squarespace\.com/,                     'SQUARESPACE', 35, 'sqsp cdn'],
  [/\.webflow\.io|webflow\.com\/js/,               'WEBFLOW',     35, 'webflow cdn'],
];

const NS_RULES: [RegExp, string, number][] = [
  [/wixdns\.net/,     'WIX',       35],
  [/wordpress\.com/,  'WORDPRESS', 35],
  [/myshopify\.com/,  'SHOPIFY',   35],
];

@Injectable()
export class FingerprintService {
  private readonly logger = new Logger(FingerprintService.name);

  constructor(private readonly db: DatabaseService) {}

  // Called from QuestionsService — enqueues async fingerprint
  async enqueue(questionId: string, url: string) {
    // In MVP we run directly — in production swap for BullMQ job
    this.run(questionId, url).catch(err =>
      this.logger.error(`Fingerprint failed for ${questionId}: ${err.message}`)
    );
  }

  async run(questionId: string, url: string) {
    const normalised = this.normaliseUrl(url);

    // Create pending fingerprint record
    const fp = await this.db.fingerprint.create({
      data: { questionId, url: normalised, signals: [], status: 'PENDING' },
    });

    try {
      const [htmlResult, headerResult, dnsResult, urlResult] = await Promise.allSettled([
        this.probeHtml(normalised),
        this.probeHeaders(normalised),
        this.probeDns(normalised),
        Promise.resolve(this.probeUrl(normalised)),
      ]);

      const signals: Signal[] = [
        ...(htmlResult.status === 'fulfilled' ? htmlResult.value : []),
        ...(headerResult.status === 'fulfilled' ? headerResult.value : []),
        ...(dnsResult.status === 'fulfilled' ? dnsResult.value : []),
        ...(urlResult.status === 'fulfilled' ? urlResult.value : []),
      ];

      const result = this.score(signals);

      // Update fingerprint record
      const updated = await this.db.fingerprint.update({
        where: { id: fp.id },
        data: {
          platform: result.platform as any,
          confidence: result.confidence,
          signals: signals as any,
          status: 'COMPLETE',
        },
      });

      // Update question with fingerprint + recompute clarity
      await this.db.question.update({
        where: { id: questionId },
        data: { fingerprintId: updated.id },
      });

      this.logger.log(`Fingerprinted ${normalised} → ${result.platform} (${result.confidence}%)`);
      return result;
    } catch (err) {
      await this.db.fingerprint.update({
        where: { id: fp.id },
        data: { status: 'FAILED' },
      });
      throw err;
    }
  }

  private async probeHtml(url: string): Promise<Signal[]> {
    const res = await axios.get(url, {
      timeout: 5000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PopStack/1.0)' },
      maxRedirects: 3,
    });
    const html: string = res.data;
    const signals: Signal[] = [];

    for (const [pattern, platform, weight, label] of HTML_RULES) {
      if (pattern.test(html)) {
        signals.push({ source: 'html', signal: label, platform, weight });
      }
    }
    return signals;
  }

  private async probeHeaders(url: string): Promise<Signal[]> {
    const res = await axios.head(url, {
      timeout: 3000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PopStack/1.0)' },
      maxRedirects: 3,
    });
    const signals: Signal[] = [];
    const xpb = (res.headers['x-powered-by'] || '').toLowerCase();

    if (/express/.test(xpb)) {
      signals.push({ source: 'header', signal: 'x-powered-by: express', platform: 'WIX', weight: 20 });
    }
    if (/php/.test(xpb)) {
      signals.push({ source: 'header', signal: 'x-powered-by: php', platform: 'WORDPRESS', weight: 10 });
    }
    return signals;
  }

  private async probeDns(url: string): Promise<Signal[]> {
    const hostname = new URL(url).hostname;
    const signals: Signal[] = [];
    try {
      const nameservers = await dns.resolveNs(hostname);
      for (const [pattern, platform, weight] of NS_RULES) {
        if (nameservers.some(ns => pattern.test(ns))) {
          signals.push({ source: 'dns', signal: `ns: ${nameservers[0]}`, platform, weight });
        }
      }
    } catch {
      // DNS lookup failed — not an error, just no signals
    }
    return signals;
  }

  private probeUrl(url: string): Signal[] {
    const signals: Signal[] = [];
    const hostname = new URL(url).hostname;
    if (/\.wixsite\.com|\.wix\.com/.test(hostname)) {
      signals.push({ source: 'url', signal: 'wix hostname', platform: 'WIX', weight: 40 });
    }
    if (/\.myshopify\.com/.test(hostname)) {
      signals.push({ source: 'url', signal: 'myshopify hostname', platform: 'SHOPIFY', weight: 40 });
    }
    if (/\.webflow\.io/.test(hostname)) {
      signals.push({ source: 'url', signal: 'webflow hostname', platform: 'WEBFLOW', weight: 40 });
    }
    return signals;
  }

  private score(signals: Signal[]): FingerprintResult {
    const totals: Record<string, number> = {};
    for (const s of signals) {
      totals[s.platform] = (totals[s.platform] || 0) + s.weight;
    }
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const [platform, raw] = sorted[0] ?? ['UNKNOWN', 0];
    return {
      platform: raw < 30 ? 'UNKNOWN' : platform,
      confidence: Math.min(raw, 100),
      signals,
    };
  }

  private normaliseUrl(url: string): string {
    if (!url.startsWith('http')) url = 'https://' + url;
    return new URL(url).href;
  }

  async override(fingerprintId: string, platform: string) {
    return this.db.fingerprint.update({
      where: { id: fingerprintId },
      data: { userOverride: platform as any, overrideAt: new Date() },
    });
  }
}
