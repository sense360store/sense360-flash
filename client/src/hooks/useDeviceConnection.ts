import { useState, useCallback, useEffect } from 'react';
import { DeviceConnectionState, DeviceInfo } from '../types';
import { serialService } from '../services/serial';

export function useDeviceConnection() {
  const [state, setState] = useState<DeviceConnectionState>({
    isConnected: false,
    isConnecting: false,
  });

  // Synchronize React state with serial service state on mount
  useEffect(() => {
    const checkInitialConnection = async () => {
      if (serialService.isConnected()) {
        try {
          const deviceInfo = await serialService.getDeviceInfo();
          setState({
            isConnected: true,
            isConnecting: false,
            device: deviceInfo,
            error: undefined,
          });
        } catch (error) {
          // If device info retrieval fails, reset connection state
          setState({
            isConnected: false,
            isConnecting: false,
            error: error instanceof Error ? error.message : 'Failed to get device info',
          });
        }
      }
    };

    checkInitialConnection();
  }, []);

  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: undefined }));

    try {
      const deviceInfo = await serialService.connect();
      setState({
        isConnected: true,
        isConnecting: false,
        device: deviceInfo,
        error: undefined,
      });
      return deviceInfo;
    } catch (error) {
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
