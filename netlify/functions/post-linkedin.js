import fetch from 'node-fetch';

export const handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { text, linkData } = JSON.parse(event.body);
  
  // 1. Env Vars
  const { LINKEDIN_ACCESS_TOKEN, LINKEDIN_AUTHOR_URN } = process.env;
  
  if (!LINKEDIN_ACCESS_TOKEN || !LINKEDIN_AUTHOR_URN) {
    return { statusCode: 500, body: 'Missing LinkedIn credentials.' };
  }

  // 2. Construct Payload (LinkedIn "UGC" Post)
  const payload = {
    author: LINKEDIN_AUTHOR_URN,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: text
        },
        shareMediaCategory: linkData && linkData.url ? "ARTICLE" : "NONE",
        media: linkData && linkData.url ? [
          {
            status: "READY",
            description: { text: linkData.description || "" },
            originalUrl: linkData.url,
            title: { text: linkData.title || "Shared Article" }
          }
        ] : undefined
      }
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  };

  try {
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LinkedIn Error: ${response.statusText} - ${errText}`);
    }

    const result = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, id: result.id }),
    };

  } catch (error) {
    console.error('LinkedIn Post Failed:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};