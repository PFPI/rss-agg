import { describe, it, expect } from 'vitest';
import { parseXML, autoCategorize } from '../feedProcessor';

describe('Feed Processor', () => {
  
  // Test 1: XML Parsing
  it('parses valid RSS XML correctly', () => {
    const mockXML = `
      <rss>
        <channel>
          <title>Forest Service Updates</title>
          <item>
            <title>New Regulation on Logging</title>
            <link>http://example.com/log</link>
            <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
            <description>A summary of the new logging rules.</description>
            <guid>12345</guid>
          </item>
        </channel>
      </rss>
    `;

    const result = parseXML(mockXML, 'http://test.com/rss');
    
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('New Regulation on Logging');
    expect(result[0].source).toBe('Forest Service Updates');
    expect(result[0].sourceUrl).toBe('http://test.com/rss');
  });

  it('handles empty or broken XML gracefully', () => {
    const result = parseXML('<broken>', 'http://test.com');
    // It should return empty array, not crash
    expect(result).toEqual([]);
  });

  // Test 2: Categorization Logic
  it('auto-categorizes items based on keywords', () => {
    const items = [
      { title: 'Forest Fire Updates', description: 'Trees are burning', categories: [] },
      { title: 'Ocean Tides', description: 'Water levels rising', categories: [] }
    ];

    const categories = [
      { name: 'Forestry', keywords: ['forest', 'tree'] },
      { name: 'Water', keywords: ['ocean'] }
    ];

    const tagged = autoCategorize(items, categories);

    expect(tagged[0].categories).toContain('Forestry');
    expect(tagged[1].categories).toContain('Water');
    // Ensure "Forestry" didn't accidentally get applied to the water item
    expect(tagged[0].categories).not.toContain('Water');
  });

  it('is case insensitive', () => {
    const items = [{ title: 'FOREST MANAGEMENT', description: '', categories: [] }];
    const categories = [{ name: 'Forestry', keywords: ['forest'] }];
    
    const tagged = autoCategorize(items, categories);
    expect(tagged[0].categories).toContain('Forestry');
  });
});