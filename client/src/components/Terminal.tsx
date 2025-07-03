import { useEffect, useState, useRef } from 'react';
import { X, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TerminalMessage } from '../types';
import { serialService } from '../services/serial';

export function Terminal() {
  const [messages, setMessages] = useState<TerminalMessage[]>([]);
  const [showRawOutput, setShowRawOutput] = useState(false);
  const [rawSerialData, setRawSerialData] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set up message handler
    serialService.setMessageHandler((message: TerminalMessage) => {
      setMessages(prev => [...prev, message]);
    });

    // Initial messages
    setMessages([
      {
        id: '1',
        message: '// Terminal output will appear here',
        type: 'info',
        timestamp: new Date(),
      },
      {
        id: '2',
        message: '// Connect a device to begin',
        type: 'info',
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [messages]);

  const clearTerminal = () => {
    setMessages([
      {
        id: Date.now().toString(),
        message: '// Terminal cleared',
        type: 'info',
        timestamp: new Date(),
      },
    ]);
  };

  const getMessageColor = (type: TerminalMessage['type']): string => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'success': return 'text-cyan-400';
      case 'info':
      default: return 'text-green-400';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{showRawOutput ? 'Raw Serial Output' : 'Terminal'}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowRawOutput(!showRawOutput)}
              className="h-6 w-6 text-gray-400 hover:text-gray-600"
              title="Toggle raw serial output"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearTerminal}
              className="h-6 w-6 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={terminalRef}
          className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm"
        >
          {showRawOutput ? (
            <div className="space-y-1">
              <div className="text-gray-400 text-xs border-b border-gray-700 pb-2 mb-2">
                Raw Serial Communication (Advanced Mode)
              </div>
              {rawSerialData.length === 0 ? (
                <div className="text-gray-500">
                  No raw serial data captured yet. Connect device and start flashing to see raw communication.
                </div>
              ) : (
                rawSerialData.map((data, index) => (
                  <div key={index} className="text-green-300 text-xs">
                    {data}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`${getMessageColor(message.type)} ${
                    message.type === 'info' && message.message.startsWith('//') ? 'text-gray-400' : ''
                  }`}
                >
                  <span className="text-gray-500 text-xs">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                  {' '}
                  {message.message}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
