export type IpEvidenceSourceType = 'scholarly' | 'patent' | 'wipo' | 'ip_office' | 'news' | 'researcher_link';

// How far a source was actually verified. Only 'retrieved' items are backed by a
// record the platform fetched; the others are pointers a reviewer must open.
// Absence of this field is treated as NOT citable, so a newly added source type
// fails closed rather than becoming quotable evidence by accident.
export type IpEvidenceRetrievalStatus =
  | 'retrieved'       // the underlying record was fetched from a permitted source
  | 'unverified_link' // researcher-supplied pointer, contents never fetched
  | 'search_lead';    // search-portal URL only; no patent or record was retrieved

export interface IpEvidenceSource {
  id: string;
  type: IpEvidenceSourceType;
  title: string;
  publisher: string;
  url: string;
  retrieval_status?: IpEvidenceRetrievalStatus;
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

const source = (id: string, type: IpEvidenceSourceType, title: string, publisher: string, url: string, retrieval_status: IpEvidenceRetrievalStatus, excerpt?: string | null, publishedAt?: string | null): IpEvidenceSource => ({
  id, type, title: clean(title, 240), publisher: clean(publisher, 120), url, retrieval_status, excerpt: clean(excerpt, 700) || null, publishedAt: publishedAt || null, retrievedAt: new Date().toISOString(),
});

/**
 * The only source ids a model finding is permitted to cite: records the platform
 * actually fetched. Search portals and unopened links are excluded so a finding
 * cannot cite "P1" as though it were a patent.
 */
export const citableSourceIds = (sources: IpEvidenceSource[]): string[] =>
  sources.filter((item) => item.retrieval_status === 'retrieved').map((item) => item.id);

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
      sources.push(source(`R${index + 1}`, type, link.title || link.url, 'Researcher-provided source', link.url, 'unverified_link', link.notes));
    }
  }

  const [openAlex, crossref, news] = await Promise.all([
    fetchJson(`https://api.openalex.org/works?search=${encoded}&per-page=4`),
    fetchJson(`https://api.crossref.org/works?query=${encoded}&rows=4`),
    params.db?.from('news').select('title, summary, external_url, published_at, source_name').ilike('title', `%${clean(params.title, 80)}%`).limit(4),
  ]);

  for (const [index, item] of (openAlex?.results || []).entries()) {
    const url = item.doi || item.primary_location?.landing_page_url || item.id;
    if (url) sources.push(source(`S${index + 1}`, 'scholarly', item.title, item.host_organization_name || 'OpenAlex', url, 'retrieved', item.abstract_inverted_index ? 'Scholarly record matched to the project query.' : null, item.publication_date));
  }
  for (const [index, item] of (crossref?.message?.items || []).entries()) {
    const url = item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : '');
    if (url && !sources.some((itemSource) => itemSource.url === url)) sources.push(source(`C${index + 1}`, 'scholarly', item.title?.[0] || 'Crossref work', 'Crossref', url, 'retrieved', item['container-title']?.[0], item.published?.['date-parts']?.[0]?.join('-')));
  }
  for (const [index, item] of (news?.data || []).entries()) {
    if (item.external_url && /^https?:\/\//i.test(item.external_url)) sources.push(source(`N${index + 1}`, 'news', item.title, item.source_name || 'UG Industry Hub news feed', item.external_url, 'retrieved', item.summary, item.published_at));
  }

  // Search portals: no patent record is fetched here, so these stay citable-excluded
  // and a finding that cites them is treated as an unverified citation.
  const patentSearchUrl = `https://patents.google.com/?q=${encoded}`;
  const wipoSearchUrl = `https://patentscope.wipo.int/search/en/result.jsf?query=${encoded}`;
  sources.push(source('P1', 'patent', `Patent search for ${query}`, 'Google Patents', patentSearchUrl, 'search_lead', 'Search portal result; no patent record was retrieved. Reviewers must inspect the linked records before relying on it.'));
  sources.push(source('W1', 'wipo', `WIPO patent search for ${query}`, 'WIPO PATENTSCOPE', wipoSearchUrl, 'search_lead', 'Search portal result; no patent record was retrieved. Reviewers must inspect the linked records before relying on it.'));
  const ipOfficeUrl = `https://www.wipo.int/portal/en/index.html?query=${encoded}`;
  sources.push(source('I1', 'ip_office', `IP Office reference search for ${query}`, 'WIPO IP portal', ipOfficeUrl, 'search_lead', 'Search portal result; no office record was retrieved. Institutional IP Office reviewers should replace or supplement this portal reference with the relevant office record.'));

  return sources.slice(0, 24);
}

const RETRIEVAL_NOTE: Record<IpEvidenceRetrievalStatus, string> = {
  retrieved: 'CITABLE - record was retrieved',
  unverified_link: 'NOT CITABLE - researcher link, contents not retrieved',
  search_lead: 'NOT CITABLE - search portal only, no record retrieved',
};

export const formatIpEvidenceForPrompt = (sources: IpEvidenceSource[]): string => sources.length
  ? sources.map((item) => `[${item.id}] ${item.type} | ${item.title} | ${item.publisher} | ${item.url} | ${RETRIEVAL_NOTE[item.retrieval_status ?? 'search_lead']} | ${item.excerpt || 'No excerpt available.'}`).join('\n')
  : 'No external evidence sources were available. State that evidence retrieval was unavailable and do not infer support.';

export const formatIpReviewerFinding = (
  output: any,
  sources: IpEvidenceSource[],
  answers: Record<string, unknown>,
  validation?: { droppedItems?: Array<{ issue: string; reason: string }>; invalidCitations?: string[]; limitations?: string[] },
): string => {
  const allowed = new Set([...citableSourceIds(sources), ...Object.keys(answers || {})]);
  const reasoning = Array.isArray(output?.reasoning) ? output.reasoning.map((item: any) => {
    const citations = Array.isArray(item?.source_ids) ? item.source_ids.filter((id: unknown) => allowed.has(String(id))) : [];
    return `- ${String(item?.issue || 'Issue')}: ${String(item?.why_it_matters || 'Further review required.')} [${citations.length ? citations.join(', ') : 'unverified citation'}]`;
  }).join('\n') : 'No structured reasoning returned.';
  const actions = Array.isArray(output?.required_actions)
    ? output.required_actions.map((item: unknown) => `- ${String(item)}`).join('\n')
    : '- Review the cited evidence and verify the outstanding facts.';
  const sourceList = sources.map((item) => `[${item.id}] ${item.title} - ${item.url}`).join('\n') || 'No external sources retrieved.';
  const validationBlock = validation?.limitations?.length
    ? `\n\nValidation notes:\n${validation.limitations.map((line) => `- ${line}`).join('\n')}`
    : '';
  return `${String(output?.summary || 'The assistant reviewer returned no summary.')}\n\nRecommendation: ${String(output?.recommendation || 'Human review required.')}\n\nReasoning:\n${reasoning}\n\nRequired actions:\n${actions}\n\nEvidence sources:\n${sourceList}${validationBlock}\n\nAI advisory only. This is not legal clearance or a publication decision.`;
};
