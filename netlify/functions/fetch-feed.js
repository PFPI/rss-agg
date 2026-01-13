exports.handler = async function (event, context) {
  const { url } = event.queryStringParameters;

  if (!url) {
    return { statusCode: 400, body: "Missing URL parameter" };
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    const data = await response.text();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/xml",
        "Access-Control-Allow-Origin": "*", // Allow your Vue app to access this
      },
      body: data,
    };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};