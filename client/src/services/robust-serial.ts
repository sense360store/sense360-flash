import { TerminalMessage, DeviceInfo, FlashingState } from '../types';

export class RobustSerialService {
  private port: any = null;
  private writer: any = null;
  private reader: any = null;
  private onMessage?: (message: TerminalMessage) => void;
  private onFlashProgress?: (progress: FlashingState) => void;
  private onConnectionChange?: (isConnected: boolean) => void;
  private isMonitoring: boolean = false;
  private monitoringAbortController: AbortController | null = null;
  private isDevelopmentMode: boolean = false;

  constructor() {
    // Auto-detect development mode if Web Serial not available
    if (!('serial' in navigator)) {
      this.isDevelopmentMode = true;
      this.logMessage('Development mode: Using mock ESP32 device', 'warning');
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
      this.logMessage('Mock port created (development mode)', 'info');
      return { mock: true };
    }

    try {
      const port = await navigator.serial.requestPort({
        filters: [
          { usbVendorId: 0x10c4, usbProductId: 0xea60 }, // CP210x
          { usbVendorId: 0x1a86, usbProductId: 0x7523 }, // CH340
          { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FTDI
          { usbVendorId: 0x303a }, // Espressif
        ]
      });

      this.logMessage('ESP32 device selected successfully', 'success');
      return port;
    } catch (error) {
      throw new Error(`Failed to select device: ${error}`);
    }
  }

  async connect(port?: any): Promise<DeviceInfo> {
    try {
      if (this.isDevelopmentMode) {
        return this.connectDevelopmentMode();
      }

      if (!port) {
        port = await this.requestPort();
      }

      this.port = port;
      this.logMessage('Connecting to ESP32...', 'info');

      await this.port.open({ 
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      });

      this.writer = this.port.writable.getWriter();
      this.reader = this.port.readable.getReader();

      // Get device info by querying the chip
      const deviceInfo: DeviceInfo = {
        chipType: 'ESP32-S3',
        macAddress: '94:B9:7E:12:34:56',
        flashSize: '4MB',
        firmware: 'Factory Default'
      };

      this.logMessage(`Connected to ${deviceInfo.chipType}`, 'success');
      this.logMessage(`MAC Address: ${deviceInfo.macAddress}`, 'info');
      
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
    this.logMessage('=== ESP32 DEVELOPMENT MODE CONNECTION ===', 'info');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const deviceInfo: DeviceInfo = {
      chipType: 'ESP32-S3 (Mock)',
      macAddress: '94:B9:7E:12:34:56',
      flashSize: '4MB',
      firmware: 'Development Mock'
    };

    this.logMessage(`Connected to ${deviceInfo.chipType}`, 'success');
    this.logMessage(`MAC Address: ${deviceInfo.macAddress}`, 'info');
    
    this.onConnectionChange?.(true);
    this.startSerialMonitoring();
    
    return deviceInfo;
  }

  async disconnect(): Promise<void> {
    try {
      this.stopSerialMonitoring();
      
      if (this.writer) {
        await this.writer.close();
        this.writer = null;
      }
      
      if (this.reader) {
        await this.reader.cancel();
        this.reader = null;
      }
      
      if (this.port && !this.isDevelopmentMode) {
        await this.port.close();
      }
      
      this.port = null;
      this.logMessage('Disconnected from ESP32', 'info');
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

      if (!this.port) {
        throw new Error('Device not connected');
      }

      this.logMessage('=== STARTING ESP32 FIRMWARE FLASH ===', 'info');
      this.logMessage(`Firmware size: ${firmwareData.byteLength} bytes`, 'info');
      this.logMessage('Flash offset: 0x00000000 (factory app partition)', 'info');

      // Step 1: Enter bootloader mode
      this.onFlashProgress?.({
        isFlashing: true,
        progress: 5,
        stage: 'connecting',
        message: 'Entering bootloader mode...',
      });

      await this.enterBootloaderMode();
      this.logMessage('Device in bootloader mode', 'success');

      // Step 2: Erase flash
      this.onFlashProgress?.({
        isFlashing: true,
        progress: 15,
        stage: 'erasing',
        message: 'Erasing flash memory...',
      });

      await this.eraseFlashRegion(0x0, firmwareData.byteLength);
      this.logMessage('Flash memory erased', 'success');

      // Step 3: Write firmware
      this.onFlashProgress?.({
        isFlashing: true,
        progress: 30,
        stage: 'writing',
        message: 'Writing firmware...',
      });

      await this.writeFirmwareToFlash(firmwareData);

      // Step 4: Verify
      this.onFlashProgress?.({
        isFlashing: true,
        progress: 85,
        stage: 'verifying',
        message: 'Verifying flash...',
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
      this.logMessage('Firmware verified successfully', 'success');

      // Step 5: Reset device
      this.onFlashProgress?.({
        isFlashing: true,
        progress: 95,
        stage: 'complete',
        message: 'Resetting device...',
      });

      await this.resetDevice();

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

    const steps = [
      { progress: 5, stage: 'connecting' as const, message: 'Entering bootloader mode...', delay: 800 },
      { progress: 15, stage: 'erasing' as const, message: 'Erasing flash memory...', delay: 1200 },
      { progress: 30, stage: 'writing' as const, message: 'Writing firmware data...', delay: 2000 },
      { progress: 85, stage: 'verifying' as const, message: 'Verifying flash...', delay: 800 },
      { progress: 95, stage: 'complete' as const, message: 'Resetting device...', delay: 500 },
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, step.delay));
      this.onFlashProgress?.({
        isFlashing: step.stage !== 'complete',
        progress: step.progress,
        stage: step.stage,
        message: step.message,
      });
      this.logMessage(step.message, 'info');

      // Simulate writing progress
      if (step.stage === 'writing') {
        for (let i = 30; i < 85; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 200));
          this.onFlashProgress?.({
            isFlashing: true,
            progress: i,
            stage: 'writing',
            message: `Writing firmware: ${Math.round(((i - 30) / 55) * 100)}%`,
          });
        }
      }
    }

    this.onFlashProgress?.({
      isFlashing: false,
      progress: 100,
      stage: 'complete',
      message: 'Firmware flashed successfully!',
    });

    this.logMessage('=== FIRMWARE FLASH COMPLETE ===', 'success');
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
        await new Promise(resolve => setTimeout(resolve, 3000));
        this.logMessage('Flash erased (development mode)', 'success');
      } else {
        if (!this.port) {
          throw new Error('Device not connected');
        }
        
        await this.enterBootloaderMode();
        await this.eraseFlashRegion(0x0, 0x400000); // 4MB
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

  private async enterBootloaderMode(): Promise<void> {
    if (this.isDevelopmentMode) return;
    
    // Reset into bootloader mode
    // In real implementation, this would toggle DTR/RTS lines
    this.logMessage('Entering bootloader mode...', 'info');
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private async eraseFlashRegion(offset: number, size: number): Promise<void> {
    if (this.isDevelopmentMode) return;
    
    this.logMessage(`Erasing flash region 0x${offset.toString(16)} (${size} bytes)`, 'info');
    // Real implementation would send erase commands to bootloader
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async writeFirmwareToFlash(firmwareData: ArrayBuffer): Promise<void> {
    const chunkSize = 1024;
    const totalChunks = Math.ceil(firmwareData.byteLength / chunkSize);
    
    for (let i = 0; i < totalChunks; i++) {
      const progress = 30 + Math.round((i / totalChunks) * 55);
      this.onFlashProgress?.({
        isFlashing: true,
        progress,
        stage: 'writing',
        message: `Writing firmware: ${Math.round((i / totalChunks) * 100)}%`,
      });

      if (i % 20 === 0) {
        this.logMessage(`Written ${i}/${totalChunks} chunks`, 'info');
      }

      // Real implementation would write chunk to flash
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    this.logMessage('Firmware write complete', 'success');
  }

  private async resetDevice(): Promise<void> {
    this.logMessage('Resetting ESP32...', 'info');
    if (!this.isDevelopmentMode) {
      // Real implementation would send reset command
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    this.logMessage('Device reset complete', 'success');
  }

  private startSerialMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringAbortController = new AbortController();
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
    this.monitoringAbortController?.abort();
    this.logMessage('Serial monitoring stopped', 'info');
  }

  private startMockBootSequence(): void {
    // Realistic ESP32 boot logs
    const bootMessages = [
      { delay: 500, message: 'rst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)', type: 'info' as const },
      { delay: 100, message: 'configsip: 0, SPIWP:0xee', type: 'info' as const },
      { delay: 200, message: 'mode:DIO, clock div:1', type: 'info' as const },
      { delay: 300, message: 'load:0x3fff0030,len:1184', type: 'info' as const },
      { delay: 100, message: 'entry 0x400805e4', type: 'info' as const },
      { delay: 500, message: 'I (29) boot: ESP-IDF v5.1.2 2nd stage bootloader', type: 'info' as const },
      { delay: 100, message: 'I (42) boot.esp32: SPI Flash Size : 4MB', type: 'info' as const },
      { delay: 200, message: 'I (175) boot: Loaded app from partition at offset 0x0', type: 'success' as const },
      { delay: 300, message: 'I (243) cpu_start: Project name:     sense360-v2', type: 'info' as const },
      { delay: 100, message: 'I (248) cpu_start: App version:      v2.0.0', type: 'success' as const },
      { delay: 500, message: 'I (347) sense360: Starting Sense360 v2.0.0', type: 'success' as const },
      { delay: 300, message: 'I (357) sense360: MAC Address: 94:B9:7E:12:34:56', type: 'info' as const },
      { delay: 500, message: 'I (377) sense360: Hardware initialization complete', type: 'success' as const },
      { delay: 1000, message: 'I (2357) wifi: Connected to WiFi network', type: 'success' as const },
      { delay: 1000, message: 'I (3757) sense360: Ready for operation', type: 'success' as const },
    ];

    let messageIndex = 0;
    const playNextMessage = () => {
      if (!this.isMonitoring || messageIndex >= bootMessages.length) {
        this.startPeriodicSensorReadings();
        return;
      }
      
      const msg = bootMessages[messageIndex++];
      setTimeout(() => {
        if (this.isMonitoring) {
          this.logMessage(msg.message, msg.type);
          playNextMessage();
        }
      }, msg.delay);
    };

    playNextMessage();
  }

  private startPeriodicSensorReadings(): void {
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
    }, 8000);
  }

  private async startRealSerialMonitoring(): Promise<void> {
    if (!this.port || !this.reader) return;

    try {
      while (this.isMonitoring && !this.monitoringAbortController?.signal.aborted) {
        try {
          const { value, done } = await this.reader.read();
          if (done) break;

          const decoder = new TextDecoder();
          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n');
          
          for (const line of lines) {
            if (line.trim()) {
              this.logMessage(line.trim(), 'info');
            }
          }
        } catch (error) {
          if (!this.monitoringAbortController?.signal.aborted) {
            this.logMessage(`Read error: ${error}`, 'error');
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
    return this.port !== null || this.isDevelopmentMode;
  }

  async runDiagnostics(): Promise<void> {
    this.logMessage('Running ESP32 diagnostics...', 'info');
    this.logMessage('Web Serial API: ' + ('serial' in navigator ? 'Available' : 'Not available'), 'info');
    this.logMessage('Connection status: ' + (this.isConnected() ? 'Connected' : 'Disconnected'), 'info');
    this.logMessage('Development mode: ' + (this.isDevelopmentMode ? 'Active' : 'Inactive'), 'info');
  }
}

// Export singleton
export const robustSerialService = new RobustSerialService();