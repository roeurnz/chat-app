import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CreateChatDialogProps {
  onRoomCreated?: (roomId: string) => void;
}

export function CreateChatDialog({ onRoomCreated }: CreateChatDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const searchUsers = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${term}%`)
      .neq('id', profile?.id)
      .limit(10);

    setSearchResults((data || []) as Profile[]);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    searchUsers(term);
  };

  const toggleUserSelection = (user: Profile) => {
    setSelectedUsers(prev => {
      const isSelected = prev.find(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const createDirectChat = async (otherUser: Profile) => {
    if (!profile) return;

    setLoading(true);

    try {
      // Create room
      const { data: roomData, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name: `${profile.username}, ${otherUser.username}`,
          is_group: false,
          created_by: profile.id
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add participants
      const { error: participantError } = await supabase
        .from('room_participants')
        .insert([
          { room_id: roomData.id, user_id: profile.id, role: 'admin' },
          { room_id: roomData.id, user_id: otherUser.id, role: 'member' }
        ]);

      if (participantError) throw participantError;

      toast({ title: "Success", description: "Chat created successfully" });
      onRoomCreated?.(roomData.id);
      setOpen(false);
      resetForm();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to create chat", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const createGroupChat = async () => {
    if (!profile || !groupName.trim() || selectedUsers.length === 0) return;

    setLoading(true);

    try {
      // Create room
      const { data: roomData, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name: groupName.trim(),
          is_group: true,
          created_by: profile.id
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add participants (creator + selected users)
      const participants = [
        { room_id: roomData.id, user_id: profile.id, role: 'admin' },
        ...selectedUsers.map(user => ({
          room_id: roomData.id,
          user_id: user.id,
          role: 'member'
        }))
      ];

      const { error: participantError } = await supabase
        .from('room_participants')
        .insert(participants);

      if (participantError) throw participantError;

      toast({ title: "Success", description: "Group created successfully" });
      onRoomCreated?.(roomData.id);
      setOpen(false);
      resetForm();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to create group", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSelectedUsers([]);
    setGroupName('');
    setIsCreatingGroup(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCreatingGroup ? 'Create Group Chat' : 'Start New Chat'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!isCreatingGroup && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsCreatingGroup(false)}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Direct Chat
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsCreatingGroup(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Group Chat
              </Button>
            </div>
          )}

          {isCreatingGroup && (
            <>
              <Button 
                variant="ghost" 
                onClick={() => setIsCreatingGroup(false)}
                className="w-full justify-start p-0"
              >
                ← Back to chat options
              </Button>
              
              <div>
                <label className="text-sm font-medium">Group Name</label>
                <Input
                  placeholder="Enter group name..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {isCreatingGroup && selectedUsers.length > 0 && (
            <div>
              <label className="text-sm font-medium">Selected Members</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedUsers.map(user => (
                  <Badge 
                    key={user.id} 
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => toggleUserSelection(user)}
                  >
                    {user.username} ×
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto space-y-2">
            {searchResults.map(user => (
              <div
                key={user.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  isCreatingGroup
                    ? selectedUsers.find(u => u.id === user.id)
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted"
                    : "hover:bg-muted"
                )}
                onClick={() => {
                  if (isCreatingGroup) {
                    toggleUserSelection(user);
                  } else {
                    createDirectChat(user);
                  }
                }}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar_url || ''} />
                  <AvatarFallback>
                    {user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{user.username}</p>
                  <p className="text-sm text-muted-foreground capitalize">{user.status}</p>
                </div>
                {isCreatingGroup && selectedUsers.find(u => u.id === user.id) && (
                  <div className="h-4 w-4 rounded-full bg-primary" />
                )}
              </div>
            ))}
          </div>

          {isCreatingGroup && (
            <Button 
              onClick={createGroupChat} 
              disabled={!groupName.trim() || selectedUsers.length === 0 || loading}
              className="w-full"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}