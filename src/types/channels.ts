export interface KickChannelInfo {
  id: number;
  user_id: number;
  slug: string;
  is_banned: boolean;
  playback_url: string;
  vod_enabled: boolean;
  subscription_enabled: boolean;
  followers_count: number;
  subscriber_badges: SubscriberBadge[];
  banner_image: BannerImage;
  livestream: Livestream | null;
  role: null;
  muted: boolean;
  follower_badges: any[];
  offline_banner_image: { [key: string]: string } | null;
  verified: boolean;
  recent_categories: RecentCategory[];
  can_host: boolean;
  user: User;
  chatroom: Chatroom;
}

export interface BannerImage {
  url: string;
}

export interface Chatroom {
  id: number;
  chatable_type: string;
  channel_id: number;
  created_at: string;
  updated_at: string;
  chat_mode_old: string;
  chat_mode: string;
  slow_mode: boolean;
  chatable_id: number;
  followers_mode: boolean;
  subscribers_mode: boolean;
  emotes_mode: boolean;
  message_interval: number;
  following_min_duration: number;
}

export interface RecentCategory {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  tags: string[];
  description: null;
  deleted_at: null;
  viewers: number;
  banner: Banner;
  category: Category;
}

export interface Banner {
  responsive: string;
  url: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
}

export interface SubscriberBadge {
  id: number;
  channel_id: number;
  months: number;
  badge_image: { [key: string]: string };
}

export interface User {
  id: number;
  username: string;
  agreed_to_terms: boolean;
  email_verified_at: string;
  bio: string;
  country: string;
  state: string;
  city: string;
  instagram: string;
  twitter: string;
  youtube: string;
  discord: string;
  tiktok: string;
  facebook: string;
  profile_pic: string;
}

export interface BannerImage {
  url: string;
}

export interface Livestream {
  id: number;
  slug: string;
  channel_id: number;
  created_at: string;
  session_title: string;
  is_live: boolean;
  risk_level_id: null;
  start_time: string;
  source: null;
  twitch_channel: null;
  duration: number;
  language: string;
  is_mature: boolean;
  viewer_count: number;
  thumbnail: BannerImage;
  categories: RecentCategoryElement[];
  tags: any[];
}

export interface RecentCategoryElement {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  tags: string[];
  description: null;
  deleted_at: null;
  viewers: number;
  category: RecentCategoryCategory;
  banner?: Banner;
}

export interface RecentCategoryCategory {
  id: number;
  name: string;
  slug: string;
  icon: string;
}
