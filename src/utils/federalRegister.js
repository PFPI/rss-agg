// Helper to get today's date in YYYY-MM-DD
const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};

export const isFederalRegisterUrl = (url) => {
  return url.includes('federalregister.gov') && !url.includes('.rss');
};

export const fetchFederalRegisterDocs = async (searchUrl) => {
  try {
    const inputUrl = new URL(searchUrl);
    
    // 1. EXTRACT safe params only (Whitelist approach)
    const term = inputUrl.searchParams.get('conditions[term]');
    const agencies = inputUrl.searchParams.getAll('conditions[agencies][]');

    // 2. BUILD the fresh API URL
    const apiUrl = new URL('https://www.federalregister.gov/api/v1/documents.json');
    
    if (term) apiUrl.searchParams.set('conditions[term]', term);
    agencies.forEach(agency => {
      apiUrl.searchParams.append('conditions[agencies][]', agency);
    });

    // 3. THE FIX: Filter by Date, NOT by the "accepting_comments" flag.
    // We ask for comments closing Today or in the Future.
    apiUrl.searchParams.set('conditions[comment_date][gte]', getTodayString());
    
    // Sort by the deadline
    apiUrl.searchParams.set('order', 'comment_date'); 

    // 4. FETCH
    const response = await fetch(apiUrl.toString());
    
    if (!response.ok) {
      console.warn(`FR API Error: ${response.status}`);
      return []; 
    }
    
    const data = await response.json();

    if (!data || !data.results) return [];

    return data.results.map(doc => ({
      title: doc.title,
      link: doc.html_url,
      description: doc.abstract || doc.excerpt,
      pubDate: doc.publication_date,
      source: 'Federal Register',
      sourceUrl: searchUrl,
      dueDate: doc.comment_date, 
      agency: doc.agencies?.map(a => a.name).join(', '),
      isOfficial: true 
    }));

  } catch (error) {
    console.error("Critical Failure fetching Federal Register:", error);
    return [];
  }
};