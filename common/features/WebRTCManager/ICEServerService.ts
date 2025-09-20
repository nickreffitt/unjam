import type { WebRTCError } from '@common/types';

export interface ICEServerConfig {
  iceServers: RTCIceServer[];
  error?: WebRTCError;
}

const METERED_CA_API_KEY = "e5ec91e096e1929045c176428e4833021910";

export class ICEServerService {
  private static readonly API_URL = 'https://unjam.metered.live/api/v1/turn/credentials';
  private static readonly FALLBACK_STUN_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.relay.metered.ca:80' },
  ];

  /**
   * Gets the API key from environment variables
   * This method can be mocked in tests
   */
  private static getAPIKey(): string | undefined {
    return METERED_CA_API_KEY;
  }

  /**
   * Fetches ICE servers including STUN and TURN servers from Metered.ca
   * @returns Promise with ICE server configuration
   */
  static async getICEServers(): Promise<ICEServerConfig> {
    try {
      const apiKey = this.getAPIKey();

      if (!apiKey) {
        console.warn('ICEServerService: No API key found, using fallback STUN servers');
        return {
          iceServers: this.FALLBACK_STUN_SERVERS,
          error: {
            type: 'configuration',
            message: 'API key not configured, using fallback STUN servers',
          },
        };
      }

      console.debug('ICEServerService: Fetching TURN credentials from Metered.ca');

      const response = await fetch(`${this.API_URL}?apiKey=${apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const turnServers = await response.json();

      // Combine STUN servers with TURN servers from API
      const iceServers: RTCIceServer[] = [
        ...this.FALLBACK_STUN_SERVERS,
        ...turnServers,
      ];

      console.debug('ICEServerService: Successfully fetched ICE servers', {
        stunServers: this.FALLBACK_STUN_SERVERS.length,
        turnServers: turnServers.length,
        total: iceServers.length,
      });

      return { iceServers };

    } catch (error) {
      console.error('ICEServerService: Failed to fetch TURN servers, using fallback STUN servers', error);

      return {
        iceServers: this.FALLBACK_STUN_SERVERS,
        error: {
          type: 'configuration',
          message: 'Failed to fetch TURN servers, using fallback STUN servers',
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