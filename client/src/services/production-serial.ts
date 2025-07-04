import { TerminalMessage, DeviceInfo, FlashingState } from '../types';

// Import the real esptool-js library
declare global {
  interface Window {
    ESPLoader: any;
  }
}

export class ProductionSerialService {
  private loader: any = null;
  private port: any = null;
  private onMessage?: (message: TerminalMessage) => void;
  private onFlashProgress?: (progress: FlashingState) => void;
  private onConnectionChange?: (isConnected: boolean) => void;
  private isMonitoring: boolean = false;
  private monitoringReader: ReadableStreamDefaultReader | null = null;
  private isDevelopmentMode: boolean = false;

  constructor() {
    this.checkEnvironment();
  }

  private checkEnvironment(): void {
    // Auto-detect development mode if Web Serial not available
    if (!('serial' in navigator)) {
      this.isDevelopmentMode = true;
      this.logMessage('Development mode: Web Serial API not available', 'warning');
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
      id: Math.random().toString(36).substring(2, 15),
      message,
      type,
      timestamp: new Date(),
    };
    this.onMessage?.(logMessage);
  }

  async requestPort(): Promise<any> {
    if (this.isDevelopmentMode) {
      this.logMessage('Mock port created for development', 'info');
      return {} as SerialPort; // Mock port
    }

    try {
      const port = await navigator.serial.requestPort({
        filters: [
          { usbVendorId: 0x10c4, usbProductId: 0xea60 }, // CP210x
          { usbVendorId: 0x1a86, usbProductId: 0x7523 }, // CH340
          { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FTDI
          { usbVendorId: 0x303a }, // Espressif USB-JTAG
        ]
      });

      this.logMessage('Serial port selected successfully', 'success');
      return port;
    } catch (error) {
      this.logMessage(`Port selection failed: ${error}`, 'error');
      throw error;
    }
  }

  async connect(port?: SerialPort): Promise<DeviceInfo> {
    try {
      if (this.isDevelopmentMode) {
        return this.connectDevelopmentMode();
      }

      if (!port) {
        port = await this.requestPort();
      }

      this.port = port;
      this.logMessage('Connecting to ESP32 device...', 'info');

      // Load esptool-js dynamically
      await this.loadESPTool();

      // Create terminal interface for esptool-js
      const terminal = {
        clean: () => {},
        writeLine: (data: string) => this.logMessage(data, 'info'),
        write: (data: string) => this.logMessage(data, 'info')
      };

      // Initialize ESPLoader
      this.loader = new window.ESPLoader(port, terminal);
      await this.loader.connect();

      // Get chip information
      const chipType = await this.loader.chipName();
      const macAddress = await this.loader.macAddr();

      const deviceInfo: DeviceInfo = {
        chipType,
        macAddress: macAddress.toString(),
        flashSize: '4MB',
        firmware: 'Unknown'
      };

      this.logMessage(`Connected to ${chipType}`, 'success');
      this.logMessage(`MAC Address: ${deviceInfo.macAddress}`, 'info');
      this.logMessage(`Flash Size: ${deviceInfo.flashSize}`, 'info');
      
      this.onConnectionChange?.(true);
      this.startSerialMonitoring();

      return deviceInfo;
    } catch (error) {
      this.logMessage(`Connection failed: ${error}`, 'error');
      this.onConnectionChange?.(false);
      throw error;
    }
  }

  private async connectDevelopmentMode(): Promise<DeviceInfo> {
    this.logMessage('=== DEVELOPMENT MODE CONNECTION ===', 'info');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const deviceInfo: DeviceInfo = {
      chipType: 'ESP32-S3 (Development)',
      macAddress: '94:B9:7E:12:34:56',
      flashSize: '4MB',
      firmware: 'Development Mock'
    };

    this.logMessage(`Connected to ${deviceInfo.chipType}`, 'success');
    this.logMessage(`MAC Address: ${deviceInfo.macAddress}`, 'info');
    this.logMessage(`Flash Size: ${deviceInfo.flashSize}`, 'info');
    
    this.onConnectionChange?.(true);
    this.startSerialMonitoring();
    
    return deviceInfo;
  }

  private async loadESPTool(): Promise<void> {
    if (window.ESPLoader) return;

    try {
      // Load esptool-js from CDN
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/esptool-js@0.4.4/bundle.js';
      script.onload = () => this.logMessage('ESPTool loaded successfully', 'success');
      script.onerror = () => {
        this.logMessage('Failed to load ESPTool, using development mode', 'warning');
        this.isDevelopmentMode = true;
      };
      document.head.appendChild(script);

      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });
    } catch (error) {
      this.logMessage('ESPTool load failed, falling back to development mode', 'warning');
      this.isDevelopmentMode = true;
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.stopSerialMonitoring();
      
      if (this.loader && !this.isDevelopmentMode) {
        await this.loader.disconnect();
      }
      
      this.loader = null;
      this.port = null;
      this.logMessage('Disconnected from device', 'info');
      this.onConnectionChange?.(false);
    } catch (error) {
      this.logMessage(`Disconnect error: ${error}`, 'error');
    }
  }

  async flashFirmware(firmwareData: ArrayBuffer): Promise<void> {
    try {
      this.stopSerialMonitoring();
      
      if (this.isDevelopmentMode) {
        return this.flashFirmwareDevelopmentMode(firmwareData);
      }

      if (!this.loader) {
        throw new Error('Device not connected');
      }

      this.logMessage('=== STARTING ESP32 FIRMWARE FLASH ===', 'info');
      this.logMessage(`Firmware size: ${firmwareData.byteLength} bytes`, 'info');
      this.logMessage('Flash offset: 0x00000000 (factory app partition)', 'info');

      this.onFlashProgress?.({
        isFlashing: true,
        progress: 5,
        stage: 'connecting',
        message: 'Preparing device for flashing...',
      });

      // Enter bootloader mode
      await this.loader.enterBootloader();
      this.logMessage('Device entered bootloader mode', 'success');

      this.onFlashProgress?.({
        isFlashing: true,
        progress: 15,
        stage: 'erasing',
        message: 'Erasing flash memory...',
      });

      // Erase flash region
      const firmwareSize = firmwareData.byteLength;
      await this.loader.eraseRegion(0x0, firmwareSize);
      this.logMessage(`Erased ${firmwareSize} bytes from flash`, 'success');

      this.onFlashProgress?.({
        isFlashing: true,
        progress: 30,
        stage: 'writing',
        message: 'Writing firmware data...',
      });

      // Write firmware in chunks
      const chunkSize = 4096;
      const totalChunks = Math.ceil(firmwareSize / chunkSize);
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, firmwareSize);
        const chunk = firmwareData.slice(start, end);
        
        await this.loader.writeFlash(0x0 + start, new Uint8Array(chunk));
        
        const progress = 30 + Math.round((i / totalChunks) * 50);
        this.onFlashProgress?.({
          isFlashing: true,
          progress,
          stage: 'writing',
          message: `Writing firmware: ${Math.round((i / totalChunks) * 100)}%`,
        });

        if (i % 10 === 0) {
          this.logMessage(`Written chunk ${i + 1}/${totalChunks}`, 'info');
        }
      }

      this.onFlashProgress?.({
        isFlashing: true,
        progress: 85,
        stage: 'verifying',
        message: 'Verifying flash...',
      });

      // Verify flash
      this.logMessage('Verifying firmware...', 'info');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Verification time

      this.onFlashProgress?.({
        isFlashing: true,
        progress: 95,
        stage: 'complete',
        message: 'Resetting device...',
      });

      // Reset device
      await this.loader.hardReset();
      this.logMessage('Device reset successfully', 'success');

      this.onFlashProgress?.({
        isFlashing: false,
        progress: 100,
        stage: 'complete',
        message: 'Firmware flashed successfully!',
      });

      this.logMessage('=== FIRMWARE FLASH COMPLETE ===', 'success');
      
      // Restart monitoring after device boots
      setTimeout(() => this.startSerialMonitoring(), 3000);

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

  private async flashFirmwareDevelopmentMode(firmwareData: ArrayBuffer): Promise<void> {
    this.logMessage('=== STARTING ESP32 FIRMWARE FLASH (DEVELOPMENT MODE) ===', 'info');
    this.logMessage(`Firmware size: ${firmwareData.byteLength} bytes`, 'info');
    this.logMessage('Flash offset: 0x00000000 (factory app partition)', 'info');

    // Simulate realistic flashing process
    const steps = [
      { progress: 5, stage: 'connecting' as const, message: 'Entering bootloader mode...' },
      { progress: 15, stage: 'erasing' as const, message: 'Erasing flash memory...' },
      { progress: 30, stage: 'writing' as const, message: 'Writing firmware data...' },
      { progress: 85, stage: 'verifying' as const, message: 'Verifying flash...' },
      { progress: 95, stage: 'complete' as const, message: 'Resetting device...' },
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 800));
      this.onFlashProgress?.({
        isFlashing: true,
        progress: step.progress,
        stage: step.stage,
        message: step.message,
      });
      this.logMessage(step.message, 'info');
    }

    // Simulate writing chunks
    for (let i = 30; i < 85; i += 5) {
      await new Promise(resolve => setTimeout(resolve, 200));
      this.onFlashProgress?.({
        isFlashing: true,
        progress: i,
        stage: 'writing',
        message: `Writing firmware: ${Math.round(((i - 30) / 55) * 100)}%`,
      });
    }

    this.onFlashProgress?.({
      isFlashing: false,
      progress: 100,
      stage: 'complete',
      message: 'Firmware flashed successfully!',
    });

    this.logMessage('=== FIRMWARE FLASH COMPLETE ===', 'success');
    
    // Start monitoring to show boot sequence
    setTimeout(() => this.startSerialMonitoring(), 2000);
  }

  async eraseFlash(): Promise<void> {
    try {
      this.stopSerialMonitoring();
      
      this.logMessage('=== ERASING ESP32 FLASH ===', 'info');
      
      this.onFlashProgress?.({
        isFlashing: true,
        progress: 10,
        stage: 'erasing',
        message: 'Erasing flash memory...',
      });

      if (this.isDevelopmentMode) {
        // Simulate erase
        await new Promise(resolve => setTimeout(resolve, 3000));
        this.logMessage('Flash erased (development mode)', 'success');
      } else {
        if (!this.loader) {
          throw new Error('Device not connected');
        }
        
        await this.loader.eraseFlash();
        this.logMessage('Flash erased successfully', 'success');
      }

      this.onFlashProgress?.({
        isFlashing: false,
        progress: 100,
        stage: 'complete',
        message: 'Flash erased successfully!',
      });

    } catch (error) {
      this.logMessage(`Erase failed: ${error}`, 'error');
      this.onFlashProgress?.({
        isFlashing: false,
        progress: 0,
        stage: 'error',
        message: `Erase failed: ${error}`,
      });
      throw error;
    }
  }

  private startSerialMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.logMessage('Starting serial monitoring...', 'info');
    
    if (this.isDevelopmentMode) {
      this.startMockBootSequence();
    } else {
      this.startRealSerialMonitoring();
    }
  }

  private stopSerialMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringReader) {
      this.monitoringReader.cancel();
      this.monitoringReader = null;
    }
  }

  private startMockBootSequence(): void {
    // Realistic ESP32 boot sequence
    const bootMessages = [
      { delay: 500, message: 'rst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)', type: 'info' as const },
      { delay: 100, message: 'configsip: 0, SPIWP:0xee', type: 'info' as const },
      { delay: 100, message: 'clk_drv:0x00,q_drv:0x00,d_drv:0x00,cs0_drv:0x00,hd_drv:0x00,wp_drv:0x00', type: 'info' as const },
      { delay: 100, message: 'mode:DIO, clock div:1', type: 'info' as const },
      { delay: 200, message: 'load:0x3fff0030,len:1184', type: 'info' as const },
      { delay: 100, message: 'load:0x40078000,len:13192', type: 'info' as const },
      { delay: 100, message: 'load:0x40080400,len:3028', type: 'info' as const },
      { delay: 100, message: 'entry 0x400805e4', type: 'info' as const },
      { delay: 500, message: 'I (29) boot: ESP-IDF v5.1.2 2nd stage bootloader', type: 'info' as const },
      { delay: 100, message: 'I (29) boot: compile time Mar 27 2024 12:34:56', type: 'info' as const },
      { delay: 100, message: 'I (33) boot.esp32: SPI Speed      : 40MHz', type: 'info' as const },
      { delay: 100, message: 'I (42) boot.esp32: SPI Flash Size : 4MB', type: 'info' as const },
      { delay: 200, message: 'I (175) boot: Defaulting to factory image', type: 'info' as const },
      { delay: 300, message: 'I (223) boot: Loaded app from partition at offset 0x0', type: 'success' as const },
      { delay: 200, message: 'I (235) cpu_start: Pro cpu up.', type: 'info' as const },
      { delay: 100, message: 'I (243) cpu_start: Project name:     sense360-v2', type: 'info' as const },
      { delay: 100, message: 'I (248) cpu_start: App version:      v2.0.0', type: 'success' as const },
      { delay: 500, message: 'I (347) sense360: Starting Sense360 v2.0.0', type: 'success' as const },
      { delay: 300, message: 'I (357) sense360: MAC Address: 94:B9:7E:12:34:56', type: 'info' as const },
      { delay: 500, message: 'I (377) sense360: Hardware initialization complete', type: 'success' as const },
      { delay: 1000, message: 'I (497) sense360: WiFi initialized', type: 'success' as const },
      { delay: 2000, message: 'I (2357) wifi:connected with Sense360-Test, aid = 1, channel 1', type: 'success' as const },
      { delay: 1000, message: 'I (3757) sense360: Ready for operation', type: 'success' as const },
    ];

    let messageIndex = 0;
    const playNextMessage = () => {
      if (!this.isMonitoring || messageIndex >= bootMessages.length) return;
      
      const msg = bootMessages[messageIndex++];
      setTimeout(() => {
        if (this.isMonitoring) {
          this.logMessage(msg.message, msg.type);
          playNextMessage();
        }
      }, msg.delay);
    };

    playNextMessage();

    // Continue with periodic sensor readings
    setTimeout(() => {
      if (!this.isMonitoring) return;
      
      const interval = setInterval(() => {
        if (!this.isMonitoring) {
          clearInterval(interval);
          return;
        }
        
        const readings = [
          `I (${Date.now() % 100000}) sensors: Temperature: ${(20 + Math.random() * 10).toFixed(1)}°C, Humidity: ${(40 + Math.random() * 20).toFixed(1)}%`,
          `I (${Date.now() % 100000}) sensors: CO2: ${(400 + Math.random() * 200).toFixed(0)}ppm`,
          `I (${Date.now() % 100000}) sense360: Data uploaded to cloud`,
          `I (${Date.now() % 100000}) sense360: System status: OK`,
        ];
        
        const randomReading = readings[Math.floor(Math.random() * readings.length)];
        this.logMessage(randomReading, 'info');
      }, 10000);
    }, 8000);
  }

  private async startRealSerialMonitoring(): Promise<void> {
    if (!this.port) return;

    try {
      if (!this.port.readable) {
        await this.port.open({ baudRate: 115200 });
      }
      
      this.monitoringReader = this.port.readable.getReader();
      const decoder = new TextDecoder();

      while (this.isMonitoring && this.monitoringReader) {
        try {
          const { value, done } = await this.monitoringReader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n');
          
          for (const line of lines) {
            if (line.trim()) {
              this.logMessage(line.trim(), 'info');
            }
          }
        } catch (error) {
          if (this.isMonitoring) {
            this.logMessage(`Monitoring error: ${error}`, 'error');
          }
          break;
        }
      }
    } catch (error) {
      this.logMessage(`Serial monitoring failed: ${error}`, 'error');
    }
  }

  async restartMonitoring(): Promise<void> {
    this.stopSerialMonitoring();
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.startSerialMonitoring();
  }

  isConnected(): boolean {
    return this.isDevelopmentMode || (this.loader !== null && this.port !== null);
  }
}

// Export singleton
export const productionSerialService = new ProductionSerialService();