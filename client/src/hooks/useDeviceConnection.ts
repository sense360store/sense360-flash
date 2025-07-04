import { useState, useCallback, useEffect } from 'react';
import { DeviceConnectionState, DeviceInfo } from '../types';
import { espWebFlashService } from '../services/esp-web-flash';

export function useDeviceConnection() {
  const [state, setState] = useState<DeviceConnectionState>({
    isConnected: false,
    isConnecting: false,
  });

  // Synchronize React state with serial service state on mount and listen for changes
  useEffect(() => {
    const checkInitialConnection = async () => {
      const serviceConnected = espWebFlashService.isConnected();
      console.log('useDeviceConnection: Initial connection check', { serviceConnected });
      
      setState({
        isConnected: serviceConnected,
        isConnecting: false,
      });
    };

    // Set up connection change listener
    const handleConnectionChange = async (isConnected: boolean) => {
      console.log('useDeviceConnection: Connection change event', { isConnected });
      setState({
        isConnected,
        isConnecting: false,
        error: undefined,
      });
    };

    // Register connection change handler
    espWebFlashService.setConnectionChangeHandler(handleConnectionChange);

    // Check initial connection
    checkInitialConnection();

    // Cleanup on unmount
    return () => {
      espWebFlashService.setConnectionChangeHandler(() => {});
    };
  }, []);

  const connect = useCallback(async () => {
    console.log('useDeviceConnection: Starting connection process');
    setState(prev => ({ ...prev, isConnecting: true, error: undefined }));

    try {
      const deviceInfo = await espWebFlashService.connect();
      console.log('useDeviceConnection: Connection successful', { deviceInfo });
      
      setState({
        isConnected: true,
        isConnecting: false,
        device: deviceInfo,
        error: undefined,
      });
      
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
      await espWebFlashService.disconnect();
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
