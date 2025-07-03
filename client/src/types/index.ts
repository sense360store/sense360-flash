export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  prerelease: boolean;
  assets: GitHubAsset[];
}

export interface GitHubAsset {
  id: number;
  name: string;
  size: number;
  download_count: number;
  browser_download_url: string;
}

export interface ParsedFirmware {
  id: string;
  name: string;
  version: string;
  family: string;
  type: 'stable' | 'beta' | 'factory';
  downloadUrl: string;
  size: number;
  releaseDate: Date;
  description?: string;
  tagName: string;
}

export interface DeviceConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  device?: DeviceInfo;
  port?: SerialPort;
  error?: string;
}

export interface DeviceInfo {
  chipType: string;
  macAddress: string;
  flashSize: string;
  firmware?: string;
}

export interface FlashingState {
  isFlashing: boolean;
  progress: number;
  stage: 'idle' | 'connecting' | 'erasing' | 'writing' | 'verifying' | 'complete' | 'error';
  message: string;
}

export interface TerminalMessage {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
}

export interface AdminState {
  isAuthenticated: boolean;
  deviceMappings: DeviceMapping[];
}

export interface DeviceMapping {
  id: string;
  macAddress: string;
  deviceFamily: string;
  allowedVersions: string[];
  notes?: string;
}
