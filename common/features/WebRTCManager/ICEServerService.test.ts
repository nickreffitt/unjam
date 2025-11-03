import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ICEServerService } from './ICEServerService';
import type { ApiManager } from '@common/features/ApiManager';

describe('ICEServerService', () => {
  let mockApiManager: ApiManager;
  let iceServerService: ICEServerService;

  beforeEach(() => {
    // Create mock ApiManager
    mockApiManager = {
      getICEServers: vi.fn(),
    } as unknown as ApiManager;

    // Create ICEServerService instance with mock
    iceServerService = new ICEServerService(mockApiManager);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should require apiManager parameter', () => {
      // when creating without apiManager
      // then should throw error
      expect(() => new ICEServerService(null as any)).toThrow('ICEServerService: apiManager is required');
    });

    it('should initialize with valid apiManager', () => {
      // when creating with valid apiManager
      const service = new ICEServerService(mockApiManager);

      // then should create instance successfully
      expect(service).toBeInstanceOf(ICEServerService);
    });
  });

  describe('getICEServers', () => {
    it('should return STUN and TURN servers when API call succeeds', async () => {
      // given successful API response with TURN servers
      const mockTurnServers = [
        {
          urls: 'turn:standard.relay.metered.ca:80',
          username: 'test-username',
          credential: 'test-credential',
        },
      ];

      const mockResponse = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun.relay.metered.ca:80' },
          ...mockTurnServers,
        ],
      };

      vi.mocked(mockApiManager.getICEServers).mockResolvedValueOnce(mockResponse);

      // when getting ICE servers
      const result = await iceServerService.getICEServers();

      // then should return ICE servers from API
      expect(result.error).toBeUndefined();
      expect(result.iceServers).toEqual(mockResponse.iceServers);
      expect(mockApiManager.getICEServers).toHaveBeenCalledTimes(1);
    });

    it('should return fallback STUN servers when API call fails', async () => {
      // given API call fails
      vi.mocked(mockApiManager.getICEServers).mockRejectedValueOnce(new Error('API error'));

      // when getting ICE servers
      const result = await iceServerService.getICEServers();

      // then should return fallback STUN servers with error
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBe('configuration');
      expect(result.error!.message).toContain('Failed to fetch ICE servers');
      expect(result.error!.details).toBe('API error');
      expect(result.iceServers).toEqual(ICEServerService.getFallbackSTUNServers().iceServers);
    });

    it('should return fallback STUN servers when API throws exception', async () => {
      // given API throws an error
      vi.mocked(mockApiManager.getICEServers).mockRejectedValueOnce(new Error('Network error'));

      // when getting ICE servers
      const result = await iceServerService.getICEServers();

      // then should return fallback STUN servers with error
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBe('configuration');
      expect(result.error!.details).toBe('Network error');
      expect(result.iceServers).toEqual(ICEServerService.getFallbackSTUNServers().iceServers);
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
