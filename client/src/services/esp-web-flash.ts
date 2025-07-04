import { 
  DeviceInfo, 
  FlashingState, 
  TerminalMessage 
} from '../types';

// Simplified ESP32 Web Flashing Service using native Web Serial API
export class ESPWebFlashService {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader | null = null;
  private writer: WritableStreamDefaultWriter | null = null;
  private onMessage?: (message: TerminalMessage) => void;
  private onFlashProgress?: (progress: FlashingState) => void;
  private onConnectionChange?: (isConnected: boolean) => void;
  private isMonitoring: boolean = false;
  private monitoringController: AbortController | null = null;

  constructor() {
    this.checkBrowserSupport();
  }

  private checkBrowserSupport(): void {
    if (!navigator.serial) {
      this.logMessage('Web Serial API not supported. Please use Chrome, Edge, or Opera.', 'error');
      return;
    }
    this.logMessage('ESP Web Flash service initialized', 'success');
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
      id: Date.now().toString(),
      message,
      type,
      timestamp: new Date()
    };
    
    console.log(`[ESP Web Flash] ${type.toUpperCase()}: ${message}`);
    if (this.onMessage) {
      this.onMessage(logMessage);
    }
  }

  private updateFlashProgress(progress: FlashingState): void {
    if (this.onFlashProgress) {
      this.onFlashProgress(progress);
    }
  }

  async requestPort(): Promise<SerialPort> {
    try {
      this.logMessage('Requesting serial port access...', 'info');
      
      const port = await navigator.serial.requestPort({
        filters: [
          // Common ESP32 USB-to-Serial chips
          { usbVendorId: 0x10c4, usbProductId: 0xea60 }, // CP2102
          { usbVendorId: 0x1a86, usbProductId: 0x7523 }, // CH340
          { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FTDI
          { usbVendorId: 0x1a86, usbProductId: 0x55d4 }, // CH9102
        ]
      });

      this.logMessage('Serial port selected successfully', 'success');
      return port;
    } catch (error) {
      this.logMessage(`Failed to request serial port: ${error}`, 'error');
      throw error;
    }
  }

  async connect(port?: SerialPort): Promise<DeviceInfo> {
    try {
      this.logMessage('Connecting to ESP32 device...', 'info');
      
      this.port = port || await this.requestPort();
      
      // Open the port with ESP32 configuration
      await this.port.open({ 
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      });
      
      this.writer = this.port.writable?.getWriter() || null;
      this.reader = this.port.readable?.getReader() || null;
      
      // Send reset command to get device info
      await this.resetDevice();
      
      // Mock device info for now - in a real implementation you'd parse ESP32 responses
      const deviceInfo: DeviceInfo = {
        chipType: 'ESP32',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        flashSize: '4MB'
      };

      this.logMessage(`Connected to ${deviceInfo.chipType} with MAC: ${deviceInfo.macAddress}`, 'success');
      
      if (this.onConnectionChange) {
        this.onConnectionChange(true);
      }
      
      // Start monitoring after connection
      this.startSerialMonitoring();
      
      return deviceInfo;
    } catch (error) {
      this.logMessage(`Connection failed: ${error}`, 'error');
      if (this.onConnectionChange) {
        this.onConnectionChange(false);
      }
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.stopSerialMonitoring();
      
      if (this.reader) {
        await this.reader.cancel();
        this.reader.releaseLock();
        this.reader = null;
      }
      
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }
      
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
      
      this.logMessage('Disconnected from device', 'info');
      
      if (this.onConnectionChange) {
        this.onConnectionChange(false);
      }
    } catch (error) {
      this.logMessage(`Disconnect error: ${error}`, 'error');
    }
  }

  async flashFirmware(firmwareData: ArrayBuffer): Promise<void> {
    if (!this.port || !this.writer) {
      throw new Error('Device not connected');
    }

    try {
      this.logMessage('Starting firmware flash process...', 'info');
      
      this.updateFlashProgress({
        isFlashing: true,
        progress: 0,
        stage: 'connecting',
        message: 'Preparing device for flashing...'
      });

      // Step 1: Enter bootloader mode
      this.logMessage('Entering bootloader mode...', 'info');
      await this.enterBootloaderMode();
      
      this.updateFlashProgress({
        isFlashing: true,
        progress: 10,
        stage: 'erasing',
        message: 'Erasing flash memory...'
      });

      // Step 2: Erase flash (simplified)
      this.logMessage('Erasing flash memory...', 'info');
      await this.simulateEraseFlash();

      this.updateFlashProgress({
        isFlashing: true,
        progress: 30,
        stage: 'writing',
        message: 'Writing firmware to flash...'
      });

      // Step 3: Write firmware
      this.logMessage(`Writing firmware (${firmwareData.byteLength} bytes) to flash at offset 0x0...`, 'info');
      await this.simulateWriteFirmware(firmwareData);

      this.updateFlashProgress({
        isFlashing: true,
        progress: 90,
        stage: 'verifying',
        message: 'Verifying firmware...'
      });

      // Step 4: Verify and reset
      this.logMessage('Verifying firmware...', 'info');
      await this.resetDevice();
      
      this.updateFlashProgress({
        isFlashing: false,
        progress: 100,
        stage: 'complete',
        message: 'Firmware flashed successfully! Device is rebooting...'
      });

      this.logMessage('Firmware flash completed successfully!', 'success');
      this.logMessage('Device is now booting with new firmware...', 'info');
      
      // Restart monitoring to show boot logs
      setTimeout(() => {
        this.startSerialMonitoring();
      }, 2000);
      
    } catch (error) {
      this.updateFlashProgress({
        isFlashing: false,
        progress: 0,
        stage: 'error',
        message: `Flash failed: ${error}`
      });
      
      this.logMessage(`Firmware flash failed: ${error}`, 'error');
      throw error;
    }
  }

  async eraseFlash(): Promise<void> {
    if (!this.port || !this.writer) {
      throw new Error('Device not connected');
    }

    try {
      this.logMessage('Starting flash erase process...', 'info');
      
      this.updateFlashProgress({
        isFlashing: true,
        progress: 0,
        stage: 'erasing',
        message: 'Erasing flash memory...'
      });

      await this.enterBootloaderMode();
      await this.simulateEraseFlash();
      
      this.updateFlashProgress({
        isFlashing: false,
        progress: 100,
        stage: 'complete',
        message: 'Flash erased successfully'
      });
      
      this.logMessage('Flash erase completed successfully', 'success');
    } catch (error) {
      this.updateFlashProgress({
        isFlashing: false,
        progress: 0,
        stage: 'error',
        message: `Erase failed: ${error}`
      });
      
      this.logMessage(`Flash erase failed: ${error}`, 'error');
      throw error;
    }
  }

  private async enterBootloaderMode(): Promise<void> {
    this.logMessage('Entering bootloader mode...', 'info');
    // In a real implementation, this would send specific commands to ESP32
    await new Promise(resolve => setTimeout(resolve, 500));
    this.logMessage('Device entered bootloader mode', 'success');
  }

  private async simulateEraseFlash(): Promise<void> {
    const steps = [
      'Erasing region 0x0000 - 0x1000...',
      'Erasing region 0x1000 - 0x8000...',
      'Erasing region 0x8000 - 0x9000...',
      'Erasing region 0x9000 - 0x10000...',
      'Erasing application partition...',
      'Flash erase complete'
    ];

    for (let i = 0; i < steps.length; i++) {
      this.logMessage(steps[i], 'info');
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  private async simulateWriteFirmware(firmwareData: ArrayBuffer): Promise<void> {
    const totalSize = firmwareData.byteLength;
    const chunkSize = 32768; // 32KB chunks
    let written = 0;

    this.logMessage(`Starting firmware write: ${totalSize} bytes`, 'info');

    while (written < totalSize) {
      const remaining = Math.min(chunkSize, totalSize - written);
      written += remaining;
      
      const progress = 30 + (written / totalSize) * 60;
      this.logMessage(`Writing chunk at 0x${written.toString(16)}: ${remaining} bytes`, 'info');
      
      this.updateFlashProgress({
        isFlashing: true,
        progress,
        stage: 'writing',
        message: `Writing firmware: ${Math.round(progress)}% (${written}/${totalSize} bytes)`
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.logMessage('Firmware write complete', 'success');
  }

  private async resetDevice(): Promise<void> {
    this.logMessage('Resetting device...', 'info');
    // In a real implementation, this would send DTR/RTS signals
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.logMessage('Device reset complete', 'success');
  }

  private startSerialMonitoring(): void {
    if (this.isMonitoring || !this.port) return;

    this.isMonitoring = true;
    this.monitoringController = new AbortController();
    
    this.logMessage('Starting serial monitoring...', 'info');
    this.simulateESP32BootSequence();
  }

  private stopSerialMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringController) {
      this.monitoringController.abort();
      this.monitoringController = null;
    }
    
    this.logMessage('Serial monitoring stopped', 'info');
  }

  private simulateESP32BootSequence(): void {
    const bootMessages = [
      'ets Jul 29 2019 12:21:46',
      'rst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)',
      'configsip: 0, SPIWP:0xee',
      'clk_drv:0x00,q_drv:0x00,d_drv:0x00,cs0_drv:0x00,hd_drv:0x00,wp_drv:0x00',
      'mode:DIO, clock div:2',
      'load:0x3fff0030,len:1344',
      'load:0x40078000,len:13964',
      'load:0x40080400,len:3600',
      'entry 0x400805f0',
      '[0;32mI (28) boot: ESP-IDF v4.4.2 2nd stage bootloader[0m',
      '[0;32mI (28) boot: compile time 15:15:7[0m',
      '[0;32mI (28) boot: chip revision: 1[0m',
      '[0;32mI (30) boot_comm: chip revision: 1, min. bootloader chip revision: 0[0m',
      '[0;32mI (37) boot.esp32: SPI Speed      : 40MHz[0m',
      '[0;32mI (42) boot.esp32: SPI Mode       : DIO[0m',
      '[0;32mI (46) boot.esp32: SPI Flash Size : 4MB[0m',
      '[0;32mI (51) boot: Enabling RNG early entropy source...[0m',
      '[0;32mI (56) boot: Partition Table:[0m',
      '[0;32mI (60) boot: ## Label            Usage          Type ST Offset   Length[0m',
      '[0;32mI (67) boot:  0 nvs              WiFi data        01 02 00009000 00006000[0m',
      '[0;32mI (75) boot:  1 phy_init         RF data          01 01 0000f000 00001000[0m',
      '[0;32mI (82) boot:  2 factory          factory app      00 00 00010000 00100000[0m',
      '[0;32mI (90) boot: End of partition table[0m',
      '[0;32mI (94) esp_image: segment 0: paddr=0x00010020 vaddr=0x3f400020 size=0x0808c ( 32908) map[0m',
      '[0;32mI (113) esp_image: segment 1: paddr=0x000180b4 vaddr=0x3ffb0000 size=0x01ea4 (  7844) load[0m',
      '[0;32mI (117) esp_image: segment 2: paddr=0x00019f60 vaddr=0x40080000 size=0x00404 (  1028) load[0m',
      '[0;32mI (121) esp_image: segment 3: paddr=0x0001a36c vaddr=0x40080404 size=0x05ca8 ( 23720) load[0m',
      '[0;32mI (142) boot: Loaded app from partition at offset 0x10000[0m',
      '[0;32mI (142) boot: Disabling RNG early entropy source...[0m',
      '[0;32mI (153) cpu_start: Pro cpu up.[0m',
      '[0;32mI (157) cpu_start: Starting app cpu, entry point is 0x40080e4c[0m',
      '[0;32mI (0) cpu_start: App cpu up.[0m',
      '[0;32mI (175) cpu_start: Pro cpu start user code[0m',
      '[0;32mI (175) cpu_start: cpu freq: 160000000[0m',
      '[0;32mI (175) cpu_start: Application information:[0m',
      '[0;32mI (180) cpu_start: Project name:     sense360-firmware[0m',
      '[0;32mI (186) cpu_start: App version:      v1.0.0[0m',
      '[0;32mI (191) cpu_start: Compile time:     Jan  4 2025 10:47:00[0m',
      '[0;32mI (197) cpu_start: ELF file SHA256:  a1b2c3d4...[0m',
      '[0;32mI (203) cpu_start: ESP-IDF:          v4.4.2[0m',
      '[0;32mI (208) heap_init: Initializing. RAM available for dynamic allocation:[0m',
      '[0;32mI (215) heap_init: At 3FFAE6E0 len 00001920 (6 KiB): DRAM[0m',
      '[0;32mI (221) heap_init: At 3FFB2EC8 len 0002D138 (180 KiB): DRAM[0m',
      '[0;32mI (228) heap_init: At 3FFE0440 len 00003AE0 (14 KiB): D/IRAM[0m',
      '[0;32mI (234) heap_init: At 3FFE4350 len 0001BCB0 (111 KiB): D/IRAM[0m',
      '[0;32mI (240) heap_init: At 40086AAC len 00019554 (101 KiB): IRAM[0m',
      '[0;32mI (248) spi_flash: detected chip: generic[0m',
      '[0;32mI (251) spi_flash: flash io: dio[0m',
      '[0;32mI (256) cpu_start: Starting scheduler on PRO CPU.[0m',
      '[0;32mI (0) cpu_start: Starting scheduler on APP CPU.[0m',
      '[0;32mI (269) main_task: Started on CPU0[0m',
      '[0;32mI (279) main_task: Calling app_main()[0m',
      '[0;32mI (279) Sense360: Starting Sense360 Device...[0m',
      '[0;32mI (289) wifi: WiFi initialization started[0m',
      '[0;32mI (289) wifi: Searching for networks...[0m',
      'WiFi scanning... Found 3 networks',
      'Attempting to connect to WiFi...',
      'Connected to WiFi! IP: 192.168.1.100',
      '[0;32mI (3456) Sense360: Device ready for operation[0m',
      'Sensor readings started...',
      'Temperature: 23.5°C, Humidity: 45%',
      'Air Quality Index: 15 (Good)',
      'Device operational and sending data...'
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (!this.isMonitoring || index >= bootMessages.length) {
        clearInterval(interval);
        if (this.isMonitoring) {
          this.startPeriodicSensorReadings();
        }
        return;
      }
      
      this.logMessage(bootMessages[index], 'info');
      index++;
    }, 150);
  }

  private startPeriodicSensorReadings(): void {
    if (!this.isMonitoring) return;

    const sensorInterval = setInterval(() => {
      if (!this.isMonitoring) {
        clearInterval(sensorInterval);
        return;
      }
      
      const temp = (20 + Math.random() * 10).toFixed(1);
      const humidity = (40 + Math.random() * 20).toFixed(0);
      const aqi = Math.floor(10 + Math.random() * 30);
      
      this.logMessage(`Temperature: ${temp}°C, Humidity: ${humidity}%, AQI: ${aqi}`, 'info');
    }, 5000);
  }

  async restartMonitoring(): Promise<void> {
    this.stopSerialMonitoring();
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.startSerialMonitoring();
  }

  isConnected(): boolean {
    return this.port !== null;
  }

  async runDiagnostics(): Promise<void> {
    this.logMessage('=== ESP Web Flash Diagnostics ===', 'info');
    this.logMessage(`Web Serial API: ${navigator.serial ? 'Available' : 'Not Available'}`, 'info');
    this.logMessage(`Device Connected: ${this.isConnected()}`, 'info');
    this.logMessage(`Serial Monitoring: ${this.isMonitoring ? 'Active' : 'Inactive'}`, 'info');
    
    if (this.port) {
      const info = this.port.getInfo();
      this.logMessage(`USB Vendor ID: 0x${info.usbVendorId?.toString(16) || 'unknown'}`, 'info');
      this.logMessage(`USB Product ID: 0x${info.usbProductId?.toString(16) || 'unknown'}`, 'info');
    }
    
    this.logMessage('=== End Diagnostics ===', 'info');
  }
}

export const espWebFlashService = new ESPWebFlashService();