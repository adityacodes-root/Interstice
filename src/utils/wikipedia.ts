import { generateAiFallbackSummary } from './ai';

const WIKIPEDIA_HEADERS = {
  'User-Agent': 'IntersticeExplorer/1.0 (contact: admin@interstice.app) Next.js/16.2.7'
};

export function extractSubjectFromQuestion(question: string): string {
  let q = question.trim();

  // Clean up user questions to find the main subject for Wikipedia search.
  // Handles stuff like "How does X relate to Y?", "What is the history of X?", or "What is X?"
  q = q.replace(/\?+$/, '');

  const howDoesRelate = q.match(/^How\s+does\s+(.+?)\s+relate\s+to/i);
  if (howDoesRelate) return howDoesRelate[1].trim();

  const ofX = q.match(/of\s+([^?]+)$/i);
  if (ofX) return ofX[1].trim();

  const whatIs = q.match(/^What\s+(is|are)\s+(.+?)$/i);
  if (whatIs) return whatIs[2].trim();

  return q;
}

export async function searchWikipedia(query: string): Promise<string> {
  if (!query) return '';
  const cleanQuery = extractSubjectFromQuestion(query);
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&srlimit=1&format=json&origin=*`;
    const res = await fetch(url, { headers: WIKIPEDIA_HEADERS });
    if (!res.ok) return cleanQuery;
    const data = await res.json();
    const searchResults = data?.query?.search;
    if (searchResults && searchResults.length > 0) {
      return searchResults[0].title;
    }
  } catch (e) {
    console.error('Error searching Wikipedia:', e);
  }
  return cleanQuery;
}

interface WikipediaSummary {
  title: string;
  extract: string;
  image: string;
  url: string;
}

export async function getWikipediaSummary(title: string): Promise<WikipediaSummary> {
  const formattedTitle = title.replace(/\s+/g, '_');
  const fallbackUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(formattedTitle)}`;

  let titleOut = title;
  let extract = '';
  let image = '';
  let url = fallbackUrl;

  try {
    const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(formattedTitle)}`;
    const res = await fetch(apiUrl, { headers: WIKIPEDIA_HEADERS });
    if (res.ok) {
      const data = await res.json();
      titleOut = data.title || title;
      extract = data.extract || '';
      image = data.originalimage?.source || data.thumbnail?.source || '';
      url = data.content_urls?.desktop?.page || fallbackUrl;
    } else {
      console.warn(`Wikipedia REST API returned status ${res.status} for summary of: ${title}`);
    }
  } catch (e) {
    console.error(`Error fetching summary for ${title}:`, e);
  }

  // If Wikipedia's summary is blank or a placeholder, ask the LLM for a fallback overview.
  const isPlaceholder = !extract ||
    extract.includes('Overview could not be retrieved') ||
    extract === 'No overview available.' ||
    extract.trim() === '';

  if (isPlaceholder) {
    const fallbackSummary = await generateAiFallbackSummary(title);
    if (fallbackSummary) {
      extract = fallbackSummary;
    } else {
      extract = 'Overview could not be retrieved from Wikipedia.';
    }
  }

  return {
    title: titleOut,
    extract,
    image,
    url,
  };
}

interface WikipediaDetails {
  categories: string[];
  externalLinks: string[];
  internalLinks: string[];
}

export async function getWikipediaDetails(title: string): Promise<WikipediaDetails> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=links|categories|extlinks&titles=${encodeURIComponent(title)}&plnamespace=0&pllimit=500&cllimit=100&ellimit=100&format=json&origin=*`;
    const res = await fetch(url, { headers: WIKIPEDIA_HEADERS });
    if (!res.ok) {
      return { categories: [], externalLinks: [], internalLinks: [] };
    }
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) {
      return { categories: [], externalLinks: [], internalLinks: [] };
    }

    const page = Object.values(pages)[0] as any;
    if (!page) {
      return { categories: [], externalLinks: [], internalLinks: [] };
    }

    const categories = page.categories
      ? page.categories.map((c: any) => c.title.replace(/^Category:/, ''))
      : [];

    const externalLinks = page.extlinks
      ? page.extlinks.map((l: any) => l['*'])
      : [];

    const internalLinks = page.links
      ? page.links.map((l: any) => l.title)
      : [];

    return { categories, externalLinks, internalLinks };
  } catch (e) {
    console.error(`Error fetching MediaWiki details for ${title}:`, e);
    return { categories: [], externalLinks: [], internalLinks: [] };
  }
}

// Skip list pages, common words, and identifiers to keep graph nodes clean.
const STOP_WORDS = new Set([
  'united states', 'english language', 'united kingdom', 'wayback machine',
  'digital object identifier', 'main page', 'category', 'isbn', 'issn',
  'oclc', 'pmc', 'pmid', 'doi', 'arxiv', 's2cid', 'bibcode', 'new york city',
  'london', 'paris', 'germany', 'france', 'japan', 'canada', 'australia',
  'india', 'china', 'russia', 'wikimedia', 'internet archive', 'google books',
  'github', 'identifier', 'data', 'information', 'system', 'technology',
  'science', 'concept', 'definition', 'type', 'example', 'list of',
  'wikipedia', 'free software', 'open source', 'academic publishing',
  'peer review', 'scientific journal', 'bibliography', 'citation',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'pdf', 'epub', 'website', 'web page', 'web site', 'url', 'http', 'https',
  'privacy policy', 'terms of service', 'cookie statement', 'help:contents',
  'portal:contents', 'special:search', 'retrieved', 'archived', 'original',
  'docket number', 'patent number', 'publication date'
]);

export function filterLowValueLinks(links: string[]): string[] {
  const yearRegex = /^\d+(s|th|st|nd|rd)?\s*(century|decades?|years?)?$/i;
  const numberOnlyRegex = /^\d+$/;

  return links.filter(link => {
    const cleanLink = link.trim();
    if (!cleanLink) return false;

    const lower = cleanLink.toLowerCase();

    if (numberOnlyRegex.test(lower) || yearRegex.test(lower)) {
      return false;
    }

    if (lower.startsWith('list of') || lower.startsWith('lists of')) {
      return false;
    }

    if (STOP_WORDS.has(lower)) {
      return false;
    }

    return true;
  });
}


export async function getWikipediaBacklinks(title: string): Promise<string[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=backlinks&bltitle=${encodeURIComponent(title)}&blnamespace=0&bllimit=250&format=json&origin=*`;
    const res = await fetch(url, { headers: WIKIPEDIA_HEADERS });
    if (!res.ok) return [];
    const data = await res.json();
    const backlinks = data?.query?.backlinks;
    if (backlinks) {
      return backlinks.map((bl: any) => bl.title);
    }
  } catch (e) {
    console.error('Error fetching backlinks:', e);
  }
  return [];
}


export async function getWikipediaSeeAlsoLinks(title: string): Promise<string[]> {
  try {
    // MediaWiki parse requires a 2-step process to get "See also": find the section index first.
    const sectionsUrl = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=sections&format=json&origin=*`;
    const res1 = await fetch(sectionsUrl, { headers: WIKIPEDIA_HEADERS });
    if (!res1.ok) return [];
    const data1 = await res1.json();
    const sections = data1?.parse?.sections;
    if (!sections) return [];

    const seeAlsoSec = sections.find((s: any) => s.line && s.line.toLowerCase() === 'see also');
    if (!seeAlsoSec) return [];

    const linksUrl = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&section=${seeAlsoSec.index}&prop=links&format=json&origin=*`;
    const res2 = await fetch(linksUrl, { headers: WIKIPEDIA_HEADERS });
    if (!res2.ok) return [];
    const data2 = await res2.json();
    const links = data2?.parse?.links;
    if (links) {
      return links.filter((l: any) => l.ns === 0).map((l: any) => l['*']);
    }
  } catch (e) {
    console.error('Error fetching See Also links:', e);
  }
  return [];
}

export async function getWikipediaInfoboxLinks(title: string): Promise<string[]> {
  try {
    // Scrape links inside the Infobox. We grab raw wikitext, find the infobox, and pull out links.
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles=${encodeURIComponent(title)}&rvprop=content&format=json&origin=*`;
    const res = await fetch(url, { headers: WIKIPEDIA_HEADERS });
    if (!res.ok) return [];
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return [];
    const page = Object.values(pages)[0] as any;
    const content = page?.revisions?.[0]?.['*'] || '';
    if (!content) return [];

    const infoboxRegex = /\{\{[Ii]nfobox[\s\S]*?\}\}/g;
    const matches = content.match(infoboxRegex);
    if (!matches) return [];

    const links: string[] = [];
    const linkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    for (const match of matches) {
      let linkMatch;
      while ((linkMatch = linkRegex.exec(match)) !== null) {
        if (linkMatch[1]) {
          links.push(linkMatch[1].trim());
        }
      }
    }
    return Array.from(new Set(links));
  } catch (e) {
    console.error('Error fetching Infobox links:', e);
  }
  return [];
}

// Grabs pages in a category to find sibling concepts.
export async function getWikipediaCategoryMembers(category: string, limit = 50): Promise<string[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:${encodeURIComponent(category)}&cmlimit=${limit}&cmtype=page&format=json&origin=*`;
    const res = await fetch(url, { headers: WIKIPEDIA_HEADERS });
    if (!res.ok) return [];
    const data = await res.json();
    const members = data?.query?.categorymembers;
    if (members) {
      return members.map((m: any) => m.title);
    }
  } catch (e) {
    console.error(`Error fetching category members for Category:${category}:`, e);
  }
  return [];
}
