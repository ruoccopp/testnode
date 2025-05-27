import { apiRequest } from "./queryClient";

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export class AuthManager {
  private static instance: AuthManager;
  private currentUser: User | null = null;
  private token: string | null = null;

  private constructor() {
    // Load from localStorage on initialization
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    
    if (savedToken && savedUser) {
      this.token = savedToken;
      this.currentUser = JSON.parse(savedUser);
    }
  }

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  public async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiRequest('POST', '/api/auth/login', { email, password });
    const data: AuthResponse = await response.json();
    
    this.setAuth(data.user, data.token);
    return data;
  }

  public async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const response = await apiRequest('POST', '/api/auth/register', { email, password, name });
    const data: AuthResponse = await response.json();
    
    console.log('Registration successful:', data);
    this.setAuth(data.user, data.token);
    console.log('Auth set after registration:', this.isAuthenticated());
    return data;
  }

  public logout(): void {
    this.currentUser = null;
    this.token = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  public getUser(): User | null {
    return this.currentUser;
  }

  public getToken(): string | null {
    return this.token;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null && this.token !== null;
  }

  private setAuth(user: User, token: string): void {
    this.currentUser = user;
    this.token = token;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }
}

export const authManager = AuthManager.getInstance();
