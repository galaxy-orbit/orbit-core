export interface CanActivate {
    canActivate(context: any): boolean | Promise<boolean>;
}
export type GuardClass = new (...args: any[]) => CanActivate;
