// Web Serial API Types
declare global {
  interface Navigator {
    serial: Serial;
  }
}

interface Serial extends EventTarget {
  requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
}

interface SerialPortRequestOptions {
  filters?: SerialPortFilter[];
}

interface SerialPortFilter {
  usbVendorId?: number;
  usbProductId?: number;
}

interface SerialPort extends EventTarget {
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
  getInfo(): SerialPortInfo;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
}

interface SerialOptions {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: 'none' | 'even' | 'odd';
  bufferSize?: number;
  flowControl?: 'none' | 'hardware';
}

interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

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
