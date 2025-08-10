import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Phone, 
  Video, 
  MoreVertical,
  Users,
  MessageCircle,
  Edit2,
  Trash2,
  Check,
  X,
  Reply,
  CheckSquare,
  Square,
  FileText,
  Download,
  Image as ImageIcon,
  Plus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Message, ChatRoom, RoomParticipant, MessageReaction } from '@/types/chat';
import { cn } from '@/lib/utils';
import { GroupInfoDialog } from './GroupInfoDialog';
import { useToast } from '@/hooks/use-toast';
import { EmojiPicker } from './EmojiPicker';
import { MessageReactions } from './MessageReactions';

interface ChatWindowProps {
  roomId: string;
}

export function ChatWindow({ roomId }: ChatWindowProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingRoomName, setEditingRoomName] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (roomId) {
      fetchRoomData();
      fetchMessages();
      subscribeToMessages();
    }
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchRoomData = async () => {
    const { data: roomData } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    const { data: participantsData } = await supabase
      .from('room_participants')
      .select('*')
      .eq('room_id', roomId);

    setRoom(roomData);
    setParticipants((participantsData || []) as RoomParticipant[]);

    // Get current user's role
    if (profile) {
      const userParticipant = participantsData?.find(p => p.user_id === profile.id);
      setCurrentUserRole(userParticipant?.role || 'member');
    }
  };

  const fetchMessages = async () => {
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (messagesData) {
      // Fetch reactions for each message
      const messagesWithReactions = await Promise.all(
        messagesData.map(async (message) => {
          const reactions = await fetchMessageReactions(message.id);
          return { ...message, reactions };
        })
      );
      setMessages(messagesWithReactions as Message[]);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          const { data: newMessage } = await supabase
            .from('messages')
            .select('*')
            .eq('id', payload.new.id)
            .single();

          if (newMessage) {
            setMessages(prev => [...prev, newMessage as Message]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const uploadFile = async (file: File) => {
    if (!profile) return null;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${profile.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: "Error", description: "Failed to upload file", variant: "destructive" });
      setUploading(false);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('chat-files')
      .getPublicUrl(filePath);

    setUploading(false);
    return {
      url: publicUrl,
      name: file.name,
      size: file.size
    };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    const fileData = await uploadFile(file);
    if (!fileData) return;

    const messageData: any = {
      room_id: roomId,
      user_id: profile.id,
      content: file.name,
      message_type: 'file',
      file_url: fileData.url,
      file_name: fileData.name,
      file_size: fileData.size
    };

    if (replyingTo) {
      messageData.reply_to = replyingTo.id;
    }

    const { error } = await supabase
      .from('messages')
      .insert(messageData);

    if (!error) {
      setReplyingTo(null);
      toast({ title: "Success", description: "File sent" });
    } else {
      toast({ title: "Error", description: "Failed to send file", variant: "destructive" });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;

    setLoading(true);
    
    const messageData: any = {
      room_id: roomId,
      user_id: profile.id,
      content: newMessage.trim(),
      message_type: 'text'
    };

    if (replyingTo) {
      messageData.reply_to = replyingTo.id;
    }

    const { error } = await supabase
      .from('messages')
      .insert(messageData);

    if (!error) {
      setNewMessage('');
      setReplyingTo(null);
    }
    
    setLoading(false);
  };

  const startEditMessage = (message: Message) => {
    setEditingMessage(message.id);
    setEditContent(message.content || '');
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setEditContent('');
  };

  const saveEdit = async (messageId: string) => {
    if (!editContent.trim()) return;

    const { error } = await supabase
      .from('messages')
      .update({ 
        content: editContent.trim(),
        edited_at: new Date().toISOString()
      })
      .eq('id', messageId);

    if (error) {
      toast({ title: "Error", description: "Failed to edit message", variant: "destructive" });
    } else {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: editContent.trim(), edited_at: new Date().toISOString() }
          : msg
      ));
      cancelEdit();
      toast({ title: "Success", description: "Message updated" });
    }
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      toast({ title: "Error", description: "Failed to delete message", variant: "destructive" });
    } else {
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      toast({ title: "Success", description: "Message deleted" });
    }
  };

  const deleteSelectedMessages = async () => {
    if (selectedMessages.size === 0) return;

    const messageIds = Array.from(selectedMessages);
    const { error } = await supabase
      .from('messages')
      .delete()
      .in('id', messageIds);

    if (error) {
      toast({ title: "Error", description: "Failed to delete messages", variant: "destructive" });
    } else {
      setMessages(prev => prev.filter(msg => !selectedMessages.has(msg.id)));
      setSelectedMessages(new Set());
      setSelectionMode(false);
      toast({ title: "Success", description: `${messageIds.length} messages deleted` });
    }
  };

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const selectAllMessages = () => {
    if (selectedMessages.size === messages.length) {
      setSelectedMessages(new Set());
    } else {
      setSelectedMessages(new Set(messages.map(msg => msg.id)));
    }
  };

  const startReply = (message: Message) => {
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const sendGif = async (gif: { url: string; title: string }) => {
    if (!profile) return;

    const messageData: any = {
      room_id: roomId,
      user_id: profile.id,
      content: gif.title,
      message_type: 'gif',
      file_url: gif.url,
      file_name: gif.title
    };

    if (replyingTo) {
      messageData.reply_to = replyingTo.id;
    }

    const { error } = await supabase
      .from('messages')
      .insert(messageData);

    if (!error) {
      setReplyingTo(null);
      toast({ title: "Success", description: "GIF sent" });
    } else {
      toast({ title: "Error", description: "Failed to send GIF", variant: "destructive" });
    }
  };

  const sendSticker = async (sticker: { url: string; title: string }) => {
    if (!profile) return;

    const messageData: any = {
      room_id: roomId,
      user_id: profile.id,
      content: sticker.title,
      message_type: 'sticker',
      file_url: sticker.url,
      file_name: sticker.title
    };

    if (replyingTo) {
      messageData.reply_to = replyingTo.id;
    }

    const { error } = await supabase
      .from('messages')
      .insert(messageData);

    if (!error) {
      setReplyingTo(null);
      toast({ title: "Success", description: "Sticker sent" });
    } else {
      toast({ title: "Error", description: "Failed to send sticker", variant: "destructive" });
    }
  };

  const insertEmojiInMessage = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

  const fetchMessageReactions = async (messageId: string): Promise<MessageReaction[]> => {
    const { data } = await supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId);
    
    return (data || []) as MessageReaction[];
  };

  const updateMessageReactions = (messageId: string, reactions: MessageReaction[]) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, reactions }
        : msg
    ));
  };


  const renameRoom = async () => {
    if (!newRoomName.trim() || !room || !profile) return;

    const { error } = await supabase
      .from('chat_rooms')
      .update({ name: newRoomName.trim() })
      .eq('id', roomId);

    if (error) {
      toast({ title: "Error", description: "Failed to rename group", variant: "destructive" });
    } else {
      setRoom(prev => prev ? { ...prev, name: newRoomName.trim() } : null);
      setEditingRoomName(false);
      setNewRoomName('');
      toast({ title: "Success", description: "Group renamed" });
    }
  };

  const deleteRoom = async () => {
    if (!room || !profile) return;

    // First delete all messages in the room
    await supabase
      .from('messages')
      .delete()
      .eq('room_id', roomId);

    // Then delete all participants
    await supabase
      .from('room_participants')
      .delete()
      .eq('room_id', roomId);

    // Finally delete the room
    const { error } = await supabase
      .from('chat_rooms')
      .delete()
      .eq('id', roomId);

    if (error) {
      toast({ title: "Error", description: "Failed to delete group", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Group deleted" });
      window.location.reload(); // Refresh to update UI
    }
  };

  const canEditMessage = (message: Message) => {
    return message.user_id === profile?.id;
  };

  const canDeleteMessage = (message: Message) => {
    return message.user_id === profile?.id || 
           (room?.is_group && (currentUserRole === 'admin' || room.created_by === profile?.id));
  };

  const isAdmin = () => {
    return currentUserRole === 'admin' || room?.created_by === profile?.id;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!room) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <MessageCircle className="h-12 w-12 mb-4" />
        <p>Select a chat to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={room.avatar_url || ''} />
            <AvatarFallback>
              {room.is_group ? (
                <Users className="h-6 w-6" />
              ) : (
                room.name.charAt(0).toUpperCase()
              )}
            </AvatarFallback>
          </Avatar>
          <div>
            {editingRoomName ? (
              <div className="flex gap-2 items-center">
                <Input
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="h-8 text-sm"
                  placeholder="Enter new name"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') renameRoom();
                    if (e.key === 'Escape') {
                      setEditingRoomName(false);
                      setNewRoomName('');
                    }
                  }}
                />
                <Button size="sm" onClick={renameRoom}>
                  <Check className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => {
                    setEditingRoomName(false);
                    setNewRoomName('');
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{room.name}</h3>
                {room.is_group && isAdmin() && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      setEditingRoomName(true);
                      setNewRoomName(room.name);
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {room.is_group 
                ? `${participants.length} members`
                : 'online'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Video className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectionMode(!selectionMode)}>
                <CheckSquare className="h-4 w-4 mr-2" />
                {selectionMode ? 'Exit Selection' : 'Select Messages'}
              </DropdownMenuItem>
              {room.is_group && (
                <DropdownMenuItem onClick={() => setShowGroupInfo(true)}>
                  <Users className="h-4 w-4 mr-2" />
                  Group Info
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>Search Messages</DropdownMenuItem>
              <DropdownMenuItem>Mute Chat</DropdownMenuItem>
              {room.is_group && isAdmin() && (
                <DropdownMenuItem 
                  onClick={deleteRoom}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Group
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Selection Mode Header */}
      {selectionMode && (
        <div className="flex items-center justify-between p-3 bg-muted border-b">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedMessages.size === messages.length && messages.length > 0}
              onCheckedChange={selectAllMessages}
            />
            <span className="text-sm font-medium">
              {selectedMessages.size} of {messages.length} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedMessages.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteSelectedMessages}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedMessages.size})
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectionMode(false);
                setSelectedMessages(new Set());
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const isOwn = message.user_id === profile?.id;
            const isSelected = selectedMessages.has(message.id);
            const replyMessage = message.reply_to ? messages.find(m => m.id === message.reply_to) : null;
            
            return (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  isOwn ? "justify-end" : "justify-start",
                  isSelected && "bg-primary/10 rounded-lg p-2"
                )}
              >
                {selectionMode && (
                  <div className="flex items-start pt-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleMessageSelection(message.id)}
                    />
                  </div>
                )}
                
                {!isOwn && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={message.profile?.avatar_url || ''} />
                    <AvatarFallback>
                      {message.profile?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={cn(
                  "max-w-xs lg:max-w-md xl:max-w-lg",
                  isOwn ? "items-end" : "items-start"
                )}>
                  {!isOwn && (
                    <p className="text-xs text-muted-foreground mb-1">
                      {message.profile?.username}
                    </p>
                  )}
                  
                  <div className="group relative">
                    {editingMessage === message.id ? (
                      <div className="flex gap-2 items-center">
                        <Input
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="flex-1"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              saveEdit(message.id);
                            }
                            if (e.key === 'Escape') {
                              cancelEdit();
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => saveEdit(message.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEdit}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div
                          className={cn(
                            "rounded-lg px-3 py-2 text-sm",
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          {/* Reply Preview */}
                          {replyMessage && (
                            <div className={cn(
                              "border-l-2 pl-2 mb-2 text-xs opacity-70",
                              isOwn ? "border-primary-foreground/50" : "border-muted-foreground/50"
                            )}>
                              <div className="font-medium">
                                {replyMessage.user_id === profile?.id ? 'You' : replyMessage.profile?.username}
                              </div>
                              <div className="truncate">{replyMessage.content}</div>
                            </div>
                          )}
                          
                          {/* File Attachment */}
                          {message.message_type === 'file' && message.file_url && (
                            <div className="mb-2">
                              {message.file_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                <div className="relative">
                                  <img 
                                    src={message.file_url} 
                                    alt={message.file_name}
                                    className="max-w-64 max-h-64 rounded-md cursor-pointer"
                                    onClick={() => window.open(message.file_url, '_blank')}
                                  />
                                  <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                    <ImageIcon className="h-3 w-3 inline mr-1" />
                                    {message.file_name}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 p-2 bg-card border rounded-md max-w-64">
                                  <FileText className="h-8 w-8 text-muted-foreground" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{message.file_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {message.file_size ? `${(message.file_size / 1024 / 1024).toFixed(1)} MB` : 'File'}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => window.open(message.file_url, '_blank')}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* GIF Content */}
                          {message.message_type === 'gif' && message.file_url && (
                            <div className="mb-2">
                              <img 
                                src={message.file_url} 
                                alt={message.content || 'GIF'}
                                className="max-w-64 max-h-64 rounded-md cursor-pointer"
                                onClick={() => window.open(message.file_url, '_blank')}
                              />
                            </div>
                          )}

                          {/* Sticker Content */}
                          {message.message_type === 'sticker' && message.file_url && (
                            <div className="mb-2">
                              <img 
                                src={message.file_url} 
                                alt={message.content || 'Sticker'}
                                className="w-24 h-24 object-contain"
                              />
                            </div>
                          )}
                          
                          {message.message_type === 'text' && <p>{message.content}</p>}
                          <div className="flex items-center justify-between mt-1">
                            <p className={cn(
                              "text-xs",
                              isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              {formatTime(message.created_at)}
                              {message.edited_at && " (edited)"}
                            </p>
                          </div>
                        </div>

                        {/* Message Reactions */}
                        {!selectionMode && (
                          <MessageReactions
                            messageId={message.id}
                            reactions={message.reactions || []}
                            onReactionsUpdate={(reactions) => updateMessageReactions(message.id, reactions)}
                          />
                        )}
                        {!selectionMode && (
                          <div className="absolute -top-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-card border rounded-md shadow-md flex items-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startReply(message)}
                              className="h-7 w-7 p-0 hover:bg-muted"
                              title="Reply"
                            >
                              <Reply className="h-3 w-3" />
                            </Button>
                            {canEditMessage(message) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEditMessage(message)}
                                className="h-7 w-7 p-0 hover:bg-muted"
                                title="Edit"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            )}
                            {canDeleteMessage(message) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteMessage(message.id)}
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t bg-card">
        {/* Reply Preview */}
        {replyingTo && (
          <div className="mb-3 p-2 bg-muted rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium">
                  Replying to {replyingTo.user_id === profile?.id ? 'yourself' : replyingTo.profile?.username}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {replyingTo.content}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelReply}
                className="ml-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="*/*"
          />
          <Button 
            variant="ghost" 
            size="icon" 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              placeholder={replyingTo ? "Reply to message..." : "Type a message..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="pr-12"
            />
            <EmojiPicker
              onEmojiSelect={insertEmojiInMessage}
              onGifSelect={sendGif}
              onStickerSelect={sendSticker}
              trigger={
                <Button 
                  variant="ghost" 
                  size="icon" 
                  type="button"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2"
                >
                  <Smile className="h-4 w-4" />
                </Button>
              }
            />
          </div>
          
          <Button type="submit" disabled={!newMessage.trim() || loading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Group Info Dialog */}
      {room.is_group && (
        <GroupInfoDialog
          open={showGroupInfo}
          onOpenChange={setShowGroupInfo}
          room={room}
        />
      )}
    </div>
  );
}