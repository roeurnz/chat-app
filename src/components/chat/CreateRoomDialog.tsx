import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoomCreated: (roomId: string) => void;
}

export function CreateRoomDialog({ open, onOpenChange, onRoomCreated }: CreateRoomDialogProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isGroup: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !formData.name.trim()) return;

    setLoading(true);

    try {
      // Create the room
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          is_group: formData.isGroup,
          created_by: profile.id
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add creator as admin participant
      const { error: participantError } = await supabase
        .from('room_participants')
        .insert({
          room_id: room.id,
          user_id: profile.id,
          role: 'admin'
        });

      if (participantError) throw participantError;

      toast({
        title: 'Room created successfully!',
        description: `${formData.name} is ready for conversations.`
      });

      // Reset form and close dialog
      setFormData({ name: '', description: '', isGroup: true });
      onOpenChange(false);
      onRoomCreated(room.id);

    } catch (error: any) {
      toast({
        title: 'Error creating room',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Chat Room</DialogTitle>
          <DialogDescription>
            Create a new group or private chat room to start conversations.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="room-name">Room Name</Label>
            <Input
              id="room-name"
              placeholder="Enter room name..."
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="room-description">Description (Optional)</Label>
            <Textarea
              id="room-description"
              placeholder="Enter room description..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is-group">Group Chat</Label>
              <p className="text-sm text-muted-foreground">
                Allow multiple participants to join
              </p>
            </div>
            <Switch
              id="is-group"
              checked={formData.isGroup}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isGroup: checked }))}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading ? 'Creating...' : 'Create Room'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}