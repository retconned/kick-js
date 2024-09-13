export type EventHandler<T> = (data: T) => void;

export interface ClientOptions {
  logger?: boolean;
  // Add more options as needed
}

export interface KickClient {
  on: (event: string, listener: (...args: any[]) => void) => void;
  user: {
    id: number;
    username: string;
    tag: string;
  } | null;
}
