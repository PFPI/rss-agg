import fetch from 'node-fetch';

export const handler = async function (event, context) {
  const apiKey = process.env.GUARDIAN_API_KEY;
  
  if (!apiKey) {
    return { statusCode: 500, body: "Server missing GUARDIAN_API_KEY" };
  }

  // We request the 'environment' section specifically
  // show-fields=all gives us the trail text (summary) and thumbnail
  const apiUrl = `https://content.guardianapis.com/search?section=environment&show-fields=trailText,thumbnail,byline&page-size=20&api-key=${apiKey}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Guardian API Error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Transform to your app's standard format
    const items = data.response.results.map(article => ({
        id: article.id,
      title: article.webTitle,
      link: article.webUrl,
      // Use trailText (short summary) or fallback to blank
      description: article.fields?.trailText || "", 
      pubDate: article.webPublicationDate,
      source: "The Guardian",
      sourceUrl: "https://www.theguardian.com/us/environment",
      author: article.fields?.byline,
      // Optional: You could add a thumbnail image here if your UI supported it
      // image: article.fields?.thumbnail 
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items),
    };

  } catch (error) {
    console.error("Guardian fetch error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};