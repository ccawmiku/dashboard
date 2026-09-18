declare module '@hapi/sntp' {
  export function time(options: {
    host: string;
    port: number;
    timeout: number;
    resolveReference?: boolean;
  }): Promise<{
    t: number;
    d: number;
    receivedLocally: number;
    stratum: string;
    isValid: boolean;
    leapIndicator: string;
  }>;
}
