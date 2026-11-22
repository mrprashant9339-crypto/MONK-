export const AUTH_ROUTES = ["/forgot-password","/reset-password","/verify-email","/account-recovery","/mfa","/invite"] as const;
export function isAuthRoute(path:string):boolean{return AUTH_ROUTES.includes(path as (typeof AUTH_ROUTES)[number]);}
