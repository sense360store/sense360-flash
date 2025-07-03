import { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TerminalMessage } from '../types';
import { serialService } from '../services/serial';

export function Terminal() {
  const [messages, setMessages] = useState<TerminalMessage[]>([]);
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
          <CardTitle>Terminal</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={clearTerminal}
            className="h-6 w-6 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={terminalRef}
          className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm"
        >
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
        </div>
      </CardContent>
    </Card>
  );
}
