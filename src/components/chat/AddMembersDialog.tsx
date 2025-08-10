import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, UserPlus, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Profile } from '@/types/chat';

interface AddMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  currentParticipants: string[];
  onMembersAdded: () => void;
}

export function AddMembersDialog({ 
  open, 
  onOpenChange, 
  roomId, 
  currentParticipants,
  onMembersAdded 
}: AddMembersDialogProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open, searchTerm]);

  const fetchUsers = async () => {
    let query = supabase
      .from('profiles')
      .select('*')
      .not('id', 'in', `(${currentParticipants.join(',')})`)
      .order('username');

    if (searchTerm.trim()) {
      query = query.ilike('username', `%${searchTerm.trim()}%`);
    }

    const { data } = await query.limit(20);
    setUsers((data || []) as Profile[]);
  };

  const handleUserSelect = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;

    setLoading(true);

    try {
      const participants = selectedUsers.map(userId => ({
        room_id: roomId,
        user_id: userId,
        role: 'member' as const
      }));

      const { error } = await supabase
        .from('room_participants')
        .insert(participants);

      if (error) throw error;

      toast({
        title: 'Members added successfully!',
        description: `${selectedUsers.length} member(s) added to the group.`
      });

      setSelectedUsers([]);
      onOpenChange(false);
      onMembersAdded();

    } catch (error: any) {
      toast({
        title: 'Error adding members',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    !currentParticipants.includes(user.id) && user.id !== profile?.id
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Members
          </DialogTitle>
          <DialogDescription>
            Search and select users to add to this group chat.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search-users">Search Users</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-users"
                placeholder="Search by username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <Label>Selected ({selectedUsers.length})</Label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(userId => {
                  const user = users.find(u => u.id === userId);
                  if (!user) return null;
                  
                  return (
                    <Badge key={userId} variant="secondary" className="flex items-center gap-1">
                      {user.username}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleUserSelect(userId, false)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Users List */}
          <div className="space-y-2">
            <Label>Available Users</Label>
            <ScrollArea className="h-48 border rounded-md">
              <div className="p-2 space-y-2">
                {filteredUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {searchTerm ? 'No users found' : 'No available users'}
                  </p>
                ) : (
                  filteredUsers.map(user => (
                    <div key={user.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => handleUserSelect(user.id, checked as boolean)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || ''} />
                        <AvatarFallback>
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{user.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.status === 'online' ? 'Online' : 'Offline'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddMembers} 
            disabled={loading || selectedUsers.length === 0}
          >
            {loading ? 'Adding...' : `Add ${selectedUsers.length} Member${selectedUsers.length === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}