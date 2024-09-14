export type EventHandler<T> = (data: T) => void;

export interface ClientOptions {
  logger?: boolean;
  plainEmote?: boolean;
  // Add more options as needed
}

export interface KickClient {
  on: (event: string, listener: (...args: any[]) => void) => void;
  login: (credentials: { token: string; cookies: string }) => Promise<void>;
  user: {
    id: number;
    username: string;
    tag: string;
  } | null;
  sendMessage: (messageContent: string) => Promise<void>;
  permanentBan: (bannedUser: string) => Promise<void>;
  slowMode: (mode: "on" | "off", durationInSeconds?: number) => Promise<void>;
}
