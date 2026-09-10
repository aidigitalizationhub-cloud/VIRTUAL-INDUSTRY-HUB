export type IpEvidenceSourceType = 'scholarly' | 'patent' | 'wipo' | 'ip_office' | 'news' | 'researcher_link';

export interface IpEvidenceSource {
  id: string;
  type: IpEvidenceSourceType;
  title: string;
  publisher: string;
  url: string;
  publishedAt?: string | null;
  excerpt?: string | null;
  retrievedAt: string;
}

const clean = (value: unknown, max = 500): string => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const queryText = (title?: string | null, description?: string | null): string => clean(`${title || ''} ${description || ''}`, 240);

const fetchJson = async (url: string): Promise<any | null> => {
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'UG-Virtual-Industry-Hub/1.0' }, signal: AbortSignal.timeout(7000) });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

const source = (id: string, type: IpEvidenceSourceType, title: string, publisher: string, url: string, excerpt?: string | null, publishedAt?: string | null): IpEvidenceSource => ({
  id, type, title: clean(title, 240), publisher: clean(publisher, 120), url, excerpt: clean(excerpt, 700) || null, publishedAt: publishedAt || null, retrievedAt: new Date().toISOString(),
});

export async function collectIpEvidence(params: {
  db: any;
  title?: string | null;
  description?: string | null;
  links?: Array<{ url: string; title?: string | null; source_type?: string | null; notes?: string | null }>;
}): Promise<IpEvidenceSource[]> {
  const query = queryText(params.title, params.description);
  if (!query) return [];
  const encoded = encodeURIComponent(query);
  const sources: IpEvidenceSource[] = [];

  for (const [index, link] of (params.links || []).slice(0, 8).entries()) {
    if (/^https?:\/\//i.test(link.url)) {
      const type: IpEvidenceSourceType = link.source_type === 'patent' ? 'patent' : link.source_type === 'publication' ? 'scholarly' : 'researcher_link';
      sources.push(source(`R${index + 1}`, type, link.title || link.url, 'Researcher-provided source', link.url, link.notes));
    }
  }

  const [openAlex, crossref, news] = await Promise.all([
    fetchJson(`https://api.openalex.org/works?search=${encoded}&per-page=4`),
    fetchJson(`https://api.crossref.org/works?query=${encoded}&rows=4`),
    params.db?.from('news').select('title, summary, external_url, published_at, source_name').ilike('title', `%${clean(params.title, 80)}%`).limit(4),
  ]);

  for (const [index, item] of (openAlex?.results || []).entries()) {
    const url = item.doi || item.primary_location?.landing_page_url || item.id;
    if (url) sources.push(source(`S${index + 1}`, 'scholarly', item.title, item.host_organization_name || 'OpenAlex', url, item.abstract_inverted_index ? 'Scholarly record matched to the project query.' : null, item.publication_date));
  }
  for (const [index, item] of (crossref?.message?.items || []).entries()) {
    const url = item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : '');
    if (url && !sources.some((itemSource) => itemSource.url === url)) sources.push(source(`C${index + 1}`, 'scholarly', item.title?.[0] || 'Crossref work', 'Crossref', url, item['container-title']?.[0], item.published?.['date-parts']?.[0]?.join('-')));
  }
  for (const [index, item] of (news?.data || []).entries()) {
    if (item.external_url && /^https?:\/\//i.test(item.external_url)) sources.push(source(`N${index + 1}`, 'news', item.title, item.source_name || 'UG Industry Hub news feed', item.external_url, item.summary, item.published_at));
  }

  const patentSearchUrl = `https://patents.google.com/?q=${encoded}`;
  const wipoSearchUrl = `https://patentscope.wipo.int/search/en/result.jsf?query=${encoded}`;
  sources.push(source('P1', 'patent', `Patent search for ${query}`, 'Google Patents', patentSearchUrl, 'Search portal result; reviewers must inspect the linked records before relying on it.'));
  sources.push(source('W1', 'wipo', `WIPO patent search for ${query}`, 'WIPO PATENTSCOPE', wipoSearchUrl, 'Search portal result; reviewers must inspect the linked records before relying on it.'));
  const ipOfficeUrl = `https://www.wipo.int/portal/en/index.html?query=${encoded}`;
  sources.push(source('I1', 'ip_office', `IP Office reference search for ${query}`, 'WIPO IP portal', ipOfficeUrl, 'Institutional IP Office reviewers should replace or supplement this portal reference with the relevant office record.'));

  return sources.slice(0, 24);
}

export const formatIpEvidenceForPrompt = (sources: IpEvidenceSource[]): string => sources.length
  ? sources.map((item) => `[${item.id}] ${item.type} | ${item.title} | ${item.publisher} | ${item.url} | ${item.excerpt || 'No excerpt available.'}`).join('\n')
  : 'No external evidence sources were available. State that evidence retrieval was unavailable and do not infer support.';

export const formatIpReviewerFinding = (output: any, sources: IpEvidenceSource[], answers: Record<string, unknown>): string => {
  const allowed = new Set([...sources.map((item) => item.id), ...Object.keys(answers || {})]);
  const reasoning = Array.isArray(output?.reasoning) ? output.reasoning.map((item: any) => {
    const citations = Array.isArray(item?.source_ids) ? item.source_ids.filter((id: unknown) => allowed.has(String(id))) : [];
    return `- ${String(item?.issue || 'Issue')}: ${String(item?.why_it_matters || 'Further review required.')} [${citations.length ? citations.join(', ') : 'unverified citation'}]`;
  }).join('\n') : 'No structured reasoning returned.';
  const actions = Array.isArray(output?.required_actions)
    ? output.required_actions.map((item: unknown) => `- ${String(item)}`).join('\n')
    : '- Review the cited evidence and verify the outstanding facts.';
  const sourceList = sources.map((item) => `[${item.id}] ${item.title} - ${item.url}`).join('\n') || 'No external sources retrieved.';
  return `${String(output?.summary || 'The assistant reviewer returned no summary.')}\n\nRecommendation: ${String(output?.recommendation || 'Human review required.')}\n\nReasoning:\n${reasoning}\n\nRequired actions:\n${actions}\n\nEvidence sources:\n${sourceList}\n\nAI advisory only. This is not legal clearance or a publication decision.`;
};
