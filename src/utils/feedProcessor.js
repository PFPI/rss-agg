// src/utils/feedProcessor.js

export const parseXML = (xmlText, sourceUrl) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  const items = xmlDoc.querySelectorAll("item");
  const channelTitle = xmlDoc.querySelector("channel > title")?.textContent || sourceUrl;

  return Array.from(items).map(item => {
    // 1. Check <enclosure> (Standard RSS)
    let imageUrl = item.querySelector("enclosure[type^='image']")?.getAttribute("url");

    // 2. Check <media:content> (Common extension)
    if (!imageUrl) {
      // Note: querySelector with namespaces can be tricky, so we check standard variations
      const media = item.getElementsByTagNameNS("*", "content");
      if (media.length > 0) {
        imageUrl = media[0].getAttribute("url");
      }
    }

    // 3. Fallback: Try to grab the first <img> tag from the description
    const description = item.querySelector("description")?.textContent || "";
    if (!imageUrl && description) {
      const imgMatch = description.match(/src="([^"]+)"/);
      if (imgMatch) {
        imageUrl = imgMatch[1];
      }
    }

    return {
      title: item.querySelector("title")?.textContent || "No Title",
      link: item.querySelector("link")?.textContent,
      pubDate: new Date(item.querySelector("pubDate")?.textContent),
      description: description.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...',
      source: channelTitle,
      sourceUrl: sourceUrl,
      id: item.querySelector("guid")?.textContent || item.querySelector("link")?.textContent,
      image: imageUrl // <--- Now we have an image!
    };
  });
};

export const autoCategorize = (items, categories) => {
  if (!categories || !categories.length) return items;

  return items.map(item => {
    const itemText = (item.title + ' ' + item.description).toLowerCase();
    
    const matchedCats = categories
      .filter(cat => cat.keywords.some(k => itemText.includes(k.toLowerCase())))
      .map(cat => cat.name);
    
    return { ...item, categories: matchedCats };
  });
};