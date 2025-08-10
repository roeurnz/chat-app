import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Users, 
  UserPlus, 
  Crown, 
  Shield, 
  User, 
  MoreVertical,
  UserMinus 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ChatRoom, RoomParticipant } from '@/types/chat';
import { AddMembersDialog } from './AddMembersDialog';

interface GroupInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: ChatRoom;
}

export function GroupInfoDialog({ open, onOpenChange, room }: GroupInfoDialogProps) {
  const { profile } = useAuth();
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && room.id) {
      fetchParticipants();
    }
  }, [open, room.id]);

  const fetchParticipants = async () => {
    const { data } = await supabase
      .from('room_participants')
      .select('*')
      .eq('room_id', room.id)
      .order('role', { ascending: true })
      .order('joined_at', { ascending: true });

    if (data) {
      // Fetch profile data separately
      const userIds = data.map(p => p.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      const participantsWithProfiles = data.map(participant => ({
        ...participant,
        profile: profilesData?.find(p => p.id === participant.user_id) || null
      }));

      setParticipants(participantsWithProfiles as RoomParticipant[]);
    }
  };

  const currentUserRole = participants.find(p => p.user_id === profile?.id)?.role;
  const canManageMembers = currentUserRole === 'admin' || room.created_by === profile?.id;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-amber-500" />;
      case 'moderator':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'moderator':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleRemoveMember = async (participantId: string, username: string) => {
    if (!canManageMembers) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('room_participants')
        .delete()
        .eq('id', participantId);

      if (error) throw error;

      toast({
        title: 'Member removed',
        description: `${username} has been removed from the group.`
      });

      fetchParticipants();
    } catch (error: any) {
      toast({
        title: 'Error removing member',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (participantId: string, newRole: string, username: string) => {
    if (!canManageMembers) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('room_participants')
        .update({ role: newRole })
        .eq('id', participantId);

      if (error) throw error;

      toast({
        title: 'Role updated',
        description: `${username} is now a ${newRole}.`
      });

      fetchParticipants();
    } catch (error: any) {
      toast({
        title: 'Error updating role',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={room.avatar_url || ''} />
                <AvatarFallback>
                  <Users className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle>{room.name}</DialogTitle>
                <DialogDescription>
                  {room.description || 'Group chat'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Add Members Button */}
            {canManageMembers && (
              <Button 
                onClick={() => setShowAddMembers(true)}
                className="w-full"
                variant="outline"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Members
              </Button>
            )}

            {/* Members List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">
                  Members ({participants.length})
                </h4>
              </div>
              
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={participant.profile?.avatar_url || ''} />
                          <AvatarFallback>
                            {participant.profile?.username?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {participant.profile?.username}
                            {participant.user_id === profile?.id && (
                              <span className="text-muted-foreground"> (You)</span>
                            )}
                          </p>
                          <div className="flex items-center gap-1">
                            {getRoleIcon(participant.role)}
                            <Badge variant={getRoleBadgeVariant(participant.role)} className="text-xs">
                              {participant.role}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Actions for admins */}
                      {canManageMembers && participant.user_id !== profile?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {participant.role !== 'admin' && (
                              <DropdownMenuItem 
                                onClick={() => handleChangeRole(participant.id, 'admin', participant.profile?.username || 'User')}
                              >
                                <Crown className="h-4 w-4 mr-2" />
                                Make Admin
                              </DropdownMenuItem>
                            )}
                            {participant.role !== 'moderator' && (
                              <DropdownMenuItem 
                                onClick={() => handleChangeRole(participant.id, 'moderator', participant.profile?.username || 'User')}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Make Moderator
                              </DropdownMenuItem>
                            )}
                            {participant.role !== 'member' && (
                              <DropdownMenuItem 
                                onClick={() => handleChangeRole(participant.id, 'member', participant.profile?.username || 'User')}
                              >
                                <User className="h-4 w-4 mr-2" />
                                Make Member
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleRemoveMember(participant.id, participant.profile?.username || 'User')}
                              className="text-destructive"
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              Remove Member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Members Dialog */}
      <AddMembersDialog
        open={showAddMembers}
        onOpenChange={setShowAddMembers}
        roomId={room.id}
        currentParticipants={participants.map(p => p.user_id)}
        onMembersAdded={fetchParticipants}
      />
    </>
  );
}