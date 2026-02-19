/**
 * API クライアント
 * ベースURLは /match で公開する想定。同一オリジンで /match/api/ を呼ぶ。
 */
const API_BASE = typeof window !== 'undefined' && window.location.pathname.startsWith('/match')
  ? '/match/api'
  : '/api';

const TOKEN_KEY = 'ycs_match_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token == null) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  chatworkId: string;
  sns1Type: string;
  sns1Account: string;
  sns2Type: string;
  sns2Account: string;
  sns3Type: string;
  sns3Account: string;
  business?: string;
  businessName: string;
  industry: string;
  location?: string;
  country: string;
  region: string;
  city: string;
  skills: string[];
  interests: string[];
  message: string;
  mission: string;
  profileImage?: string | null;
  profileImageUrl?: string | null;
  role?: string;
  registeredAt: string;
  [key: string]: unknown;
}

export interface RegisterBody {
  name: string;
  email: string;
  password: string;
  phone?: string;
  chatworkId?: string;
  sns1Type?: string;
  sns1Account?: string;
  sns2Type?: string;
  sns2Account?: string;
  sns3Type?: string;
  sns3Account?: string;
  businessName?: string;
  industry?: string;
  businessDescription?: string;
  country?: string;
  region?: string;
  city?: string;
  skills?: string[];
  interests?: string[];
  message?: string;
  mission?: string;
  profileImageUrl?: string | null;
}

export interface LoginResponse {
  success?: boolean;
  token?: string;
  user?: UserProfile;
  error?: string;
}

export interface MeResponse {
  user?: UserProfile;
  error?: string;
}

export interface UsersResponse {
  users?: UserProfile[];
  error?: string;
}

async function request<T>(
  path: string,
  options: { method: 'GET' | 'POST'; body?: unknown; token?: string | null } = {}
): Promise<{ data: T; ok: boolean; status: number }> {
  const url = `${API_BASE}/${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = options.token ?? getStoredToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    method: options.method,
    headers,
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });
  let data: T;
  const text = await res.text();
  try {
    data = (text ? JSON.parse(text) : {}) as T;
  } catch {
    const preview = text.trim().slice(0, 150);
    const message = preview ? `Invalid response (${res.status}): ${preview}${text.length > 150 ? '…' : ''}` : `Invalid response (status ${res.status})`;
    data = { error: message } as T;
  }
  return { data, ok: res.ok, status: res.status };
}

export async function apiRegister(body: RegisterBody): Promise<LoginResponse & { ok: boolean; status: number }> {
  const { data, ok, status } = await request<LoginResponse>('register.php', { method: 'POST', body });
  return { ...data, ok, status };
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse & { ok: boolean; status: number }> {
  const { data, ok, status } = await request<LoginResponse>('login.php', {
    method: 'POST',
    body: { email, password },
  });
  return { ...data, ok, status };
}

export async function apiMe(): Promise<MeResponse & { ok: boolean; status: number }> {
  const { data, ok, status } = await request<MeResponse>('me.php', { method: 'GET' });
  return { ...data, ok, status };
}

export async function apiUsers(params?: {
  industry?: string;
  region?: string;
  skill?: string;
  interest?: string;
}): Promise<UsersResponse & { ok: boolean; status: number }> {
  const q = new URLSearchParams();
  if (params?.industry) q.set('industry', params.industry);
  if (params?.region) q.set('region', params.region);
  if (params?.skill) q.set('skill', params.skill);
  if (params?.interest) q.set('interest', params.interest);
  const path = q.toString() ? `users.php?${q.toString()}` : 'users.php';
  const { data, ok, status } = await request<UsersResponse>(path, { method: 'GET' });
  return { ...data, ok, status };
}

/** ユーザーの role を変更する（管理者のみ） */
export async function apiUpdateRole(userId: number, role: 'admin' | 'user'): Promise<{ success?: boolean; error?: string } & { ok: boolean; status: number }> {
  const { data, ok, status } = await request<{ success?: boolean; error?: string }>('update-role.php', {
    method: 'POST',
    body: { userId, role },
  });
  return { ...data, ok, status };
}

/** 退会者削除（管理者のみ）。自分自身・最後の管理者は削除不可。 */
export async function apiDeleteUser(userId: number): Promise<{ success?: boolean; error?: string } & { ok: boolean; status: number }> {
  const { data, ok, status } = await request<{ success?: boolean; error?: string }>('delete-user.php', {
    method: 'POST',
    body: { userId: userId },
  });
  return { ...data, ok, status };
}

/** ログイン済みなら誰でも取得できるメンバー一覧（マッチング・検索用） */
export async function apiMembers(params?: {
  industry?: string;
  region?: string;
  skill?: string;
  interest?: string;
}): Promise<UsersResponse & { ok: boolean; status: number }> {
  const q = new URLSearchParams();
  if (params?.industry) q.set('industry', params.industry);
  if (params?.region) q.set('region', params.region);
  if (params?.skill) q.set('skill', params.skill);
  if (params?.interest) q.set('interest', params.interest);
  const path = q.toString() ? `members.php?${q.toString()}` : 'members.php';
  const { data, ok, status } = await request<UsersResponse>(path, { method: 'GET' });
  return { ...data, ok, status };
}

/** パスワード再設定リンク送信（登録済みメールに送信） */
export async function apiForgotPassword(email: string): Promise<{ success?: boolean; error?: string } & { ok: boolean; status: number }> {
  const { data, ok, status } = await request<{ success?: boolean; error?: string }>('forgot-password.php', {
    method: 'POST',
    body: { email },
  });
  return { ...data, ok, status };
}

/** パスワード再設定実行（トークン + 新しいパスワード） */
export async function apiResetPassword(token: string, newPassword: string): Promise<{ success?: boolean; error?: string } & { ok: boolean; status: number }> {
  const { data, ok, status } = await request<{ success?: boolean; error?: string }>('reset-password.php', {
    method: 'POST',
    body: { token, newPassword },
  });
  return { ...data, ok, status };
}
