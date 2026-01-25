/// <reference types="vite/client" />

declare module '@despia/local/vite' {
  import type { Plugin } from 'vite';
  export function despiaLocalPlugin(): Plugin;
}
