export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  status: 'online' | 'offline' | 'away';
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  is_group: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
  profile?: Profile;
}

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  content: string | null;
  message_type: 'text' | 'image' | 'file' | 'audio' | 'gif' | 'sticker';
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  reply_to: string | null;
  edited_at: string | null;
  created_at: string;
  profile?: Profile;
  reply_message?: Message;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
}

export interface ChatRoomWithDetails extends ChatRoom {
  participants: RoomParticipant[];
  last_message?: Message;
  unread_count?: number;
}