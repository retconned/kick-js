export interface MessageEvent {
  event: string;
  data: string;
  channel: string;
}

export interface MessageData {
  id: string;
  chatroom_id: number;
  content: string;
  type: string;
  created_at: string;
  sender: {
    id: number;
    username: string;
    slug: string;
    identity: { color: string; badges: unknown };
  };
  metadata?: {
    original_sender: { id: string; username: string };
    original_message: {
      id: string;
      content: string;
    };
  };
}

export interface SubscriptionData {
  username: string;
  months: number;
}

export interface ChatMessage {
  id: string;
  chatroom_id: number;
  content: string;
  type: string;
  created_at: string;
  sender: {
    id: number;
    username: string;
    slug: string;
    identity: { color: string; badges: unknown };
  };
}

export interface Subscription {
  // Define subscription event properties
  id: string;
  user_id: number;
  username: string;
  // Add more properties as needed
}

export interface RaidEvent {
  raider_username: string;
  viewer_count: number;
  // Add more properties as needed
}
