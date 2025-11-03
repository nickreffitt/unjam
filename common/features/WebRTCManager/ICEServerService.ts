import type { WebRTCError } from '@common/types';
import type { ApiManager } from '@common/features/ApiManager';

export interface ICEServerConfig {
  iceServers: RTCIceServer[];
  error?: WebRTCError;
}

export class ICEServerService {
  private apiManager: ApiManager;
  private static readonly FALLBACK_STUN_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.relay.metered.ca:80' },
  ];

  constructor(apiManager: ApiManager) {
    if (!apiManager) {
      throw new Error('ICEServerService: apiManager is required');
    }
    this.apiManager = apiManager;
  }

  /**
   * Fetches ICE servers including STUN and TURN servers from edge function
   * @returns Promise with ICE server configuration
   */
  async getICEServers(): Promise<ICEServerConfig> {
    try {
      console.debug('ICEServerService: Fetching ICE servers from edge function');

      const response = await this.apiManager.getICEServers();

      console.debug('ICEServerService: Successfully fetched ICE servers', {
        total: response.iceServers.length,
      });

      return { iceServers: response.iceServers };

    } catch (error) {
      console.error('ICEServerService: Failed to fetch ICE servers, using fallback STUN servers', error);

      return {
        iceServers: ICEServerService.FALLBACK_STUN_SERVERS,
        error: {
          type: 'configuration',
          message: 'Failed to fetch ICE servers, using fallback STUN servers',
          details: error instanceof Error ? error.message : error,
        },
      };
    }
  }

  /**
   * Gets basic STUN servers for testing/fallback
   * @returns Basic STUN server configuration
   */
  static getFallbackSTUNServers(): ICEServerConfig {
    return {
      iceServers: this.FALLBACK_STUN_SERVERS,
    };
  }

  /**
   * Validates ICE server configuration
   * @param iceServers - ICE servers to validate
   * @returns True if configuration is valid
   */
  static validateICEServers(iceServers: RTCIceServer[]): boolean {
    if (!Array.isArray(iceServers) || iceServers.length === 0) {
      return false;
    }

    return iceServers.every(server => {
      // Check if server has urls property
      if (!server.urls) {
        return false;
      }

      // Handle both string and array formats
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];

      // Check if all URLs are valid
      return urls.every(url => {
        return typeof url === 'string' &&
               (url.startsWith('stun:') || url.startsWith('turn:') || url.startsWith('turns:'));
      });
    });
  }

  /**
   * Creates RTCPeerConnection configuration with ICE servers
   * @param iceServers - ICE servers to use
   * @returns RTCConfiguration object
   */
  static createPeerConnectionConfig(iceServers: RTCIceServer[]): RTCConfiguration {
    return {
      iceServers,
      iceCandidatePoolSize: 10,
      iceTransportPolicy: 'all',
      bundlePolicy: 'balanced',
      rtcpMuxPolicy: 'require',
    };
  }
}