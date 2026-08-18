// CMS views barrel. Implementations live in public/dashboard/js/cms/*.jsx
// (loaded first as Babel globals). app.jsx still resolves Cms*View by name.
Object.assign(window, {
  CMSView: CmsWebsiteView,
  CmsWebsiteView,
  CmsPagesView,
  CmsPageEditorView,
  CmsImagesView,
  CmsBrandView,
  CmsSectionUndoToast,
});
