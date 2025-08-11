import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Forward } from 'lucide-react';
import { Message } from '@/types/chat';
import { ForwardMessageDialog } from './ForwardMessageDialog';

interface MessageForwardingProps {
  message: Message;
  onForward?: () => void;
}

export function MessageForwarding({ message, onForward }: MessageForwardingProps) {
  const [showForwardDialog, setShowForwardDialog] = useState(false);

  const handleForwardClick = () => {
    setShowForwardDialog(true);
  };

  const handleForwardComplete = () => {
    setShowForwardDialog(false);
    onForward?.();
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleForwardClick}
        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Forward message"
      >
        <Forward className="h-3 w-3" />
      </Button>

      <ForwardMessageDialog
        open={showForwardDialog}
        onOpenChange={setShowForwardDialog}
        messages={[message]}
        onForward={handleForwardComplete}
      />
    </>
  );
}