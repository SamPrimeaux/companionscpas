/** Select the real Companions CMS pages inside the canonical ecommerce Studio. */
import { makeCompanionsPagesStudio } from './pages-theme-adapter';

async function loadScript(url: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Missing packaged Studio runtime: ' + url));
    document.head.appendChild(script);
  });
}
try {
  const studio = makeCompanionsPagesStudio();
  const slug = await studio.initialize();
  window.AgentSamThemeEditorHost = {
    page: slug,
    adapter: studio.bridge,
    pageRoutes: studio.routes(),
    onPageChange(nextSlug: string) {
      const next = new URL(location.href);
      next.searchParams.set('slug', nextSlug);
      history.replaceState({}, '', next);
    },
  };
  await loadScript('/admin/js/pages-shared.js');
  await loadScript('/admin/js/theme-editor.js');
} catch (error) {
  console.error('[companions-cms-pages-studio]', error);
  document.body.textContent =
    'Could not open Companions pages in Ecommerce Theme Studio: ' +
    (error instanceof Error ? error.message : String(error));
}
