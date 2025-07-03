import { useState, useCallback, useEffect } from 'react';
import { DeviceConnectionState, DeviceInfo } from '../types';
import { serialService } from '../services/serial';

export function useDeviceConnection() {
  const [state, setState] = useState<DeviceConnectionState>({
    isConnected: false,
    isConnecting: false,
  });

  // Synchronize React state with serial service state on mount and listen for changes
  useEffect(() => {
    const checkInitialConnection = async () => {
      const serviceConnected = serialService.isConnected();
      console.log('useDeviceConnection: Initial connection check', { serviceConnected });
      
      if (serviceConnected) {
        try {
          const deviceInfo = await serialService.getDeviceInfo();
          console.log('useDeviceConnection: Setting connected state', { deviceInfo });
          setState({
            isConnected: true,
            isConnecting: false,
            device: deviceInfo,
            error: undefined,
          });
        } catch (error) {
          console.log('useDeviceConnection: Failed to get device info', error);
          // If device info retrieval fails, reset connection state
          setState({
            isConnected: false,
            isConnecting: false,
            error: error instanceof Error ? error.message : 'Failed to get device info',
          });
        }
      } else {
        console.log('useDeviceConnection: Service not connected, keeping disconnected state');
      }
    };

    // Set up connection change listener
    const handleConnectionChange = async (isConnected: boolean) => {
      console.log('useDeviceConnection: Connection change event', { isConnected });
      
      if (isConnected) {
        try {
          const deviceInfo = await serialService.getDeviceInfo();
          console.log('useDeviceConnection: Device connected via event', { deviceInfo });
          setState({
            isConnected: true,
            isConnecting: false,
            device: deviceInfo,
            error: undefined,
          });
        } catch (error) {
          console.log('useDeviceConnection: Failed to get device info on connection', error);
          setState({
            isConnected: false,
            isConnecting: false,
            error: error instanceof Error ? error.message : 'Failed to get device info',
          });
        }
      } else {
        console.log('useDeviceConnection: Device disconnected via event');
        setState({
          isConnected: false,
          isConnecting: false,
          device: undefined,
          error: undefined,
        });
      }
    };

    // Register connection change handler
    serialService.setConnectionChangeHandler(handleConnectionChange);

    // Check initial connection
    checkInitialConnection();

    // Cleanup on unmount
    return () => {
      serialService.setConnectionChangeHandler(() => {});
    };
  }, []);

  const connect = useCallback(async () => {
    console.log('useDeviceConnection: Starting connection process');
    setState(prev => ({ ...prev, isConnecting: true, error: undefined }));

    try {
      const deviceInfo = await serialService.connect();
      console.log('useDeviceConnection: Connection successful', { deviceInfo });
      
      setState({
        isConnected: true,
        isConnecting: false,
        device: deviceInfo,
        error: undefined,
      });
      
      // Verify service state after connection
      const serviceConnected = serialService.isConnected();
      console.log('useDeviceConnection: Service state after connection', { serviceConnected });
      
      return deviceInfo;
    } catch (error) {
      console.log('useDeviceConnection: Connection failed', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to device';
      setState({
        isConnected: false,
        isConnecting: false,
        error: errorMessage,
      });
      throw error;
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await serialService.disconnect();
      setState({
        isConnected: false,
        isConnecting: false,
        device: undefined,
        error: undefined,
      });
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }, []);

  return {
    ...state,
    connect,
    disconnect,
  };
}
