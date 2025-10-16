import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectPlatform } from './platformDetection';

describe('platformDetection', () => {
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
  });

  afterEach(() => {
    // Restore original location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true
    });
  });

  const mockWindowLocation = (url: string) => {
    delete (window as any).location;
    window.location = { href: url } as Location;
  };

  describe('detectPlatform', () => {
    it('should detect Lovable platform and extract project ID', () => {
      // given a Lovable project URL
      mockWindowLocation('https://lovable.dev/projects/abc123');

      // when detecting platform
      const result = detectPlatform();

      // then should return Lovable platform details
      expect(result).not.toBeNull();
      expect(result?.platformName).toBe('Lovable');
      expect(result?.projectId).toBe('abc123');
      expect(result?.externalProjectUrl).toBe('https://lovable.dev/projects/abc123');
      expect(result?.guide).toBeDefined();
      expect(result?.guide.length).toBeGreaterThan(0);
    });

    it('should detect Lovable platform with query parameters', () => {
      // given a Lovable project URL with query params
      mockWindowLocation('https://lovable.dev/projects/abc123?tab=settings');

      // when detecting platform
      const result = detectPlatform();

      // then should return normalized URL without query params
      expect(result).not.toBeNull();
      expect(result?.platformName).toBe('Lovable');
      expect(result?.projectId).toBe('abc123');
      expect(result?.externalProjectUrl).toBe('https://lovable.dev/projects/abc123');
    });

    it('should detect Replit platform and extract project ID', () => {
      // given a Replit project URL
      mockWindowLocation('https://replit.com/@username/my-project');

      // when detecting platform
      const result = detectPlatform();

      // then should return Replit platform details
      expect(result).not.toBeNull();
      expect(result?.platformName).toBe('Replit');
      expect(result?.projectId).toBe('username/my-project');
      expect(result?.externalProjectUrl).toBe('https://replit.com/@username/my-project');
      expect(result?.guide).toBeDefined();
    });

    it('should detect Base44 platform and extract project ID', () => {
      // given a Base44 project URL
      mockWindowLocation('https://app.base44.com/apps/xyz789');

      // when detecting platform
      const result = detectPlatform();

      // then should return Base44 platform details
      expect(result).not.toBeNull();
      expect(result?.platformName).toBe('Base44');
      expect(result?.projectId).toBe('xyz789');
      expect(result?.externalProjectUrl).toBe('https://app.base44.com/apps/xyz789');
      expect(result?.guide).toBeDefined();
    });

    it('should detect Bolt.new platform and extract project ID', () => {
      // given a Bolt.new project URL
      mockWindowLocation('https://bolt.new/~/sb1-project123');

      // when detecting platform
      const result = detectPlatform();

      // then should return Bolt.new platform details
      expect(result).not.toBeNull();
      expect(result?.platformName).toBe('Bolt.new');
      expect(result?.projectId).toBe('sb1-project123');
      expect(result?.externalProjectUrl).toBe('https://bolt.new/~/sb1-project123');
      expect(result?.guide).toBeDefined();
    });

    it('should detect v0.dev platform and extract project ID', () => {
      // given a v0.app project URL
      mockWindowLocation('https://v0.app/chat/chat456');

      // when detecting platform
      const result = detectPlatform();

      // then should return v0.dev platform details
      expect(result).not.toBeNull();
      expect(result?.platformName).toBe('v0.dev');
      expect(result?.projectId).toBe('chat456');
      expect(result?.externalProjectUrl).toBe('https://v0.app/chat/chat456');
      expect(result?.guide).toBeDefined();
    });

    it('should return null for unsupported platform', () => {
      // given an unsupported platform URL
      mockWindowLocation('https://example.com/projects/123');

      // when detecting platform
      const result = detectPlatform();

      // then should return null
      expect(result).toBeNull();
    });

    it('should return null for invalid URL structure', () => {
      // given a URL from supported domain but invalid structure
      mockWindowLocation('https://lovable.dev/');

      // when detecting platform
      const result = detectPlatform();

      // then should return null
      expect(result).toBeNull();
    });

    it('should include guide slides for detected platform', () => {
      // given a Lovable project URL
      mockWindowLocation('https://lovable.dev/projects/abc123');

      // when detecting platform
      const result = detectPlatform();

      // then should include guide slides
      expect(result?.guide).toBeDefined();
      expect(result?.guide[0]).toHaveProperty('title');
      expect(result?.guide[0]).toHaveProperty('description');
      expect(result?.guide[0]).toHaveProperty('steps');
      expect(Array.isArray(result?.guide[0].steps)).toBe(true);
    });
  });
});
