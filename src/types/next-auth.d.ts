import "next-auth";

declare module "next-auth" {
  interface User {
    rememberMe?: boolean;
  }

  interface Session {
    rememberMe?: boolean;
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    rememberMe?: boolean;
  }
}
