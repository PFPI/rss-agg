import fetch from 'node-fetch';

export const handler = async function (event, context) {
  // 1. Parse Input
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { text, linkData } = JSON.parse(event.body);
  
  // 2. Validate Env Vars
  const { BLUESKY_IDENTIFIER, BLUESKY_PASSWORD } = process.env;
  if (!BLUESKY_IDENTIFIER || !BLUESKY_PASSWORD) {
    return { statusCode: 500, body: 'Missing BlueSky credentials in environment variables.' };
  }

  try {
    // 3. Authenticate (Create Session)
    const sessionResp = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: BLUESKY_IDENTIFIER, password: BLUESKY_PASSWORD }),
    });

    if (!sessionResp.ok) {
      throw new Error(`Auth failed: ${sessionResp.statusText}`);
    }

    const session = await sessionResp.json();
    const { accessJwt, did } = session;

    // 4. Construct the Record
    const now = new Date().toISOString();
    const postRecord = {
      $type: 'app.bsky.feed.post',
      text: text,
      createdAt: now,
    };

    // Add Link Embed (Card) if linkData is present
    if (linkData && linkData.url) {
      postRecord.embed = {
        $type: 'app.bsky.embed.external',
        external: {
          uri: linkData.url,
          title: linkData.title || 'No Title',
          description: linkData.description || '',
        },
      };
    }

    // 5. Create Record
    const postResp = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessJwt}`,
      },
      body: JSON.stringify({
        repo: did,
        collection: 'app.bsky.feed.post',
        record: postRecord,
      }),
    });

    if (!postResp.ok) {
      const errText = await postResp.text();
      throw new Error(`Post failed: ${errText}`);
    }

    const result = await postResp.json();

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, uri: result.uri, cid: result.cid }),
    };

  } catch (error) {
    console.error('BlueSky Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};