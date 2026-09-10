// Advisory AI screening. Never publishes, never gives legal clearance.
// Rule-based first pass + optional provider text; failures -> REVIEW_REQUIRED.

export interface IpScreenInput {
  title?: string;
  description?: string;
  answers: Record<string, unknown>;
  route?: string | null;
}

export interface IpScreenFinding {
  category: 'authenticity' | 'confidentiality' | 'ownership' | 'evidence' | 'quality' | 'ai';
  title: string;
  body: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
}

const norm = (v: unknown): string => (typeof v === 'string' ? v.toLowerCase() : '');

export function buildAdvisoryFindings(input: IpScreenInput): { findings: IpScreenFinding[]; needsHumanReview: boolean } {
  const findings: IpScreenFinding[] = [];
  const a = input.answers ?? {};
  const get = (k: string) => norm((a as any)[k]?.value ?? (a as any)[k]);

  if (get('possible_ip') === 'not_sure' || get('possible_ip') === 'yes') {
    findings.push({
      category: 'confidentiality',
      title: 'Possible IP flagged for human review',
      body: 'Researcher indicated the work may contain IP or is unsure. Route to TTO review and keep technical files private until cleared.',
      severity: get('possible_ip') === 'yes' ? 'high' : 'medium',
    });
  }
  if (get('publicly_shared') === 'yes') {
    findings.push({
      category: 'evidence',
      title: 'Prior public disclosure indicated',
      body: 'Researcher indicated a prior public disclosure. Extract dates, channels, and links before any publication decision.',
      severity: 'high',
    });
  }
  if (get('agreements') === 'yes' || get('agreements') === 'not_sure') {
    findings.push({
      category: 'ownership',
      title: 'Third-party obligation check required',
      body: 'Possible NDA, sponsor, collaboration, or material-transfer obligation. Verify ownership and sponsor terms with TTO.',
      severity: 'high',
    });
  }
  if (get('resources_used') === 'yes') {
    findings.push({
      category: 'ownership',
      title: 'Institutional resource use declared',
      body: 'University funding, equipment, staff, or sponsored research was used. Confirm institutional ownership policy with TTO.',
      severity: 'medium',
    });
  }
  const text = `${input.title ?? ''} ${input.description ?? ''}`.trim();
  if (text.length < 80) {
    findings.push({
      category: 'quality',
      title: 'Disclosure description is thin',
      body: 'Public summary lacks enough detail for quality screening. Request a clearer non-confidential summary plus restricted technical detail.',
      severity: 'low',
    });
  }
  if (!findings.length) {
    findings.push({
      category: 'quality',
      title: 'No blocking signals from initial answers',
      body: 'Initial answers contain no explicit IP, disclosure, or ownership flag. Admin completeness review and evidence check are still required.',
      severity: 'info',
    });
  }
  const needsHumanReview = findings.some((f) => f.severity === 'high' || f.severity === 'critical' || f.severity === 'medium');
  return { findings, needsHumanReview: needsHumanReview || true };
}
