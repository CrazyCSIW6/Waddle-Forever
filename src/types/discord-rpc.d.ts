declare module 'discord-rpc' {
  export class Client {
    constructor(options?: any);
    on(event: string, listener: Function): void;
    login(options: any): Promise<void>;
    request(cmd: string, args: any): Promise<any>;
    destroy(): void;
    setActivity(activity: any): Promise<void>;
  }
  
  export function register(id: string): void;
}
