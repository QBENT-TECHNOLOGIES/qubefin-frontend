/**
 * The prebuilt SockJS browser bundle. The package's main entry (lib/entry.js) reads Node's `global`, which the Angular
 * application builder does not define, so the live socket loads this file instead.
 */
declare module 'sockjs-client/dist/sockjs.min.js' {
  interface SockJSOptions {
    transports?: string | string[];
    timeout?: number;
  }
  const SockJS: new (url: string, reserved?: null, options?: SockJSOptions) => WebSocket;
  export default SockJS;
}
