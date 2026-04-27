import 'next-auth';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      uniqueUserId: string;
      displayName: string | null;
      emailVerified: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    uniqueUserId?: string;
    displayName?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    uniqueUserId: string;
    displayName: string | null;
    emailVerified: boolean;
  }
}

