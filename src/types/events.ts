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
    identity: { color: string; badges: any };
  };
  metadata?: {
    original_sender: { id: string; username: string };
    original_message: {
      id: string;
      content: string;
    };
  };
}
