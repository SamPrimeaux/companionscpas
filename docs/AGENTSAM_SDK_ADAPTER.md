# Companions dashboard — AgentSam SDK adapter

SDK source: `@inneranimalmedia/agentsam-workbench@2.6.13`, built from SDK checkout `6fa8c3d9`. The checked-in `public/dashboard/js/agentsam-sdk-mini.js` is a minified browser bundle of the actual exported `MiniAgentSam` component, using the dashboard's existing React 18 global. Its matching stylesheet lives at `public/dashboard/css/agentsam-sdk-mini.css`.

The bundled component collects user-selected DOM context and renders an annotation composer. The CPAS-specific adapter in `public/dashboard/js/agentsam.jsx` supplies the always-visible small dock. It delegates user prompts to the **existing authenticated** `AgentSamDrawer` and `POST /api/agentsam/chat`; no provider keys or client records are bundled. No SDK capability is granted to publish or change content. Selection is user initiated, and input field values are withheld by SDK selection logic.

Build/update the generated JS only from the pinned SDK source and verify the client against React 18. A future client toolchain can directly import `@inneranimalmedia/agentsam-workbench/agent`; **do not copy or maintain a separate component implementation**. Preserve CPAS-specific routes, CMS D1 tables, media R2 keys, and existing CMS publishing. Evaluate newer SDK navigation and inspector primitives in the client editor in bounded route-by-route changes after integration tests, not as a full editor swap.

Rollback: restore prior index.html script and CSS version references; prior CMS and AgentSam chat remain intact.
