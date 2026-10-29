/**
 * Current ecommerce package has JS bridge but no published .d.mts.
 * TODO: move this contract upstream to @inneranimalmedia/ecommerce-cms-agentsam.
 * The host adapter is typechecked here, while SDK runtime validates capabilities.
 */
declare module '*theme-editor/bridge.mjs' {
 export interface ThemeBridge {
  request(route: string, options?: {method?: string;body?: string}): Promise<unknown>;
  getRegistry(): Promise<unknown>;
  resolvePreview(slug:string, value:unknown): Promise<{html:string}>;
  capabilities:{publish:boolean};
 }
 export function createThemeEditorBridge(adapter:unknown):ThemeBridge;
}
