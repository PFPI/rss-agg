import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isFederalRegisterUrl, fetchFederalRegisterDocs } from '../federalRegister';

// Mock the global fetch function
global.fetch = vi.fn();

describe('Federal Register Utils', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isFederalRegisterUrl', () => {
    it('identifies valid FR URLs', () => {
      expect(isFederalRegisterUrl('https://www.federalregister.gov/documents/2023/01/01/123')).toBe(true);
    });

    it('rejects other URLs', () => {
      expect(isFederalRegisterUrl('https://google.com')).toBe(false);
      expect(isFederalRegisterUrl('https://nytimes.com/section/climate')).toBe(false);
    });
  });

  describe('fetchFederalRegisterDocs', () => {
    it('fetches and maps API data correctly', async () => {
      // 1. Mock the API Response
      const mockResponse = {
        results: [
          {
            title: 'Test Rule',
            abstract: 'A test summary',
            html_url: 'https://federalregister.gov/d/123',
            publication_date: '2025-01-01',
            agencies: [{ raw_name: 'EPA' }],
            document_number: '123-456'
          }
        ]
      };

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      // 2. Call the function
      const items = await fetchFederalRegisterDocs('https://www.federalregister.gov/some-search');

      // 3. Assertions
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({
        id: '123-456',
        title: 'Test Rule',
        description: 'A test summary',
        link: 'https://federalregister.gov/d/123',
        pubDate: '2025-01-01',
        source: 'Federal Register',
        sourceUrl: 'https://www.federalregister.gov/some-search',
        agency: 'EPA',
        isOfficial: true,
        dueDate: undefined // or date if mocked
      });
    });

    it('returns empty array on API failure', async () => {
      fetch.mockResolvedValue({ ok: false });
      const items = await fetchFederalRegisterDocs('https://bad-url.com');
      expect(items).toEqual([]);
    });
  });
});