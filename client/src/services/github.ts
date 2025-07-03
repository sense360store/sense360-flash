import { GitHubRelease, ParsedFirmware } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';
const REPO_OWNER = 'sense360store';
const REPO_NAME = 'sense360-flash';

// Mock data for development when repository doesn't exist yet
const MOCK_RELEASES = [
  {
    id: 1,
    tag_name: 'v1.0.0',
    name: 'Sense360 Firmware v1.0.0',
    body: 'Enhanced Wi-Fi stability, improved sensor accuracy, and bug fixes.',
    published_at: '2024-03-15T10:30:00Z',
    prerelease: false,
    assets: [
      {
        id: 101,
        name: 'air_quality_monitor.v1.0.0.factory.bin',
        size: 1024000,
        download_count: 45,
        browser_download_url: 'https://github.com/sense360store/sense360-flash/releases/download/v1.0.0/air_quality_monitor.v1.0.0.factory.bin'
      },
      {
        id: 102,
        name: 'co2_monitor.v1.0.0.factory.bin',
        size: 1050000,
        download_count: 32,
        browser_download_url: 'https://github.com/sense360store/sense360-flash/releases/download/v1.0.0/co2_monitor.v1.0.0.factory.bin'
      }
    ]
  },
  {
    id: 2,
    tag_name: 'v1.1.0-beta',
    name: 'Sense360 Firmware v1.1.0-beta',
    body: 'New features: Bluetooth LE support, enhanced API endpoints (experimental).',
    published_at: '2024-03-20T14:15:00Z',
    prerelease: true,
    assets: [
      {
        id: 201,
        name: 'air_quality_monitor.v1.1.0.beta.bin',
        size: 1080000,
        download_count: 12,
        browser_download_url: 'https://github.com/sense360store/sense360-flash/releases/download/v1.1.0-beta/air_quality_monitor.v1.1.0.beta.bin'
      },
      {
        id: 202,
        name: 'sense360_v2.v2.0.0.beta.bin',
        size: 1200000,
        download_count: 8,
        browser_download_url: 'https://github.com/sense360store/sense360-flash/releases/download/v1.1.0-beta/sense360_v2.v2.0.0.beta.bin'
      }
    ]
  },
  {
    id: 3,
    tag_name: 'v1.2.0',
    name: 'Sense360 Firmware v1.2.0',
    body: 'Power consumption optimizations and OTA update improvements.',
    published_at: '2024-02-28T08:45:00Z',
    prerelease: false,
    assets: [
      {
        id: 301,
        name: 'co2_monitor.v1.2.0.factory.bin',
        size: 1065000,
        download_count: 78,
        browser_download_url: 'https://github.com/sense360store/sense360-flash/releases/download/v1.2.0/co2_monitor.v1.2.0.factory.bin'
      }
    ]
  }
];

export class GitHubService {
  private async fetchWithAuth(url: string): Promise<Response> {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
    };

    // Add GitHub token if available
    const token = import.meta.env.VITE_GITHUB_TOKEN;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return fetch(url, { headers });
  }

  async getReleases(): Promise<GitHubRelease[]> {
    try {
      const response = await this.fetchWithAuth(
        `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/releases`
      );

      if (!response.ok) {
        // If GitHub API fails (e.g., repository doesn't exist yet), fall back to mock data
        console.warn(`GitHub API error: ${response.status} ${response.statusText}. Using mock data for development.`);
        return MOCK_RELEASES;
      }

      return response.json();
    } catch (error) {
      // Network or other errors - use mock data for development
      console.warn('Failed to fetch releases from GitHub. Using mock data for development.', error);
      return MOCK_RELEASES as GitHubRelease[];
    }
  }

  parseFirmwareFromReleases(releases: GitHubRelease[]): ParsedFirmware[] {
    const firmwareList: ParsedFirmware[] = [];

    releases.forEach(release => {
      release.assets.forEach(asset => {
        if (asset.name.endsWith('.bin')) {
          const parsed = this.parseFirmwareName(asset.name);
          if (parsed) {
            firmwareList.push({
              id: `${release.id}-${asset.id}`,
              name: asset.name,
              version: parsed.version,
              family: parsed.family,
              type: parsed.type,
              downloadUrl: asset.browser_download_url,
              size: asset.size,
              releaseDate: new Date(release.published_at),
              description: release.body,
              tagName: release.tag_name,
            });
          }
        }
      });
    });

    return firmwareList.sort((a, b) => b.releaseDate.getTime() - a.releaseDate.getTime());
  }

  private parseFirmwareName(filename: string): {
    family: string;
    version: string;
    type: 'stable' | 'beta' | 'factory';
  } | null {
    // Parse filename format: {family}.{version}.{type}.bin
    // Example: air_quality_monitor.v1.0.0.factory.bin
    const match = filename.match(/^(.+)\.(v?\d+\.\d+\.\d+(?:-\w+)?)\.(factory|beta|stable)\.bin$/);
    
    if (!match) return null;

    const [, family, version, type] = match;
    
    // Determine type based on version and filename
    let firmwareType: 'stable' | 'beta' | 'factory' = 'stable';
    if (type === 'beta' || version.includes('-beta')) {
      firmwareType = 'beta';
    } else if (type === 'factory') {
      firmwareType = 'factory';
    }

    return {
      family,
      version,
      type: firmwareType,
    };
  }

  async downloadFirmware(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download firmware: ${response.status} ${response.statusText}`);
    }
    return response.arrayBuffer();
  }

  getFamilyDisplayName(family: string): string {
    const familyNames: Record<string, string> = {
      'air_quality_monitor': 'Air Quality Monitor',
      'co2_monitor': 'CO2 Monitor',
      'sense360_v2': 'Sense360 V2',
    };
    return familyNames[family] || family;
  }

  getTypeDisplayName(type: string): string {
    const typeNames: Record<string, string> = {
      'stable': 'Latest Stable',
      'beta': 'Beta Release',
      'factory': 'Factory',
    };
    return typeNames[type] || type;
  }

  getTypeBadgeColor(type: string): string {
    const colors: Record<string, string> = {
      'stable': 'bg-green-100 text-green-800',
      'beta': 'bg-blue-100 text-blue-800',
      'factory': 'bg-amber-100 text-amber-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  }
}

export const githubService = new GitHubService();
