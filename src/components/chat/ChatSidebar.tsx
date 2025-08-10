import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Search,
  Settings,
  LogOut,
  MessageCircle,
  Users,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ChatRoomWithDetails } from '@/types/chat';
import { cn } from '@/lib/utils';
import { CreateChatDialog } from './CreateChatDialog';

interface ChatSidebarProps {
  selectedRoomId: string | null;
  onRoomSelect: (roomId: string) => void;
}

export function ChatSidebar({ selectedRoomId, onRoomSelect }: ChatSidebarProps) {
  const { profile, signOut } = useAuth();
  const [rooms, setRooms] = useState<ChatRoomWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (profile) {
      fetchRooms();
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      const participantSubscription = supabase
        .channel(`user_participants:${profile.id}`) // Unique channel for this user
        .on('postgres_changes', {
          event: 'INSERT', // Listen for new participations
          schema: 'public',
          table: 'room_participants',
          filter: `user_id=eq.${profile.id}` // Filter by current user
        }, async (payload) => {
          console.log('New participant entry received:', payload);

          const newParticipant = payload.new;
          if (newParticipant) {
            // Fetch details of the new room
            const { data: newRoom } = await supabase
              .from('chat_rooms')
              .select('*')
              .eq('id', newParticipant.room_id)
              .single();

            if (newRoom) {
              setRooms(prevRooms => {
                if (!prevRooms.find(room => room.id === newRoom.id)) {
                  // Fetch full details including participants before adding to state
                  supabase
                    .from('chat_rooms')
                    .select(`
                      *,
                      room_participants(
                        id,
                        user_id,
                        role
                      )
                    `)
                    .eq('id', newRoom.id)
                    .single()
                    .then(({ data, error }) => {
                      if (data && !error) {
                        const transformedRoom = {
                          ...data,
                          participants: (data.room_participants || []).map(p => ({
                            ...p,
                            room_id: data.id,
                            joined_at: new Date().toISOString() // Adjust this if you store joined_at
                          }))
                        };
                        setRooms(prev => [transformedRoom as ChatRoomWithDetails, ...prev]); // Add at the beginning
                      } else if (error) {
                        console.error('Error fetching detailed new room:', error);
                      }
                    });
                }
                return prevRooms; // Return previous state while fetching detailed data
              });
            }
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(participantSubscription);
      };
    }
  }, [profile]); // Re-run effect if profile changes

  const fetchRooms = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('chat_rooms')
      .select(`
        *,
        room_participants(
          id,
          user_id,
          role
        )
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching rooms:', error);
      return;
    }

    // Transform data to match our types
    const transformedRooms = (data || []).map(room => ({
      ...room,
      participants: (room.room_participants || []).map(p => ({
        ...p,
        room_id: room.id,
        joined_at: new Date().toISOString()
      }))
    }));

    setRooms(transformedRooms as ChatRoomWithDetails[]);
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatLastSeen = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) return 'now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full border-r bg-card">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback>
                {profile?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{profile?.username}</p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-muted-foreground">online</span>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search chats..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="p-4">
        <CreateChatDialog onRoomCreated={onRoomSelect} />
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors",
                selectedRoomId === room.id && "bg-accent"
              )}
              onClick={() => onRoomSelect(room.id)}
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={room.avatar_url || ''} />
                <AvatarFallback>
                  {room.is_group ? (
                    <Users className="h-6 w-6" />
                  ) : (
                    <MessageCircle className="h-6 w-6" />
                  )}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm truncate">{room.name}</p>
                  <span className="text-xs text-muted-foreground">
                    {formatLastSeen(room.updated_at)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground truncate">
                    {room.description || 'No messages yet...'}
                  </p>
                  {room.is_group && (
                    <Badge variant="secondary" className="text-xs">
                      {room.participants?.length || 0}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}