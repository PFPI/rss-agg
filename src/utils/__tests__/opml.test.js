import { describe, it, expect } from 'vitest';
import { parseOPML } from '../opml';

describe('OPML Utility', () => {
  it('extracts URLs from valid OPML', () => {
    const xml = `
      <opml version="1.0">
        <body>
          <outline text="Tech" title="Tech">
            <outline type="rss" text="Feed 1" xmlUrl="http://feed1.com/rss"/>
          </outline>
          <outline type="rss" text="Feed 2" xmlUrl="http://feed2.com/rss"/>
        </body>
      </opml>
    `;
    
    const urls = parseOPML(xml);
    expect(urls).toHaveLength(2);
    expect(urls).toContain('http://feed1.com/rss');
    expect(urls).toContain('http://feed2.com/rss');
  });

  it('deduplicates URLs', () => {
    const xml = `
      <opml>
        <body>
          <outline xmlUrl="http://same.com/rss"/>
          <outline xmlUrl="http://same.com/rss"/>
        </body>
      </opml>
    `;
    const urls = parseOPML(xml);
    expect(urls).toHaveLength(1);
  });
});