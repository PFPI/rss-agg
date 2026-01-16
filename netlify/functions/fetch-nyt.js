import fetch from 'node-fetch';

export const handler = async function (event, context) {
  const apiKey = process.env.NYT_API_KEY;
  if (!apiKey) return { statusCode: 500, body: "Server missing NYT_API_KEY" };

  // 1. TOPIC KEYWORDS
  const query = 'forest endangered bioenergy logging "climate change"';

  // 2. BROAD DESK WHITELIST (Updated for new API Spec)
  // The YAML spec says the field is now 'desk', NOT 'news_desk'.
  // We also check 'section.name' as a backup.
  // This explicitly EXCLUDES: "Games", "Crosswords", "Style", "Real Estate"
const filter = `(desk:("Environment" "Science" "Climate" "U.S." "World" "Foreign" "Politics" "Washington" "Business" "Magazine" "Opinion") OR section.name:("Climate" "Environment" "Science" "U.S." "World")) AND NOT section.name:("Arts" "Music" "Movies" "Theater" "Style")`;

  // Note: The 'fl' parameter is removed as the spec says it is no longer supported.
  const baseUrl = `https://api.nytimes.com/svc/search/v2/articlesearch.json?q=${encodeURIComponent(query)}&fq=${encodeURIComponent(filter)}&sort=newest&api-key=${apiKey}`;

  try {
    // Fetch 2 pages (20 articles)
    const [res0, res1] = await Promise.all([
      fetch(`${baseUrl}&page=0`),
      fetch(`${baseUrl}&page=1`)
    ]);

    const data0 = await res0.json();
    const data1 = await res1.json();

    const docs = [
      ...(data0?.response?.docs || []), 
      ...(data1?.response?.docs || [])
    ];

    const items = docs.map(doc => {
      // Defensive Image Check (Handling the "simplified" multimedia structure)
      // The spec says the array now only contains two crops. We grab the first available URL.
      const media = Array.isArray(doc.multimedia) ? doc.multimedia : [];
      
      // Try to find the specific crops, or just fall back to the first item if structure changed
      const imageMedia = media.find(m => m.subtype === 'xlarge') || 
                         media.find(m => m.subtype === 'thumbnail') ||
                         media[0]; // Fallback
      
      const imageUrl = imageMedia?.url 
        ? (imageMedia.url.startsWith('http') ? imageMedia.url : `https://static01.nyt.com/${imageMedia.url}`) 
        : null;

      // The YAML says the response field is 'desk', but sometimes JSON returns 'news_desk' 
      // even if the filter uses 'desk'. We check both to be safe for the "Author" display.
      const deskName = doc.desk || doc.news_desk || doc.section_name || 'NYT';

      return {
        id: doc._id || doc.uri, // Fallback to URI if _id is missing
        title: doc.headline?.main || "Untitled Article",
        link: doc.web_url,
        description: doc.snippet || "",
        pubDate: doc.pub_date,
        source: "New York Times",
        sourceUrl: "https://www.nytimes.com/section/climate",
        author: doc.byline?.original?.replace('By ', '') || deskName,
        image: imageUrl
      };
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(items),
    };

  } catch (error) {
    console.error("NYT Fetch Failed:", error);
    return { statusCode: 200, body: JSON.stringify([]) };
  }
};