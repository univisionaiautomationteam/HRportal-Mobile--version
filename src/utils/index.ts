import { jwtDecode } from 'jwt-decode';

export function extractNameFromEmail(email: string): string {
  if (!email || typeof email !== 'string' || !email.includes('@')) return '';
  return email.split('@')[0];
}

export function safeDecode(token: string) {
  try {
    const parsed: any = jwtDecode(token);
    return {
      name: parsed?.full_name || parsed?.name || extractNameFromEmail(parsed?.email || parsed?.upn) || 'User',
      role: parsed?.role || 'HR',
    };
  } catch (err) {
    return { name: 'User', role: 'HR' };
  }
}

export function timeAgo(dateInput: string | Date | number): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return 'Recently';
  
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export function formatDate(dateInput: string | Date): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '-';
  
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateInput: string | Date): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '-';
  
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
