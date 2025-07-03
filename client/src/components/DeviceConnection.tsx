import { Usb, Wifi, WifiOff, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeviceConnection } from '../hooks/useDeviceConnection';
import { serialService } from '../services/serial';

export function DeviceConnection() {
  const { isConnected, isConnecting, device, error, connect, disconnect } = useDeviceConnection();

  const runDiagnostics = async () => {
    try {
      // This will trigger the diagnostic logging in the terminal
      await serialService.runDiagnostics();
    } catch (error) {
      console.error('Diagnostic test failed:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Device Connection</CardTitle>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-500">
              {isConnected ? 'Device connected' : 'No device connected'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          Connect your ESP32-based Sense360 device via USB cable to begin flashing firmware.
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        {isConnected && device && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              <strong>Connected:</strong> {device.chipType} ({device.macAddress})
            </p>
          </div>
        )}
        
        <div className="flex space-x-3">
          {!isConnected ? (
            <>
              <Button
                onClick={connect}
                disabled={isConnecting}
                className="bg-sense360-blue hover:bg-indigo-700"
              >
                <Usb className="w-4 h-4 mr-2" />
                {isConnecting ? 'Connecting...' : 'Connect Device'}
              </Button>
              <Button
                onClick={runDiagnostics}
                variant="outline"
                disabled={isConnecting}
              >
                <Bug className="w-4 h-4 mr-2" />
                Test Diagnostics
              </Button>
            </>
          ) : (
            <Button
              onClick={disconnect}
              variant="outline"
            >
              <WifiOff className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
