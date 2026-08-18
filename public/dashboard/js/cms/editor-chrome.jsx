// CMS page-editor footer chrome (Babel global).

function cmsBindEditorChrome(ed) {
  const {
    chromeBrand,
    setChromeBrand,
    chromeOrg,
    setChromeOrg,
    chromeSocials,
    setChromeSocials,
    chromeTrustBadges,
    setChromeTrustBadges,
    chromeColumnLabels,
    setChromeColumnLabels,
    chromeLabelSize,
    setChromeLabelSize,
    chromeFocusBadgeId,
    setChromeFocusBadgeId,
    chromeFocusField,
    chromeDragBadgeId,
    setChromeDragBadgeId,
    chromeFooterLogo,
    setChromeFooterLogo,
    chromeSaving,
    setChromeSaving,
    setChromeUploading,
    setHasUnsaved,
    notify,
    bumpPreview,
  } = ed;

  async function saveChromeFooter(silent = false) {
    if (!chromeBrand) {
      notify('Brand settings not loaded yet', 'error');
      return;
    }
    setChromeSaving(true);
    try {
      const normalizedBadges = chromeTrustBadges.map((b, i) => cmsNormalizeTrustBadge({
        ...b,
        sort_order: (i + 1) * 10,
      }, i));
      const footer_json = JSON.stringify({
        ...cmsParseJsonObject(chromeBrand.footer_json, {}),
        column_labels: chromeColumnLabels,
        col_label_size_px: Number(chromeLabelSize) || 15,
        trust_badges: normalizedBadges,
      });
      const res = await fetch('/api/cms/brand/save', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          brand: {
            ...chromeBrand,
            brand_name: chromeOrg.legal_name || chromeOrg.name || chromeBrand.brand_name || 'Companions of CPAS',
            footer_logo_light_url: chromeFooterLogo || chromeBrand.footer_logo_light_url || '',
            footer_logo_dark_url: chromeFooterLogo || chromeBrand.footer_logo_dark_url || '',
            organization_json: JSON.stringify(chromeOrg),
            socials_json: JSON.stringify(chromeSocials),
            footer_json,
            logo_width: Math.max(40, Math.min(88, Number(chromeBrand.logo_width) || 88)),
            logo_height: null,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 207) throw new Error(data.error || 'Footer save failed');
      setChromeBrand((prev) => prev ? { ...prev, footer_json, organization_json: JSON.stringify(chromeOrg), socials_json: JSON.stringify(chromeSocials), footer_logo_light_url: chromeFooterLogo } : prev);
      bumpPreview();
      setHasUnsaved(false);
      if (!silent) {
        const n = Number(data.republished) || 0;
        notify(data.message || (n ? `Footer saved · ${n} pages republished` : 'Footer saved'));
      }
    } catch (e) {
      notify(e.message || 'Footer save failed', 'error');
      throw e;
    } finally {
      setChromeSaving(false);
    }
  }

  async function uploadChromeFooterLogo(file) {
    if (!file) return;
    setChromeUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('usage_context', 'brand');
      fd.append('label', 'Footer logo');
      const res = await fetch('/api/cms/asset/upload', { method: 'POST', credentials: 'include', body: fd });
      const d = await res.json();
      const url = d.public_url || d.cdn_url || d.url;
      if (!d.success || !url) throw new Error(d.error || 'Upload failed');
      setChromeFooterLogo(url);
      setHasUnsaved(true);
      notify('Footer logo uploaded — save to publish sitewide');
    } catch (e) {
      notify(e.message || 'Upload failed', 'error');
    } finally {
      setChromeUploading(false);
    }
  }

  function renderFooterChromeSettings() {
    const persist = () => { saveChromeFooter(true).then(() => setHasUnsaved(false)).catch(() => {}); };
    const patchOrg = (key, value) => {
      setChromeOrg((prev) => {
        const next = { ...prev, [key]: value };
        if (key === 'legal_name') next.name = value;
        if (key === 'city') next.parish = value;
        return next;
      });
      setHasUnsaved(true);
    };
    const patchSocial = (key, value) => {
      setChromeSocials((prev) => ({ ...prev, [key]: value }));
      setHasUnsaved(true);
    };
    const patchBadge = (idx, patch) => {
      setChromeTrustBadges((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
      setHasUnsaved(true);
    };
    const reorderBadge = (fromId, toId) => {
      if (!fromId || !toId || fromId === toId) return;
      setChromeTrustBadges((prev) => {
        const next = [...prev];
        const from = next.findIndex((b) => b.id === fromId);
        const to = next.findIndex((b) => b.id === toId);
        if (from < 0 || to < 0) return prev;
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        return next.map((b, i) => ({ ...b, sort_order: (i + 1) * 10 }));
      });
      setHasUnsaved(true);
      queueMicrotask(persist);
    };
    const focusRing = (active) => active
      ? { boxShadow: `0 0 0 2px ${C.purple}`, border: `1px solid ${C.purple}` }
      : { border: `1px solid ${C.border}` };
    const missionFocused = chromeFocusField === 'organization.mission';

    return React.createElement('div', {
      style: { display: 'grid', gap: 14, padding: 13, borderRadius: 13, border: `1px solid ${C.purple}44`, background: 'rgba(124,58,237,0.06)' }
    },
      React.createElement('div', null,
        React.createElement('div', { style: { fontSize: 11, fontWeight: 900, color: C.purpleL, letterSpacing: '.08em', textTransform: 'uppercase' } }, 'Footer (sitewide)'),
        React.createElement('div', { style: { fontSize: 11, color: C.textMut, lineHeight: 1.45, marginTop: 4 } },
          'Click caption/badge/labels in the preview to jump here. Drag badges to reorder. Save republishes every page.'
        )
      ),
      React.createElement('div', {
        id: 'cms-footer-field-mission',
        style: { display: 'grid', gap: 6, padding: 8, borderRadius: 10, background: missionFocused ? C.purpleDim : 'transparent', ...focusRing(missionFocused) },
      },
        cmsFieldLabel('Mission / tagline'),
        cmsTextArea(chromeOrg.mission || '', (v) => patchOrg('mission', v), persist, 4)
      ),
      React.createElement('div', null,
        cmsFieldLabel('Organization name'),
        cmsTextInput(chromeOrg.legal_name || chromeOrg.name || '', (v) => patchOrg('legal_name', v), persist, 'Companions of CPAS')
      ),
      React.createElement('div', null,
        cmsFieldLabel('EIN / Tax ID'),
        cmsTextInput(chromeOrg.ein || '', (v) => patchOrg('ein', v), persist, '88-4156327', true)
      ),
      React.createElement('div', null,
        cmsFieldLabel('Contact email'),
        cmsTextInput(chromeOrg.email || '', (v) => patchOrg('email', v), persist, 'companionsCPAS@gmail.com')
      ),
      React.createElement('div', null,
        cmsFieldLabel('City / Parish'),
        cmsTextInput(chromeOrg.city || chromeOrg.parish || '', (v) => patchOrg('city', v), persist, 'Caddo Parish, Louisiana')
      ),
      React.createElement('div', null,
        cmsFieldLabel('Facebook URL'),
        cmsTextInput(chromeSocials.facebook || '', (v) => patchSocial('facebook', v), persist, 'https://facebook.com/…', true)
      ),
      React.createElement('div', null,
        cmsFieldLabel('Instagram URL'),
        cmsTextInput(chromeSocials.instagram || '', (v) => patchSocial('instagram', v), persist, 'https://instagram.com/…', true)
      ),
      React.createElement('div', { style: { display: 'grid', gap: 8, padding: 10, borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface } },
        cmsFieldLabel('Column titles (sitewide)'),
        React.createElement('div', null,
          cmsFieldLabel(`Title size (${chromeLabelSize}px)`),
          React.createElement('input', {
            type: 'range', min: 10, max: 22, step: 1, value: chromeLabelSize,
            onChange: (e) => { setChromeLabelSize(Number(e.target.value)); setHasUnsaved(true); },
            onMouseUp: persist, onTouchEnd: persist,
            style: { width: '100%', accentColor: C.purple },
          })
        ),
        ['pages', 'organization', 'follow_us', 'staff'].map((key) => {
          const focused = chromeFocusField === `column_labels.${key}`;
          return React.createElement('div', {
            key,
            id: `cms-footer-field-label-${key}`,
            style: { padding: 6, borderRadius: 8, background: focused ? C.purpleDim : 'transparent', ...focusRing(focused) },
          },
            cmsFieldLabel(key.replace('_', ' ')),
            cmsTextInput(
              chromeColumnLabels[key] || '',
              (v) => { setChromeColumnLabels((p) => ({ ...p, [key]: v })); setHasUnsaved(true); },
              persist,
              DEFAULT_FOOTER_COLUMN_LABELS[key]
            )
          );
        })
      ),
      React.createElement('div', { style: { display: 'grid', gap: 10 } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
          React.createElement('div', null,
            cmsFieldLabel('Trust badges'),
            React.createElement('div', { style: { fontSize: 11, color: C.textMut, marginTop: -4 } }, 'Drag ≡ to reorder · placement + size + caption are live CMS fields')
          ),
          React.createElement('button', {
            type: 'button',
            onClick: () => {
              const badge = cmsNormalizeTrustBadge({
                id: cmsNewBadgeId(),
                label: 'New badge',
                caption: '',
                href: '',
                image_url: '',
                enabled: true,
                height_px: 72,
                placement: 'organization',
              }, chromeTrustBadges.length);
              setChromeTrustBadges((prev) => [...prev, badge]);
              setChromeFocusBadgeId(badge.id);
              setHasUnsaved(true);
            },
            style: {
              padding: '6px 10px', borderRadius: 8, border: `1px dashed ${C.border}`, background: 'transparent',
              color: C.textSec, cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-ui)',
            },
          }, '+ Add badge')
        ),
        chromeTrustBadges.map((badge, idx) => {
          const focused = chromeFocusBadgeId === badge.id;
          return React.createElement('div', {
            key: badge.id || `trust-${idx}`,
            id: `cms-footer-badge-${badge.id}`,
            draggable: true,
            onDragStart: () => setChromeDragBadgeId(badge.id),
            onDragOver: (e) => e.preventDefault(),
            onDrop: () => { reorderBadge(chromeDragBadgeId, badge.id); setChromeDragBadgeId(null); },
            onDragEnd: () => setChromeDragBadgeId(null),
            style: {
              display: 'grid', gap: 8, padding: 10, borderRadius: 10, background: C.surface, cursor: 'grab',
              opacity: chromeDragBadgeId === badge.id ? 0.55 : 1,
              ...focusRing(focused),
            },
          },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, color: C.textMut, fontSize: 12, fontWeight: 700 } },
                React.createElement('span', { 'aria-hidden': true }, '≡'),
                focused ? 'EDITING BADGE' : `Badge ${idx + 1}`
              ),
              React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.text, cursor: 'pointer' } },
                React.createElement('input', {
                  type: 'checkbox',
                  checked: !!badge.enabled,
                  onChange: (e) => { patchBadge(idx, { enabled: e.target.checked }); queueMicrotask(persist); },
                }),
                'Enabled'
              )
            ),
            React.createElement('div', {
              id: `cms-footer-badge-${badge.id}-caption`,
              style: chromeFocusField === 'caption' && focused ? { ...focusRing(true), padding: 6, borderRadius: 8 } : null,
            },
              cmsFieldLabel('Caption (above icon)'),
              cmsTextInput(badge.caption || '', (v) => patchBadge(idx, { caption: v }), persist, 'Caption above the seal')
            ),
            React.createElement('div', null,
              cmsFieldLabel('Accessibility label'),
              cmsTextInput(badge.label || '', (v) => patchBadge(idx, { label: v }), persist, 'Trust badge')
            ),
            React.createElement('div', null,
              cmsFieldLabel('Link URL'),
              cmsTextInput(badge.href || '', (v) => patchBadge(idx, { href: v }), persist, 'https://…', true)
            ),
            React.createElement('div', {
              style: chromeFocusField === 'image_url' && focused ? { ...focusRing(true), padding: 6, borderRadius: 8 } : null,
            },
              cmsFieldLabel('Image URL'),
              cmsTextInput(badge.image_url || '', (v) => patchBadge(idx, { image_url: v }), persist, cmsUrlPlaceholder(undefined, 'cdn') || 'https://…', true)
            ),
            React.createElement('div', null,
              cmsFieldLabel('Placement'),
              React.createElement('select', {
                value: badge.placement || 'organization',
                onChange: (e) => { patchBadge(idx, { placement: e.target.value }); queueMicrotask(persist); },
                style: {
                  width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 9,
                  border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13,
                },
              }, FOOTER_BADGE_PLACEMENTS.map((o) => React.createElement('option', { key: o.value, value: o.value }, o.label)))
            ),
            React.createElement('div', null,
              cmsFieldLabel(`Icon height (${badge.height_px || 72}px)`),
              React.createElement('input', {
                type: 'range', min: 36, max: 120, step: 2, value: Number(badge.height_px) || 72,
                onChange: (e) => patchBadge(idx, { height_px: Number(e.target.value) }),
                onMouseUp: persist, onTouchEnd: persist,
                style: { width: '100%', accentColor: C.purple },
              })
            ),
            badge.image_url ? React.createElement('img', {
              src: badge.image_url, alt: badge.label || 'Trust badge',
              style: { height: Number(badge.height_px) || 72, width: 'auto', objectFit: 'contain', opacity: 0.95 },
            }) : null,
            React.createElement('button', {
              type: 'button',
              onClick: () => {
                setChromeTrustBadges((prev) => prev.filter((_, i) => i !== idx));
                if (chromeFocusBadgeId === badge.id) setChromeFocusBadgeId(null);
                setHasUnsaved(true);
                queueMicrotask(persist);
              },
              style: {
                justifySelf: 'start', padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.red}44`,
                background: C.surface, color: C.red, cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-ui)',
              },
            }, 'Remove badge')
          );
        })
      ),
      React.createElement(Btn, {
        size: 'sm',
        icon: chromeSaving ? undefined : 'check2',
        disabled: chromeSaving || !chromeBrand,
        onClick: () => { saveChromeFooter(false).catch(() => {}); },
      }, chromeSaving ? 'Saving…' : 'Save footer sitewide')
    );
  }

  return { saveChromeFooter, uploadChromeFooterLogo, renderFooterChromeSettings };
}

Object.assign(window, {
  cmsBindEditorChrome,
});
