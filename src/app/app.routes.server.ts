import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender
  },
  {
    path: '/matches',
    renderMode: RenderMode.Prerender
  },
  {
    path: '/tournaments',
    renderMode: RenderMode.Prerender
  },
  {
    path: '/match/:id',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return []; // Array vacío = no prerenderiza nada, pero no da error
    }
  },
  {
    path: '/match/:id/events',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return []; // Array vacío = no prerenderiza nada, pero no da error
    }
  }
];