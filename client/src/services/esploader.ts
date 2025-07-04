import { ESPLoader } from 'esptool-js';
import { TerminalMessage, DeviceInfo, FlashingState } from '../types';

export class ProductionESPService {
  private loader: ESPLoader | null = null;
  private port: SerialPort | null = null;
  private onMessage?: (message: TerminalMessage) => void;
  private onFlashProgress?: (progress: FlashingState) => void;
  private onConnectionChange?: (isConnected: boolean) => void;
  private isMonitoring: boolean = false;
  private monitoringAbortController: AbortController | null = null;

  constructor() {
    this.checkWebSerialSupport();
  }

  private checkWebSerialSupport(): void {
    if (!('serial' in navigator)) {
      this.logMessage('Web Serial API not supported. Please use Chrome, Edge, or Opera.', 'error');
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
      id: Math.random().toString(36),
      message,
      type,
      timestamp: new Date(),
    };
    this.onMessage?.(logMessage);
  }

  private createTerminalInterface() {
    return {
      clean: () => {
        // Terminal clean is handled by UI component
      },
      writeLine: (data: string) => {
        this.logMessage(data, 'info');
      },
      write: (data: string) => {
        this.logMessage(data, 'info');
      }
    };
  }

  async requestPort(): Promise<SerialPort> {
    try {
      if (!('serial' in navigator)) {
        throw new Error('Web Serial API not supported');
      }

      const port = await navigator.serial.requestPort({
        filters: [
          { usbVendorId: 0x10c4, usbProductId: 0xea60 }, // CP210x
          { usbVendorId: 0x1a86, usbProductId: 0x7523 }, // CH340
          { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FTDI
          { usbVendorId: 0x303a }, // Espressif chips
        ]
      });

      this.logMessage('Serial port selected', 'success');
      return port;
    } catch (error) {
      this.logMessage(`Failed to select port: ${error}`, 'error');
      throw error;
    }
  }

  async connect(port?: SerialPort): Promise<DeviceInfo> {
    try {
      if (!port) {
        port = await this.requestPort();
      }

      this.port = port;
      this.logMessage('Connecting to ESP32...', 'info');

      // Create ESPLoader with terminal interface
      const terminal = this.createTerminalInterface();
      this.loader = new ESPLoader(port, terminal);

      // Connect and get chip info
      await this.loader.connect();
      
      const chipInfo = await this.loader.getChipInfo();
      this.logMessage(`Connected to ${chipInfo}`, 'success');

      // Get device info
      const deviceInfo: DeviceInfo = {
        chipType: chipInfo,
        macAddress: await this.loader.getMacAddress() || 'Unknown',
        flashSize: '4MB', // Default, could be detected
        firmware: 'Unknown'
      };

      this.logMessage(`MAC Address: ${deviceInfo.macAddress}`, 'info');
      this.onConnectionChange?.(true);

      // Start monitoring
      this.startSerialMonitoring();

      return deviceInfo;
    } catch (error) {
      this.logMessage(`Connection failed: ${error}`, 'error');
      this.onConnectionChange?.(false);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.stopSerialMonitoring();
      
      if (this.loader) {
        await this.loader.disconnect();
        this.loader = null;
      }
      
      this.port = null;
      this.logMessage('Disconnected from device', 'info');
      this.onConnectionChange?.(false);
    } catch (error) {
      this.logMessage(`Disconnect error: ${error}`, 'error');
    }
  }

  async flashFirmware(firmwareData: ArrayBuffer): Promise<void> {
    if (!this.loader) {
      throw new Error('Device not connected');
    }

    try {
      this.stopSerialMonitoring();
      
      this.logMessage('=== STARTING ESP32 FIRMWARE FLASH ===', 'info');
      this.logMessage(`Firmware size: ${firmwareData.byteLength} bytes`, 'info');

      this.onFlashProgress?.({
        isFlashing: true,
        progress: 0,
        stage: 'connecting',
        message: 'Preparing to flash...',
      });

      // Convert ArrayBuffer to Uint8Array
      const firmwareUint8 = new Uint8Array(firmwareData);

      // Flash at offset 0x0 (factory app partition)
      const offset = 0x0;
      this.logMessage(`Flashing firmware at offset 0x${offset.toString(16).padStart(8, '0')}`, 'info');

      this.onFlashProgress?.({
        isFlashing: true,
        progress: 10,
        stage: 'erasing',
        message: 'Erasing flash...',
      });

      // Flash the firmware
      await this.loader.flashBinary(firmwareUint8, offset, (bytesWritten: number, totalBytes: number) => {
        const progress = 20 + Math.round((bytesWritten / totalBytes) * 60);
        this.onFlashProgress?.({
          isFlashing: true,
          progress,
          stage: 'writing',
          message: `Writing firmware: ${Math.round((bytesWritten / totalBytes) * 100)}%`,
        });
        
        if (bytesWritten % 32768 === 0) {
          this.logMessage(`Written ${bytesWritten}/${totalBytes} bytes`, 'info');
        }
      });

      this.onFlashProgress?.({
        isFlashing: true,
        progress: 90,
        stage: 'verifying',
        message: 'Verifying flash...',
      });

      // Reset the device
      await this.loader.hardReset();
      this.logMessage('Device reset, starting firmware...', 'success');

      this.onFlashProgress?.({
        isFlashing: false,
        progress: 100,
        stage: 'complete',
        message: 'Flash completed successfully!',
      });

      // Restart monitoring after a delay
      setTimeout(() => {
        this.startSerialMonitoring();
      }, 2000);

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
    if (!this.loader) {
      throw new Error('Device not connected');
    }

    try {
      this.stopSerialMonitoring();
      
      this.logMessage('=== ERASING ESP32 FLASH ===', 'info');
      
      this.onFlashProgress?.({
        isFlashing: true,
        progress: 0,
        stage: 'erasing',
        message: 'Erasing flash memory...',
      });

      // Erase flash
      await this.loader.eraseFlash();
      
      this.onFlashProgress?.({
        isFlashing: false,
        progress: 100,
        stage: 'complete',
        message: 'Flash erased successfully!',
      });

      this.logMessage('Flash erased successfully', 'success');
      
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
    if (!this.port || this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringAbortController = new AbortController();
    
    this.logMessage('Starting serial monitoring...', 'info');
    
    // Start real serial monitoring
    this.startRealSerialMonitoring().catch(error => {
      this.logMessage(`Monitoring error: ${error}`, 'error');
    });
  }

  private stopSerialMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    this.monitoringAbortController?.abort();
    this.logMessage('Serial monitoring stopped', 'info');
  }

  private async startRealSerialMonitoring(): Promise<void> {
    if (!this.port || !this.port.readable) return;

    try {
      await this.port.open({ baudRate: 115200 });
      const reader = this.port.readable.getReader();
      const decoder = new TextDecoder();

      while (this.isMonitoring && !this.monitoringAbortController?.signal.aborted) {
        try {
          const { value, done } = await reader.read();
          if (done) break;

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

      reader.releaseLock();
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
    return this.loader !== null && this.port !== null;
  }
}

// Export singleton instance
export const productionESPService = new ProductionESPService();