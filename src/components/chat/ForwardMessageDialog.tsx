import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Message } from '@/types/chat';
import { Users, MessageSquare } from 'lucide-react';

interface ChatRoom {
  id: string;
  name: string;
  is_group: boolean;
}

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: Message[];
  onForward: () => void;
}

export function ForwardMessageDialog({ open, onOpenChange, messages, onForward }: ForwardMessageDialogProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [showForwardedFrom, setShowForwardedFrom] = useState(true);

  // Load chat rooms when dialog opens
  useEffect(() => {
    if (open) {
      loadChatRooms();
    }
  }, [open]);

  const loadChatRooms = async () => {
    // Get rooms where user is participant  
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('id, name, is_group')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setChatRooms(data);
    }
  };

  const handleRoomToggle = (roomId: string) => {
    setSelectedRooms(prev =>
      prev.includes(roomId)
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  const getOriginalSenderUsername = async (userId: string | null): Promise<string> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();
    if (error || !data) {
      console.error('Error fetching original sender username:', error);
      return 'Unknown User';
    }
    return data.username || 'Unknown User';
  };

  const forwardToRooms = async () => {
    if (!profile || selectedRooms.length === 0) return;

    // Create forwarded messages with proper handling for different message types
    const forwardedMessages = await Promise.all(messages.map(async msg => {
      const originalSenderUsername = showForwardedFrom ? await getOriginalSenderUsername(msg.user_id) : '';
      const forwardedPrefix = `(Forwarded from ${originalSenderUsername}): `;
      const baseMessage = {
        user_id: profile.id,
        room_id: '', 
        message_type: msg.message_type,
        file_url: msg.file_url,
        file_name: msg.file_name,
        file_size: msg.file_size,
      };

      // Handle different message types for forwarding
      switch (msg.message_type) {
        case 'file':
        case 'image':
          return {
            ...baseMessage,
            content: `${forwardedPrefix}📤 Forwarded file: ${msg.file_name || msg.content}`,
          };
        case 'gif':
          return {
            ...baseMessage,
            content: `${forwardedPrefix}📤 Forwarded GIF: ${msg.content}`,
          };
        case 'sticker':
          return {
            ...baseMessage,
            content: `${forwardedPrefix}📤 Forwarded sticker: ${msg.content}`,
          };
        default:
          return {
            ...baseMessage,
            content: `${forwardedPrefix}${msg.content}`,
          };
      }
    }));

    // Insert messages into each selected room
    for (const roomId of selectedRooms) {
      const roomMessages = forwardedMessages.map(msg => ({
        ...msg,
        room_id: roomId
      }));

      await supabase
        .from('messages')
        .insert(roomMessages);
    }
  };

  const handleForward = async () => {
    setLoading(true);
    try {
      await forwardToRooms();
      onForward();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Forward {messages.length} Message(s)</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showForwardedFrom"
              checked={showForwardedFrom}
              onCheckedChange={(checked) => setShowForwardedFrom(!!checked)}
            />
            <Label htmlFor="showForwardedFrom">Show forwarded from username</Label>
          </div>
          <Label>Select Destinations:</Label>
          <ScrollArea className="h-48 border rounded-md p-2">
            <div className="space-y-3">
              {/* Group Chats */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  Group Chats
                </h4>
                {chatRooms.filter(room => room.is_group).map((room) => (
                  <div key={room.id} className="flex items-center space-x-2 py-1 ml-4">
                    <Checkbox
                      id={room.id}
                      checked={selectedRooms.includes(room.id)}
                      onCheckedChange={() => handleRoomToggle(room.id)}
                    />
                    <Label htmlFor={room.id} className="flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      {room.name}
                    </Label>
                  </div>
                ))}
              </div>

              {/* Direct Messages */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <MessageSquare className="h-3 w-3" />
                  Direct Messages
                </h4>
                {chatRooms.filter(room => !room.is_group).map((room) => (
                  <div key={room.id} className="flex items-center space-x-2 py-1 ml-4">
                    <Checkbox
                      id={room.id}
                      checked={selectedRooms.includes(room.id)}
                      onCheckedChange={() => handleRoomToggle(room.id)}
                    />
                    <Label htmlFor={room.id} className="flex items-center gap-2">
                      <MessageSquare className="h-3 w-3" />
                      {room.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleForward}
            disabled={loading || selectedRooms.length === 0}
          >
            {loading ? 'Forwarding...' : 'Forward'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}