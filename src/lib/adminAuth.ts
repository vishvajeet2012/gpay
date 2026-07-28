import { cookies } from "next/headers";

export const ADMIN_EMAIL = "vishvajeet4711@gmail.com";
export const ADMIN_PASSWORD = "123456";

/** Cookie value after successful login */
export const ADMIN_SESSION_VALUE = "vj_admin_session_ok_v1";
export const ADMIN_COOKIE = "admin_session";

export function verifyCredentials(email: string, password: string) {
  return (
    email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
    password === ADMIN_PASSWORD
  );
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  const session = jar.get(ADMIN_COOKIE)?.value;
  return session === ADMIN_SESSION_VALUE;
}
