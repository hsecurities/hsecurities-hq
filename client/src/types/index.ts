export interface User {
  id: string;
  email: string;
  name: string;
  title?: string;
  bio?: string;
  role_id: number;
  role_name: string;
  role_priority: number;
  avatar_config: {
    skin: string;
    hair: string;
    outfit: string;
    accessory: string;
  };
  permissions?: Record<string, boolean>;
}

export interface Room {
  id: string;
  name: string;
  category: string;
  capacity: number;
  is_restricted: boolean;
  min_role_priority: number;
  spawn_x: number;
  spawn_y: number;
  current_occupancy?: number;
  can_enter?: boolean;
  features?: {
    has_screen?: boolean;
    has_whiteboard?: boolean;
    has_megaphone?: boolean;
    is_silent?: boolean;
    webrtc_enabled?: boolean;
  };
}

export interface PlayerState {
  socketId: string;
  userId: string;
  name: string;
  roleName: string;
  rolePriority: number;
  avatarConfig: any;
  roomId: string;
  x: number;
  y: number;
  isMicOn?: boolean;
  isCamOn?: boolean;
  isScreenSharing?: boolean;
}

export interface ChatMessage {
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  timestamp: string;
  isPrivate?: boolean;
}

export interface CTFChallenge {
  id: number;
  title: string;
  category: string;
  difficulty: string;
  points: number;
  description: string;
  hint?: string;
  solved?: boolean;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  room_id: string;
  room_name?: string;
  host_name?: string;
  start_time: string;
  end_time: string;
  presentation_url?: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  priority: string;
  author_name?: string;
  created_at: string;
}
