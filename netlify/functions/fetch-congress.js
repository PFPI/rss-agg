import fetch from 'node-fetch';

export const handler = async function (event, context) {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) return { statusCode: 500, body: "Server missing CONGRESS_API_KEY" };

  // 1. Fetch the latest 250 bills (Max limit to increase odds of finding matches)
  const baseUrl = `https://api.congress.gov/v3/bill?api_key=${apiKey}&format=json&limit=100&sort=updateDate+desc`;

  // 2. Define "PFPI" relevant keywords to filter the noise
  const KEYWORDS = [
    'biomass', 'bioenergy', 'forest', 'logging', 'timber', 
    'wood', 'carbon', 'climate', 'renewable', 'energy', 
    'pollution', 'environment', 'emissions'
  ];

  try {
    const response = await fetch(baseUrl);
    const data = await response.json();

    if (!data.bills) return { statusCode: 200, body: JSON.stringify([]) };

    // 3. Filter and Map
    const relevantBills = data.bills.filter(bill => {
      const text = (bill.title + ' ' + (bill.latestAction?.text || '')).toLowerCase();
      return KEYWORDS.some(k => text.includes(k));
    }).map(bill => {
      
      // Helper: Construct the official Congress.gov URL
      // API types: "HR", "S", "HRES", "SRES", etc.
      let typeSlug = 'house-bill';
      if (bill.type === 'S') typeSlug = 'senate-bill';
      else if (bill.type === 'HRES') typeSlug = 'house-resolution';
      else if (bill.type === 'SRES') typeSlug = 'senate-resolution';
      else if (bill.type === 'HJRES') typeSlug = 'house-joint-resolution';
      else if (bill.type === 'SJRES') typeSlug = 'senate-joint-resolution';
      // ... (Edge cases default to house-bill or can be added)

      const webUrl = `https://www.congress.gov/bill/${bill.congress}th-congress/${typeSlug}/${bill.number}`;

      return {
        id: `congress-${bill.type}${bill.number}`,
        title: `${bill.type}${bill.number}: ${bill.title}`,
        link: webUrl,
        // Use the latest action as the description (e.g. "Referred to Committee...")
        description: `Latest Action: ${bill.latestAction?.text || 'No recent action'}`,
        pubDate: bill.updateDate || bill.latestAction?.actionDate,
        source: "US Congress",
        sourceUrl: "https://www.congress.gov/search?q=%7B%22source%22%3A%22legislation%22%7D",
        author: `Congress (${bill.originChamber})`,
        isOfficial: true // Adds the blue border in your UI
      };
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(relevantBills),
    };

  } catch (error) {
    console.error("Congress Fetch Failed:", error);
    return { statusCode: 200, body: JSON.stringify([]) };
  }
};