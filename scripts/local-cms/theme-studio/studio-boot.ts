/** One canonical ecommerce GUI; resource adapters are typed host integrations. */
const surface = new URLSearchParams(location.search).get('surface');
const resourceModule = surface === 'pages'
  ? '/dashboard/sdk/pages-theme-boot.mjs'
  : '/dashboard/sdk/forms-theme-boot.mjs';
void import(resourceModule);
