import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ICEServerService } from './ICEServerService';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ICEServerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getICEServers', () => {
    it('should return STUN and TURN servers when API call succeeds', async () => {
      // given successful API response and API key available
      const getAPIKeySpy = vi.spyOn(ICEServerService as any, 'getAPIKey').mockReturnValue('test-api-key');

      const mockTurnServers = [
        {
          urls: 'turn:standard.relay.metered.ca:80',
          username: 'test-username',
          credential: 'test-credential',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTurnServers,
      });

      // when getting ICE servers
      const result = await ICEServerService.getICEServers();

      // then should return combined STUN and TURN servers
      expect(result.error).toBeUndefined();
      expect(result.iceServers).toEqual(
        expect.arrayContaining([
          ...ICEServerService.getFallbackSTUNServers().iceServers,
          ...mockTurnServers,
        ])
      );
      expect(mockFetch).toHaveBeenCalledWith(
        'https://unjam.metered.live/api/v1/turn/credentials?apiKey=test-api-key',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      getAPIKeySpy.mockRestore();
    });

    it('should return fallback STUN servers when API key is missing', async () => {
      // given missing API key
      const getAPIKeySpy = vi.spyOn(ICEServerService as any, 'getAPIKey').mockReturnValue(undefined);

      // when getting ICE servers
      const result = await ICEServerService.getICEServers();

      // then should return fallback STUN servers with warning
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBe('configuration');
      expect(result.error!.message).toContain('API key not configured');
      expect(result.iceServers).toEqual(ICEServerService.getFallbackSTUNServers().iceServers);
      expect(mockFetch).not.toHaveBeenCalled();

      getAPIKeySpy.mockRestore();
    });

    it('should return fallback STUN servers when API call fails', async () => {
      // given failed API response
      const getAPIKeySpy = vi.spyOn(ICEServerService as any, 'getAPIKey').mockReturnValue('test-api-key');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      // when getting ICE servers
      const result = await ICEServerService.getICEServers();

      // then should return fallback STUN servers with error
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBe('configuration');
      expect(result.error!.message).toContain('Failed to fetch TURN servers');
      expect(result.iceServers).toEqual(ICEServerService.getFallbackSTUNServers().iceServers);

      getAPIKeySpy.mockRestore();
    });

    it('should return fallback STUN servers when fetch throws exception', async () => {
      // given fetch throws an error
      const getAPIKeySpy = vi.spyOn(ICEServerService as any, 'getAPIKey').mockReturnValue('test-api-key');
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // when getting ICE servers
      const result = await ICEServerService.getICEServers();

      // then should return fallback STUN servers with error
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBe('configuration');
      expect(result.error!.details).toBe('Network error');
      expect(result.iceServers).toEqual(ICEServerService.getFallbackSTUNServers().iceServers);

      getAPIKeySpy.mockRestore();
    });
  });

  describe('getFallbackSTUNServers', () => {
    it('should return valid STUN server configuration', () => {
      // when getting fallback STUN servers
      const result = ICEServerService.getFallbackSTUNServers();

      // then should return valid configuration
      expect(result.error).toBeUndefined();
      expect(result.iceServers).toEqual(
        expect.arrayContaining([
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun.relay.metered.ca:80' },
        ])
      );
      expect(result.iceServers.length).toBeGreaterThan(0);
    });
  });

  describe('validateICEServers', () => {
    it('should return true for valid ICE server configuration', () => {
      // given valid ICE servers
      const validServers = [
        { urls: 'stun:stun.example.com:19302' },
        { urls: 'turn:turn.example.com:3478', username: 'user', credential: 'pass' },
        { urls: 'turns:turn.example.com:5349', username: 'user', credential: 'pass' },
      ];

      // when validating
      const result = ICEServerService.validateICEServers(validServers);

      // then should return true
      expect(result).toBe(true);
    });

    it('should return true for ICE servers with URL arrays', () => {
      // given ICE servers with URL arrays
      const validServers = [
        { urls: ['stun:stun1.example.com:19302', 'stun:stun2.example.com:19302'] },
        { urls: ['turn:turn.example.com:3478'], username: 'user', credential: 'pass' },
      ];

      // when validating
      const result = ICEServerService.validateICEServers(validServers);

      // then should return true
      expect(result).toBe(true);
    });

    it('should return false for empty array', () => {
      // given empty array
      const emptyServers: RTCIceServer[] = [];

      // when validating
      const result = ICEServerService.validateICEServers(emptyServers);

      // then should return false
      expect(result).toBe(false);
    });

    it('should return false for non-array input', () => {
      // when validating non-array
      const result = ICEServerService.validateICEServers(null as any);

      // then should return false
      expect(result).toBe(false);
    });

    it('should return false for servers without urls', () => {
      // given servers without urls
      const invalidServers = [
        { username: 'user', credential: 'pass' } as any,
      ];

      // when validating
      const result = ICEServerService.validateICEServers(invalidServers);

      // then should return false
      expect(result).toBe(false);
    });

    it('should return false for servers with invalid URL protocols', () => {
      // given servers with invalid URLs
      const invalidServers = [
        { urls: 'http://example.com' },
        { urls: 'invalid:protocol' },
      ];

      // when validating
      const result = ICEServerService.validateICEServers(invalidServers);

      // then should return false
      expect(result).toBe(false);
    });
  });

  describe('createPeerConnectionConfig', () => {
    it('should create valid RTCConfiguration', () => {
      // given ICE servers
      const iceServers = [
        { urls: 'stun:stun.example.com:19302' },
        { urls: 'turn:turn.example.com:3478', username: 'user', credential: 'pass' },
      ];

      // when creating peer connection config
      const config = ICEServerService.createPeerConnectionConfig(iceServers);

      // then should return valid RTCConfiguration
      expect(config).toEqual({
        iceServers,
        iceCandidatePoolSize: 10,
        iceTransportPolicy: 'all',
        bundlePolicy: 'balanced',
        rtcpMuxPolicy: 'require',
      });
    });

    it('should handle empty ICE servers array', () => {
      // given empty ICE servers
      const iceServers: RTCIceServer[] = [];

      // when creating peer connection config
      const config = ICEServerService.createPeerConnectionConfig(iceServers);

      // then should still return valid configuration
      expect(config.iceServers).toEqual([]);
      expect(config.iceCandidatePoolSize).toBe(10);
    });
  });
});