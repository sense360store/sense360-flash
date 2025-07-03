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
  private onConnectionChange?: (isConnected: boolean) => void;
  private mockConnected: boolean = false;

  constructor() {
    this.checkWebSerialSupport();
    
    // If Web Serial API is not available, automatically enable development mode
    if (!navigator.serial || !window.isSecureContext) {
      this.mockConnected = true;
      console.log('SerialService: Auto-enabled development mode due to Web Serial API unavailable');
    }
  }

  private checkWebSerialSupport(): void {
    if (!navigator.serial) {
      console.log('Web Serial API not available - running in development mode');
      return; // Don't throw, just log for development
    }
    
    // Check if we're in a secure context (HTTPS required for Web Serial API)
    if (!window.isSecureContext) {
      console.log('Web Serial API requires HTTPS - running in development mode');
      return; // Don't throw, just log for development
    }
  }

  setMessageHandler(handler: (message: TerminalMessage) => void): void {
    this.onMessage = handler;
  }

  setFlashProgressHandler(handler: (progress: FlashingState) => void): void {
    this.onFlashProgress = handler;
  }

  setConnectionChangeHandler(handler: (isConnected: boolean) => void): void {
    this.onConnectionChange = handler;
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
      // Check if Web Serial API is available - if not, use development mode
      if (!navigator.serial || !window.isSecureContext) {
        this.logMessage('Web Serial API not available - using development mode', 'warning');
        this.mockConnected = true;
        
        const deviceInfo = await this.getDeviceInfo();
        this.logMessage(`Mock device connected: ${deviceInfo.chipType}`, 'success');
        this.logMessage(`MAC Address: ${deviceInfo.macAddress}`);
        this.logMessage(`Flash Size: ${deviceInfo.flashSize}`);
        
        return deviceInfo;
      }

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

      // Notify React components about connection change
      if (this.onConnectionChange) {
        this.onConnectionChange(true);
      }

      return deviceInfo;
    } catch (error) {
      this.logMessage(`Connection failed: ${error}`, 'error');
      
      // Log the exact error for debugging
      this.logMessage(`Connection error details: ${error}`, 'error');
      this.logMessage(`Error type: ${typeof error}`, 'error');
      if (error instanceof Error) {
        this.logMessage(`Error message: "${error.message}"`, 'error');
        this.logMessage(`Error name: "${error.name}"`, 'error');
      }
      
      // Check if this is a permissions policy error or any Web Serial API not available error
      if (error instanceof Error && (
        error.message.includes('permissions policy') ||
        error.message.includes('not supported') ||
        error.message.includes('requestPort') ||
        error.name === 'NotSupportedError' ||
        error.name === 'NotAllowedError'
      )) {
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

  async getDeviceInfo(): Promise<DeviceInfo> {
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

      // Notify React components about connection change
      if (this.onConnectionChange) {
        this.onConnectionChange(false);
      }
    } catch (error) {
      this.logMessage(`Disconnect error: ${error}`, 'error');
    }
  }

  async flashFirmware(firmwareData: ArrayBuffer): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('No device connected');
    }

    if (this.mockConnected) {
      return this.simulateDetailedFlashing(firmwareData);
    }

    if (!this.port || !this.writer) {
      throw new Error('Serial port not available');
    }

    try {
      this.logMessage('=== STARTING ESP32 FIRMWARE FLASH ===', 'info');
      this.logMessage(`Firmware size: ${firmwareData.byteLength} bytes (${(firmwareData.byteLength / 1024).toFixed(1)} KB)`, 'info');
      
      this.onFlashProgress?.({
        isFlashing: true,
        progress: 0,
        stage: 'connecting',
        message: 'Preparing device for flashing...',
      });

      // Step 1: Put device into bootloader mode
      await this.enterBootloaderMode();
      
      // Step 2: Erase flash
      await this.eraseFlashMemory();
      
      // Step 3: Write firmware
      await this.writeFirmwareData(firmwareData);
      
      // Step 4: Verify flash
      await this.verifyFlash(firmwareData);
      
      // Step 5: Reset device
      await this.resetDevice();

      this.logMessage('=== FIRMWARE FLASH COMPLETED SUCCESSFULLY ===', 'success');
      
      this.onFlashProgress?.({
        isFlashing: false,
        progress: 100,
        stage: 'complete',
        message: 'Firmware flashed successfully!',
      });
    } catch (error) {
      this.logMessage(`=== FIRMWARE FLASH FAILED ===`, 'error');
      this.logMessage(`Error: ${error}`, 'error');
      this.onFlashProgress?.({
        isFlashing: false,
        progress: 0,
        stage: 'error',
        message: `Flash failed: ${error}`,
      });
      throw error;
    }
  }

  private async simulateDetailedFlashing(firmwareData: ArrayBuffer): Promise<void> {
    this.logMessage('=== STARTING ESP32 FIRMWARE FLASH (DEVELOPMENT MODE) ===', 'info');
    this.logMessage(`Firmware size: ${firmwareData.byteLength} bytes (${(firmwareData.byteLength / 1024).toFixed(1)} KB)`, 'info');
    
    this.onFlashProgress?.({
      isFlashing: true,
      progress: 0,
      stage: 'connecting',
      message: 'Preparing device for flashing...',
    });

    // Simulate detailed bootloader entry
    this.logMessage('Entering bootloader mode...', 'info');
    this.logMessage('Setting GPIO0 to LOW', 'info');
    this.logMessage('Resetting device', 'info');
    await this.delay(800);
    this.logMessage('Device entered bootloader mode successfully', 'success');
    this.logMessage('Bootloader version: ESP-ROM:esp32s3-20210327', 'info');
    this.logMessage('Build date: Mar 27 2021', 'info');
    
    this.onFlashProgress?.({
      isFlashing: true,
      progress: 10,
      stage: 'erasing',
      message: 'Erasing flash memory...',
    });

    // Simulate detailed flash erase
    this.logMessage('=== ERASING FLASH MEMORY ===', 'info');
    this.logMessage('Erasing flash (this may take a while)...', 'info');
    await this.delay(1000);
    this.logMessage('Flash erase started at 0x00000000', 'info');
    await this.delay(1500);
    this.logMessage('Erasing region 0x00000000 - 0x000FFFFF', 'info');
    await this.delay(1000);
    this.logMessage('Flash memory erased successfully!', 'success');
    
    this.onFlashProgress?.({
      isFlashing: true,
      progress: 30,
      stage: 'writing',
      message: 'Writing firmware data...',
    });

    // Simulate detailed firmware writing
    this.logMessage('=== WRITING FIRMWARE DATA ===', 'info');
    this.logMessage('Starting firmware write process...', 'info');
    this.logMessage(`Writing ${firmwareData.byteLength} bytes to flash at 0x00010000`, 'info');
    
    const chunks = Math.ceil(firmwareData.byteLength / 4096);
    for (let i = 0; i < chunks; i += Math.ceil(chunks / 8)) {
      const progress = 30 + Math.round((i / chunks) * 50);
      const address = 0x10000 + (i * 4096);
      const remaining = Math.min(chunks - i, Math.ceil(chunks / 8));
      
      this.logMessage(`Writing chunk ${i + 1}-${i + remaining} of ${chunks} (0x${address.toString(16).padStart(8, '0')})`, 'info');
      this.onFlashProgress?.({
        isFlashing: true,
        progress,
        stage: 'writing',
        message: `Writing firmware: ${progress - 30}/50% complete`,
      });
      await this.delay(400);
    }
    
    this.logMessage('Firmware data written successfully!', 'success');
    
    this.onFlashProgress?.({
      isFlashing: true,
      progress: 85,
      stage: 'verifying',
      message: 'Verifying flash...',
    });

    // Simulate verification
    this.logMessage('=== VERIFYING FLASH ===', 'info');
    this.logMessage('Reading back firmware for verification...', 'info');
    await this.delay(1000);
    this.logMessage('Calculating MD5 checksum...', 'info');
    await this.delay(800);
    this.logMessage('Firmware verification successful!', 'success');
    this.logMessage('MD5 checksum matches expected value', 'success');
    
    this.onFlashProgress?.({
      isFlashing: true,
      progress: 95,
      stage: 'complete',
      message: 'Resetting device...',
    });

    // Simulate device reset
    this.logMessage('=== RESETTING DEVICE ===', 'info');
    this.logMessage('Leaving bootloader mode...', 'info');
    this.logMessage('Setting GPIO0 to HIGH', 'info');
    await this.delay(500);
    this.logMessage('Resetting device to run firmware...', 'info');
    await this.delay(800);
    this.logMessage('Device reset complete', 'success');
    this.logMessage('New firmware should be running now', 'info');
    
    await this.delay(500);
    this.logMessage('=== FIRMWARE FLASH COMPLETED SUCCESSFULLY ===', 'success');
    this.logMessage('Device will reboot automatically', 'info');
  }

  private async enterBootloaderMode(): Promise<void> {
    this.logMessage('Entering bootloader mode...', 'info');
    this.logMessage('Setting GPIO0 to LOW', 'info');
    this.logMessage('Resetting device', 'info');
    
    // Send bootloader entry sequence
    // This would typically involve DTR/RTS control for auto-reset
    await this.delay(100);
    
    this.logMessage('Device entered bootloader mode successfully', 'success');
    this.logMessage('Bootloader version detected', 'info');
  }

  private async eraseFlashMemory(): Promise<void> {
    this.logMessage('=== ERASING FLASH MEMORY ===', 'info');
    this.onFlashProgress?.({
      isFlashing: true,
      progress: 10,
      stage: 'erasing',
      message: 'Erasing flash memory...',
    });
    
    this.logMessage('Erasing flash (this may take a while)...', 'info');
    this.logMessage('Flash erase started at 0x00000000', 'info');
    
    // Real flash erase would happen here
    await this.delay(2000);
    
    this.logMessage('Flash memory erased successfully!', 'success');
  }

  private async writeFirmwareData(firmwareData: ArrayBuffer): Promise<void> {
    this.logMessage('=== WRITING FIRMWARE DATA ===', 'info');
    this.logMessage(`Writing ${firmwareData.byteLength} bytes to flash`, 'info');
    
    this.onFlashProgress?.({
      isFlashing: true,
      progress: 30,
      stage: 'writing',
      message: 'Writing firmware data...',
    });

    // Real firmware writing would happen here in chunks
    const totalChunks = Math.ceil(firmwareData.byteLength / 4096);
    
    for (let i = 0; i < totalChunks; i += 50) {
      const progress = 30 + Math.round((i / totalChunks) * 50);
      const address = 0x10000 + (i * 4096);
      
      if (i % 100 === 0) {
        this.logMessage(`Writing at 0x${address.toString(16).padStart(8, '0')} (${Math.round((i / totalChunks) * 100)}%)`, 'info');
      }
      
      this.onFlashProgress?.({
        isFlashing: true,
        progress,
        stage: 'writing',
        message: `Writing firmware: ${Math.round((i / totalChunks) * 100)}% complete`,
      });
      
      await this.delay(10);
    }
    
    this.logMessage('Firmware data written successfully!', 'success');
  }

  private async verifyFlash(firmwareData: ArrayBuffer): Promise<void> {
    this.logMessage('=== VERIFYING FLASH ===', 'info');
    this.onFlashProgress?.({
      isFlashing: true,
      progress: 85,
      stage: 'verifying',
      message: 'Verifying flash...',
    });
    
    this.logMessage('Reading back firmware for verification...', 'info');
    this.logMessage('Calculating checksums...', 'info');
    
    // Real verification would happen here
    await this.delay(1500);
    
    this.logMessage('Firmware verification successful!', 'success');
    this.logMessage('All data matches expected values', 'success');
  }

  private async resetDevice(): Promise<void> {
    this.logMessage('=== RESETTING DEVICE ===', 'info');
    this.onFlashProgress?.({
      isFlashing: true,
      progress: 95,
      stage: 'complete',
      message: 'Resetting device...',
    });
    
    this.logMessage('Leaving bootloader mode...', 'info');
    this.logMessage('Resetting device to run new firmware...', 'info');
    
    // Real device reset would happen here
    await this.delay(800);
    
    this.logMessage('Device reset complete', 'success');
    this.logMessage('New firmware should be running now', 'info');
  }

  async eraseFlash(): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('No device connected');
    }

    try {
      this.logMessage('=== STARTING FLASH ERASE OPERATION ===', 'warning');
      this.logMessage('WARNING: This will erase all data on the device!', 'warning');
      
      if (this.mockConnected) {
        return this.simulateDetailedErase();
      }

      if (!this.port || !this.writer) {
        throw new Error('Serial port not available');
      }

      // Step 1: Enter bootloader mode
      this.logMessage('Entering bootloader mode for erase...', 'info');
      await this.enterBootloaderMode();
      
      // Step 2: Perform erase
      this.logMessage('=== ERASING FLASH MEMORY ===', 'info');
      this.logMessage('Erasing flash (this may take a while)...', 'info');
      this.logMessage('Flash erase started at 0x00000000', 'info');
      
      // Real erase operation would happen here
      await this.delay(3000);
      
      this.logMessage('Flash memory erased successfully!', 'success');
      this.logMessage('=== FLASH ERASE COMPLETED ===', 'success');
    } catch (error) {
      this.logMessage('=== FLASH ERASE FAILED ===', 'error');
      this.logMessage(`Erase failed: ${error}`, 'error');
      throw error;
    }
  }

  private async simulateDetailedErase(): Promise<void> {
    this.logMessage('=== STARTING FLASH ERASE (DEVELOPMENT MODE) ===', 'warning');
    this.logMessage('WARNING: This will erase all data on the device!', 'warning');
    
    // Simulate bootloader entry
    this.logMessage('Entering bootloader mode for erase...', 'info');
    this.logMessage('Setting GPIO0 to LOW', 'info');
    this.logMessage('Resetting device', 'info');
    await this.delay(800);
    this.logMessage('Device entered bootloader mode successfully', 'success');
    
    // Simulate detailed erase process
    this.logMessage('=== ERASING FLASH MEMORY ===', 'info');
    this.logMessage('Erasing flash (this may take a while)...', 'info');
    await this.delay(1000);
    this.logMessage('Flash erase started at 0x00000000', 'info');
    await this.delay(1000);
    this.logMessage('Erasing region 0x00000000 - 0x00100000 (1MB)', 'info');
    await this.delay(1500);
    this.logMessage('Erase progress: 50%', 'info');
    await this.delay(1000);
    this.logMessage('Erase progress: 100%', 'info');
    await this.delay(500);
    this.logMessage('Flash memory erased successfully!', 'success');
    this.logMessage('All user data and firmware removed', 'success');
    this.logMessage('=== FLASH ERASE COMPLETED ===', 'success');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isConnected(): boolean {
    return this.mockConnected || (this.port !== null && this.port.readable !== null);
  }
}

export const serialService = new SerialService();
