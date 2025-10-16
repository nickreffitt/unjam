import { type GuideSlide } from '@common/types';
import { PLATFORM_GUIDES } from '../config/platformGuides';

export interface DetectedPlatform {
  platformName: string;
  projectId: string;
  externalProjectUrl: string; // Normalized URL for DB storage
  guide: GuideSlide[];
}

export function detectPlatform(): DetectedPlatform | null {
  const currentUrl = window.location.href;

  for (const platformGuide of PLATFORM_GUIDES) {
    if (platformGuide.urlPattern.test(currentUrl)) {
      const projectId = platformGuide.extractProjectId(currentUrl);

      if (projectId) {
        return {
          platformName: platformGuide.platformName,
          projectId,
          externalProjectUrl: normalizeExternalUrl(currentUrl, platformGuide.urlPattern),
          guide: platformGuide.slides
        };
      }
    }
  }
  return null;
}

function normalizeExternalUrl(url: string, pattern: RegExp): string {
  const match = url.match(pattern);
  return match ? match[0] : url; // Base URL without query params
}
