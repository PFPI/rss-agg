import fetch from 'node-fetch';

export const handler = async function (event, context) {
  const apiKey = process.env.NYT_API_KEY;
  if (!apiKey) return { statusCode: 500, body: "Server missing NYT_API_KEY" };

  const query = 'forest endangered bioenergy logging "climate change"';
  const filter = `(desk:("Environment" "Science" "Climate" "U.S." "World" "Foreign" "Politics" "Washington" "Business" "Magazine" "Opinion") OR section.name:("Climate" "Environment" "Science" "U.S." "World")) AND NOT section.name:("Arts" "Music" "Movies" "Theater" "Style")`;

  const baseUrl = `https://api.nytimes.com/svc/search/v2/articlesearch.json?q=${encodeURIComponent(query)}&fq=${encodeURIComponent(filter)}&sort=newest&api-key=${apiKey}`;

  try {
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
      // --- FIXED IMAGE LOGIC ---
      let imageUrl = null;
      const mm = doc.multimedia;

      if (Array.isArray(mm)) {
        // SCENARIO A: It's an Array (Standard Documentation)
        // Look for 'xlarge' (often the main image) or 'thumbnail'
        const target = mm.find(m => m.subtype === 'xlarge') || 
                       mm.find(m => m.subtype === 'thumbnail') || 
                       mm[0]; // Fallback to first item
        
        if (target) imageUrl = target.url;

      } else if (mm && typeof mm === 'object') {
        // SCENARIO B: It's an Object (The payload you found)
        // Prioritize 'default' (larger), then 'thumbnail'
        if (mm.default?.url) {
          imageUrl = mm.default.url;
        } else if (mm.thumbnail?.url) {
          imageUrl = mm.thumbnail.url;
        }
      }

      // Final Cleanup: Ensure URL is absolute
      // Your payload showed full URLs, but standard API often returns partials (images/...)
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `https://static01.nyt.com/${imageUrl}`;
      }

      const deskName = doc.desk || doc.news_desk || doc.section_name || 'NYT';

      return {
        id: doc._id || doc.uri, 
        title: doc.headline?.main || "Untitled Article",
        link: doc.web_url,
        description: doc.snippet || "",
        pubDate: doc.pub_date,
        source: "New York Times",
        sourceUrl: "https://www.nytimes.com/section/climate",
        author: doc.byline?.original?.replace('By ', '') || deskName,
        image: imageUrl // logic was ok, but ensuring it is null if not found is safer
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