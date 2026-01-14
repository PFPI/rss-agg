// netlify/functions/summarize.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async function (event, context) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { text, title } = JSON.parse(event.body);

    if (!text && !title) {
      return { statusCode: 400, body: "Missing text or title" };
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // The Prompt
    const prompt = `
      You are a policy analyst for an environmental advocacy group.
      Analyze the following article title and text (if available).
      
      Title: "${title}"
      Text/Snippet: "${text}"

      Please provide:
      1. A 1-sentence summary of the core news.
      2. A "Relevance Rating" for environmental advocacy (Low/Medium/High).
      3. A draft tweet (max 280 chars) sharing this news.

      Return the response as JSON in this format:
      {
        "summary": "...",
        "relevance": "...",
        "tweet": "..."
      }
    `;

    // Ask Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // Clean up the response (sometimes it includes ```json markers)
    let jsonText = response.text().replace(/```json/g, '').replace(/```/g, '').trim();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: jsonText,
    };

  } catch (error) {
    console.error("AI Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate summary" }),
    };
  }
};