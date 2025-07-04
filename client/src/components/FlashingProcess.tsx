import { useState } from 'react';
import { Download, Trash2, CheckCircle, Circle, Monitor, Terminal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ParsedFirmware, FlashingState } from '../types';
import { robustSerialService } from '../services/robust-serial';
import { githubService } from '../services/github';
import { SerialMonitor } from './SerialMonitor';

interface FlashingProcessProps {
  isDeviceConnected: boolean;
  selectedFirmware: ParsedFirmware | null;
  onFlashComplete: () => void;
}

export function FlashingProcess({ isDeviceConnected, selectedFirmware, onFlashComplete }: FlashingProcessProps) {
  const [flashingState, setFlashingState] = useState<FlashingState>({
    isFlashing: false,
    progress: 0,
    stage: 'idle',
    message: '',
  });
  const [isSerialMonitorOpen, setIsSerialMonitorOpen] = useState(false);

  const handleFlash = async () => {
    if (!selectedFirmware) return;

    try {
      setFlashingState({
        isFlashing: true,
        progress: 0,
        stage: 'connecting',
        message: 'Downloading firmware...',
      });

      // Download firmware
      const firmwareData = await githubService.downloadFirmware(selectedFirmware.downloadUrl);
      
      // Set up flash progress handler
      robustSerialService.setFlashProgressHandler(setFlashingState);
      
      // Start flashing
      await robustSerialService.flashFirmware(firmwareData);
      
      // Flash completed
      onFlashComplete();
      
      // Auto-open serial monitor after successful flash to show boot logs
      setTimeout(() => {
        setIsSerialMonitorOpen(true);
      }, 1000);
      
    } catch (error) {
      setFlashingState({
        isFlashing: false,
        progress: 0,
        stage: 'error',
        message: error instanceof Error ? error.message : 'Flash failed',
      });
    }
  };

  const handleErase = async () => {
    if (!isDeviceConnected) {
      setFlashingState({
        isFlashing: false,
        progress: 0,
        stage: 'error',
        message: 'No device connected. Please connect a device first.',
      });
      return;
    }

    try {
      setFlashingState({
        isFlashing: true,
        progress: 0,
        stage: 'erasing',
        message: 'Erasing flash memory...',
      });

      // Set up flash progress handler to track erase progress
      robustSerialService.setFlashProgressHandler(setFlashingState);
      
      // Start erasing - this will show detailed progress
      await robustSerialService.eraseFlash();
      
      // Erase completed
      setFlashingState({
        isFlashing: false,
        progress: 100,
        stage: 'complete',
        message: 'Flash erased successfully! Device is ready for new firmware.',
      });
      
    } catch (error) {
      console.error('Erase failed:', error);
      setFlashingState({
        isFlashing: false,
        progress: 0,
        stage: 'error',
        message: error instanceof Error ? error.message : 'Failed to erase flash memory',
      });
    }
  };

  const handleReconnectMonitor = async () => {
    try {
      setFlashingState({
        isFlashing: true,
        progress: 0,
        stage: 'connecting',
        message: 'Reconnecting to device for monitoring...',
      });

      await robustSerialService.restartMonitoring();
      
      setFlashingState({
        isFlashing: false,
        progress: 100,
        stage: 'complete',
        message: 'Device monitoring restarted successfully',
      });
    } catch (error) {
      setFlashingState({
        isFlashing: false,
        progress: 0,
        stage: 'error',
        message: `Reconnect failed: ${error}`,
      });
    }
  };

  const canFlash = isDeviceConnected && selectedFirmware && !flashingState.isFlashing;
  const canErase = isDeviceConnected && !flashingState.isFlashing;
  const canMonitor = isDeviceConnected && !flashingState.isFlashing;

  // Debug logging to identify the issue
  console.log('FlashingProcess Debug:', {
    isDeviceConnected,
    selectedFirmware: selectedFirmware ? {
      id: selectedFirmware.id,
      name: selectedFirmware.name,
      downloadUrl: selectedFirmware.downloadUrl
    } : null,
    isFlashing: flashingState.isFlashing,
    canFlash,
    canErase
  });

  const getStepStatus = (stepNumber: number): 'completed' | 'active' | 'pending' => {
    if (stepNumber === 1 && isDeviceConnected) return 'completed';
    if (stepNumber === 2 && selectedFirmware) return 'completed';
    if (stepNumber === 3 && flashingState.stage === 'complete') return 'completed';
    if (stepNumber === 3 && flashingState.isFlashing) return 'active';
    return 'pending';
  };

  const StepIcon = ({ stepNumber }: { stepNumber: number }) => {
    const status = getStepStatus(stepNumber);
    
    if (status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    
    if (status === 'active') {
      return (
        <div className="w-5 h-5 bg-sense360-blue rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-medium">{stepNumber}</span>
        </div>
      );
    }
    
    return (
      <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center">
        <span className="text-gray-600 text-xs font-medium">{stepNumber}</span>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Flashing Process</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mb-6">
          <div className="flex items-center space-x-4">
            <StepIcon stepNumber={1} />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">Device Connected</h3>
              <p className="text-sm text-gray-500">ESP32 device detected and ready</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <StepIcon stepNumber={2} />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">Firmware Selected</h3>
              <p className="text-sm text-gray-500">Choose firmware version to install</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <StepIcon stepNumber={3} />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">Flashing Complete</h3>
              <p className="text-sm text-gray-500">Device will reboot automatically</p>
            </div>
          </div>
        </div>

        {flashingState.isFlashing && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{flashingState.message}</span>
              <span className="text-sm text-gray-500">{flashingState.progress}%</span>
            </div>
            <Progress value={flashingState.progress} className="h-2" />
          </div>
        )}

        <div className={`border rounded-lg p-4 mb-6 ${
          flashingState.stage === 'error' ? 'bg-red-50 border-red-200' : 
          flashingState.stage === 'complete' ? 'bg-green-50 border-green-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center space-x-2">
            {flashingState.stage === 'error' && <Circle className="w-4 h-4 text-red-600" />}
            {flashingState.stage === 'complete' && <CheckCircle className="w-4 h-4 text-green-600" />}
            {flashingState.stage !== 'error' && flashingState.stage !== 'complete' && (
              <Circle className="w-4 h-4 text-blue-600" />
            )}
            <span className={`text-sm font-medium ${
              flashingState.stage === 'error' ? 'text-red-900' :
              flashingState.stage === 'complete' ? 'text-green-900' :
              'text-blue-900'
            }`}>
              {flashingState.stage === 'error' ? 'Flash Failed' :
               flashingState.stage === 'complete' ? 'Flash Complete' :
               flashingState.isFlashing ? 'Flashing...' : 'Ready to Flash'}
            </span>
          </div>
          <p className={`text-sm mt-1 ${
            flashingState.stage === 'error' ? 'text-red-700' :
            flashingState.stage === 'complete' ? 'text-green-700' :
            'text-blue-700'
          }`}>
            {flashingState.message || 
             (canFlash ? 'Ready to flash firmware.' : 
              `Missing: ${!isDeviceConnected ? 'device connection' : ''}${!isDeviceConnected && !selectedFirmware ? ' and ' : ''}${!selectedFirmware ? 'firmware selection' : ''}.`)}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex space-x-4">
            <Button
              onClick={handleFlash}
              disabled={!canFlash}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Flash Firmware
            </Button>
            <Button
              onClick={handleErase}
              disabled={!canErase}
              variant="destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Erase Flash
            </Button>
          </div>
          
          <Button
            onClick={() => setIsSerialMonitorOpen(true)}
            disabled={!isDeviceConnected}
            variant="outline"
            className="w-full"
          >
            <Terminal className="w-4 h-4 mr-2" />
            Open Serial Monitor
          </Button>
          
          {flashingState.stage === 'complete' && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Firmware Flashed Successfully!</span>
              </div>
              <p className="text-sm text-green-700 mb-3">
                Your ESP32 device should now be running the new firmware. Click "Open Serial Monitor" to view device boot logs and verify operation.
              </p>
              <div className="space-y-1 text-xs text-green-600">
                <p>• Device boot logs will show automatically</p>
                <p>• WiFi setup and sensor initialization</p>
                <p>• Download logs for troubleshooting</p>
                <p>• Monitor real-time sensor data</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <SerialMonitor
        isOpen={isSerialMonitorOpen}
        onClose={() => setIsSerialMonitorOpen(false)}
        isConnected={isDeviceConnected}
      />
    </Card>
  );
}
