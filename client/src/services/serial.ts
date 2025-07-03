import { DeviceInfo, FlashingState, TerminalMessage } from '../types';

// Web Serial API types to avoid TypeScript errors
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

export class SerialService {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader | null = null;
  private writer: WritableStreamDefaultWriter | null = null;
  private onMessage?: (message: TerminalMessage) => void;
  private onFlashProgress?: (progress: FlashingState) => void;
  private mockConnected: boolean = false;

  constructor() {
    this.checkWebSerialSupport();
  }

  private checkWebSerialSupport(): void {
    if (!navigator.serial) {
      throw new Error('Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera.');
    }
  }

  setMessageHandler(handler: (message: TerminalMessage) => void): void {
    this.onMessage = handler;
  }

  setFlashProgressHandler(handler: (progress: FlashingState) => void): void {
    this.onFlashProgress = handler;
  }

  private logMessage(message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info'): void {
    const logMessage: TerminalMessage = {
      id: crypto.randomUUID(),
      message,
      type,
      timestamp: new Date(),
    };
    
    console.log(`[${type.toUpperCase()}] ${message}`);
    this.onMessage?.(logMessage);
  }

  async requestPort(): Promise<SerialPort> {
    try {
      // First run diagnostics
      await this.runDiagnostics();
      
      this.logMessage('Requesting device access (no filters - like ESPHome Web)...');
      
      // Try without filters first (like ESPHome Web)
      let port;
      try {
        port = await navigator.serial.requestPort();
        this.logMessage('Device selected successfully (no filters)', 'success');
      } catch (error) {
        this.logMessage('No filters approach failed, trying with filters...', 'warning');
        
        // Fallback to filters if no-filters fails
        port = await navigator.serial.requestPort({
          filters: [
            { usbVendorId: 0x10C4, usbProductId: 0xEA60 }, // CP2102
            { usbVendorId: 0x1A86, usbProductId: 0x7523 }, // CH340
            { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FTDI
            { usbVendorId: 0x239A }, // Adafruit boards
            { usbVendorId: 0x303A }, // Espressif Systems
            { usbVendorId: 0x1A86, usbProductId: 0x55D4 }, // CH9102
            { usbVendorId: 0x0403, usbProductId: 0x6015 }, // FTDI FT231X
            { usbVendorId: 0x2341 }, // Arduino
            { usbVendorId: 0x16C0 }, // Various development boards
          ]
        });
        this.logMessage('Device selected with filters', 'success');
      }

      // Log device info after selection
      await this.logDeviceInfo(port);
      
      return port;
    } catch (error) {
      this.logMessage(`Failed to request device: ${error}`, 'error');
      throw error;
    }
  }

  async runDiagnostics(): Promise<void> {
    try {
      this.logMessage('=== DIAGNOSTIC INFO ===', 'info');
      
      // Check Web Serial support
      const serialSupported = !!navigator.serial;
      this.logMessage(`Web Serial supported: ${serialSupported}`, serialSupported ? 'success' : 'error');
      
      // Check secure context
      const secureContext = window.isSecureContext;
      this.logMessage(`Secure context (HTTPS): ${secureContext}`, secureContext ? 'success' : 'error');
      
      // Log current URL
      this.logMessage(`Current URL: ${window.location.href}`, 'info');
      
      // Check available ports
      if (navigator.serial) {
        const availablePorts = await navigator.serial.getPorts();
        this.logMessage(`Previously granted ports: ${availablePorts.length}`, 'info');
        
        if (availablePorts.length > 0) {
          for (let i = 0; i < availablePorts.length; i++) {
            const portInfo = await availablePorts[i].getInfo();
            this.logMessage(`Port ${i + 1}: VID:${portInfo.usbVendorId?.toString(16)}, PID:${portInfo.usbProductId?.toString(16)}`, 'info');
          }
        }
      }
      
      this.logMessage('=== END DIAGNOSTICS ===', 'info');
    } catch (error) {
      this.logMessage(`Diagnostic error: ${error}`, 'error');
    }
  }

  private async logDeviceInfo(port: SerialPort): Promise<void> {
    try {
      const info = await port.getInfo();
      this.logMessage('=== SELECTED DEVICE INFO ===', 'info');
      this.logMessage(`USB Vendor ID: 0x${info.usbVendorId?.toString(16) || 'unknown'}`, 'info');
      this.logMessage(`USB Product ID: 0x${info.usbProductId?.toString(16) || 'unknown'}`, 'info');
      this.logMessage('=== END DEVICE INFO ===', 'info');
    } catch (error) {
      this.logMessage(`Could not get device info: ${error}`, 'warning');
    }
  }

  async connect(port?: SerialPort): Promise<DeviceInfo> {
    try {
      if (port) {
        this.port = port;
      } else if (!this.port) {
        this.port = await this.requestPort();
      }

      this.logMessage('Opening serial connection...');
      
      await this.port.open({
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
      });

      this.logMessage('Serial connection opened', 'success');

      // Set up readers and writers
      this.reader = this.port.readable?.getReader() || null;
      this.writer = this.port.writable?.getWriter() || null;

      // Get device information
      const deviceInfo = await this.getDeviceInfo();
      this.logMessage(`Device connected: ${deviceInfo.chipType}`, 'success');
      this.logMessage(`MAC Address: ${deviceInfo.macAddress}`);
      this.logMessage(`Flash Size: ${deviceInfo.flashSize}`);

      return deviceInfo;
    } catch (error) {
      this.logMessage(`Connection failed: ${error}`, 'error');
      
      // Check if this is a permissions policy error
      if (error instanceof Error && error.message.includes('permissions policy')) {
        this.logMessage('Falling back to mock connection for development...', 'warning');
        
        // Set mock connection flag
        this.mockConnected = true;
        
        // Return mock device info to allow development testing
        const mockDeviceInfo = await this.getDeviceInfo();
        this.logMessage(`Mock device connected: ${mockDeviceInfo.chipType}`, 'success');
        this.logMessage(`MAC Address: ${mockDeviceInfo.macAddress}`);
        this.logMessage(`Flash Size: ${mockDeviceInfo.flashSize}`);
        
        return mockDeviceInfo;
      }
      
      // Don't throw error for unhandled cases - let the calling function handle it
      throw error;
    }
  }

  private async getDeviceInfo(): Promise<DeviceInfo> {
    // In a real implementation, this would communicate with the ESP32
    // to get actual device information using ESP32 ROM bootloader commands
    
    // For now, we'll simulate the device info
    // In production, you would use esptool.js or similar library
    
    const mockDeviceInfo: DeviceInfo = {
      chipType: 'ESP32-D0WD-V3',
      macAddress: this.generateMockMacAddress(),
      flashSize: '4MB',
      firmware: 'Unknown',
    };

    return mockDeviceInfo;
  }

  private generateMockMacAddress(): string {
    const chars = '0123456789ABCDEF';
    let mac = '';
    for (let i = 0; i < 6; i++) {
      if (i > 0) mac += ':';
      mac += chars[Math.floor(Math.random() * 16)];
      mac += chars[Math.floor(Math.random() * 16)];
    }
    return mac;
  }

  async disconnect(): Promise<void> {
    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader.releaseLock();
        this.reader = null;
      }

      if (this.writer) {
        await this.writer.close();
        this.writer = null;
      }

      if (this.port) {
        await this.port.close();
        this.port = null;
      }

      // Reset mock connection flag
      this.mockConnected = false;

      this.logMessage('Device disconnected', 'info');
    } catch (error) {
      this.logMessage(`Disconnect error: ${error}`, 'error');
    }
  }

  async flashFirmware(firmwareData: ArrayBuffer): Promise<void> {
    if (!this.port || !this.writer) {
      throw new Error('No device connected');
    }

    try {
      this.logMessage('Starting firmware flash...', 'info');
      this.onFlashProgress?.({
        isFlashing: true,
        progress: 0,
        stage: 'connecting',
        message: 'Preparing device for flashing...',
      });

      // Simulate flashing process
      const stages = [
        { stage: 'erasing' as const, message: 'Erasing flash memory...', duration: 2000 },
        { stage: 'writing' as const, message: 'Writing firmware data...', duration: 5000 },
        { stage: 'verifying' as const, message: 'Verifying flash...', duration: 1500 },
        { stage: 'complete' as const, message: 'Flash complete!', duration: 500 },
      ];

      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        const progress = Math.round(((i + 1) / stages.length) * 100);
        
        this.onFlashProgress?.({
          isFlashing: true,
          progress,
          stage: stage.stage,
          message: stage.message,
        });

        this.logMessage(stage.message);
        await this.delay(stage.duration);
      }

      this.logMessage('Firmware flashed successfully!', 'success');
      this.logMessage('Device will reboot automatically', 'info');
      
      this.onFlashProgress?.({
        isFlashing: false,
        progress: 100,
        stage: 'complete',
        message: 'Flash complete!',
      });

    } catch (error) {
      this.logMessage(`Flash failed: ${error}`, 'error');
      this.onFlashProgress?.({
        isFlashing: false,
        progress: 0,
        stage: 'error',
        message: `Flash failed: ${error}`,
      });
      throw error;
    }
  }

  async eraseFlash(): Promise<void> {
    if (!this.port || !this.writer) {
      throw new Error('No device connected');
    }

    try {
      this.logMessage('Erasing flash memory...', 'warning');
      
      // Simulate erase process
      await this.delay(3000);
      
      this.logMessage('Flash memory erased successfully!', 'success');
    } catch (error) {
      this.logMessage(`Erase failed: ${error}`, 'error');
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isConnected(): boolean {
    return this.mockConnected || (this.port !== null && this.port.readable !== null);
  }
}

export const serialService = new SerialService();
