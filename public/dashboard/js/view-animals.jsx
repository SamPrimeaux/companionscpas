// CPAS Animals - live API powered animal management
// Scope: this file only. Dashboard shell, nav, and shared UI remain untouched.

(function(){
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useCallback = React.useCallback;

  function h(type, props) {
    var children = Array.prototype.slice.call(arguments, 2);
    return React.createElement.apply(React, [type, props || {}].concat(children));
  }

  function token(key, fallback) {
    return (typeof C !== 'undefined' && C && C[key]) ? C[key] : fallback;
  }

  var PageHeader = window.PageHeader;

  function ui() {
    return {
      bg: token('bg', '#ede8df'),
      surface: token('surface', '#faf7f3'),
      raised: token('raised', '#f5f1e8'),
      border: token('border', 'rgba(0,0,0,0.07)'),
      text: token('text', '#1a1622'),
      textSec: token('textSec', '#3d3529'),
      textMut: token('textMut', '#5a5046'),
      purple: token('purple', '#7c3aed'),
      purpleL: token('purpleL', '#6d28d9'),
      purpleDim: token('purpleDim', 'rgba(124,58,237,0.12)'),
      green: token('green', '#059669'),
      yellow: token('yellow', '#d97706'),
      red: token('red', '#dc2626')
    };
  }

  function apiJSON(url, options) {
    options = options || {};
    options.credentials = 'include';
    options.headers = Object.assign({ Accept: 'application/json' }, options.headers || {});
    if (options.body && !options.headers['Content-Type']) options.headers['Content-Type'] = 'application/json';
    return fetch(url, options).then(function(res) {
      return res.json().catch(function(){ return {}; }).then(function(data) {
        if (!res.ok) {
          var err = new Error(data.error || ('Request failed: ' + res.status));
          err.status = res.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  function useBreakpoint() {
    var pair = useState(function() {
      var w = typeof window === 'undefined' ? 1280 : window.innerWidth;
      return w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop';
    });
    var bp = pair[0], setBp = pair[1];
    useEffect(function() {
      function handler() {
        var w = window.innerWidth;
        setBp(w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop');
      }
      window.addEventListener('resize', handler);
      return function(){ window.removeEventListener('resize', handler); };
    }, []);
    return bp;
  }

  var STATUS_COLOR = {
    available: '#4ade80',
    foster: '#a78bfa',
    medical: '#f87171',
    'medical watch': '#f87171',
    adopted: '#94a3b8',
    hidden: '#94a3b8',
    draft: '#94a3b8'
  };
  var STATUS_LABEL = {
    available: 'Available',
    foster: 'Foster',
    medical: 'Medical',
    'medical watch': 'Medical Watch',
    adopted: 'Adopted',
    hidden: 'Hidden',
    draft: 'Draft'
  };

  function labelize(value) {
    if (value === null || value === undefined || value === '') return '-';
    return String(value).replace(/_/g, ' ').replace(/\b\w/g, function(m){ return m.toUpperCase(); });
  }
  function statusLabel(status) { return STATUS_LABEL[status] || labelize(status || 'unknown'); }
  function statusColor(status) { return STATUS_COLOR[status] || ui().textMut; }

  function fmtDate(iso) {
    if (!iso) return '-';
    try { return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }); }
    catch (e) { return iso; }
  }
  function fmtDateTime(iso) {
    if (!iso) return '-';
    try { return new Date(iso).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' }); }
    catch (e) { return iso; }
  }
  function parseAnswers(value) {
    if (!value) return {};
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch (e) { return {}; }
  }

  function SvgIcon(props) {
    var name = props.name || 'file';
    var size = props.size || 16;
    var color = props.color || 'currentColor';
    var common = { width:size, height:size, viewBox:'0 0 24 24', fill:'none', stroke:color, strokeWidth:'2', strokeLinecap:'round', strokeLinejoin:'round', style:props.style || {} };
    var paths = {
      search: [h('circle', { key:'a', cx:'11', cy:'11', r:'7' }), h('path', { key:'b', d:'M20 20l-3.5-3.5' })],
      plus: [h('path', { key:'a', d:'M12 5v14' }), h('path', { key:'b', d:'M5 12h14' })],
      edit: [h('path', { key:'a', d:'M12 20h9' }), h('path', { key:'b', d:'M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z' })],
      trash: [h('path', { key:'a', d:'M3 6h18' }), h('path', { key:'b', d:'M8 6V4h8v2' }), h('path', { key:'c', d:'M19 6l-1 14H6L5 6' })],
      pin: [h('path', { key:'a', d:'M14 4l6 6-3 1-4 8-2-2 8-4 1-3-6-6z' }), h('path', { key:'b', d:'M5 19l5-5' })],
      download: [h('path', { key:'a', d:'M12 3v12' }), h('path', { key:'b', d:'M7 10l5 5 5-5' }), h('path', { key:'c', d:'M5 21h14' })],
      grid: [h('rect', { key:'a', x:'4', y:'4', width:'6', height:'6', rx:'1' }), h('rect', { key:'b', x:'14', y:'4', width:'6', height:'6', rx:'1' }), h('rect', { key:'c', x:'4', y:'14', width:'6', height:'6', rx:'1' }), h('rect', { key:'d', x:'14', y:'14', width:'6', height:'6', rx:'1' })],
      list: [h('path', { key:'a', d:'M8 6h13' }), h('path', { key:'b', d:'M8 12h13' }), h('path', { key:'c', d:'M8 18h13' }), h('path', { key:'d', d:'M3 6h.01' }), h('path', { key:'e', d:'M3 12h.01' }), h('path', { key:'f', d:'M3 18h.01' })],
      heart: [h('path', { key:'a', d:'M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z' })],
      check: [h('path', { key:'a', d:'M20 6L9 17l-5-5' })],
      clock: [h('circle', { key:'a', cx:'12', cy:'12', r:'9' }), h('path', { key:'b', d:'M12 7v5l3 2' })],
      file: [h('path', { key:'a', d:'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' }), h('path', { key:'b', d:'M14 2v6h6' })],
      video: [h('rect', { key:'a', x:'3', y:'5', width:'18', height:'14', rx:'2' }), h('path', { key:'b', d:'M10 9l6 3-6 3z' })],
      alert: [h('path', { key:'a', d:'M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z' }), h('path', { key:'b', d:'M12 9v4' }), h('path', { key:'c', d:'M12 17h.01' })],
      send: [h('path', { key:'a', d:'M22 2L11 13' }), h('path', { key:'b', d:'M22 2l-7 20-4-9-9-4z' })],
      phone: [h('path', { key:'a', d:'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z' })],
      mail: [h('path', { key:'a', d:'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z' }), h('polyline', { key:'b', points:'22,6 12,13 2,6' })]
    };
    return h('svg', common, paths[name] || paths.file);
  }

  function appIcon(name, size, style) {
    if (typeof Icon === 'function') {
      try { return h(Icon, { name:name, size:size || 16, style:style || {} }); } catch (e) {}
    }
    return h(SvgIcon, { name:name, size:size || 16, style:style || {} });
  }

  function FacebookIcon() {
    return h('svg', { width:18, height:18, viewBox:'0 0 24 24', fill:'#1877F2' },
      h('path', { d:'M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.883v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z' })
    );
  }
  function InstagramIcon() {
    return h('svg', { width:18, height:18, viewBox:'0 0 24 24', fill:'none', stroke:'#E1306C', strokeWidth:'2', strokeLinecap:'round', strokeLinejoin:'round' },
      h('rect', { x:'2', y:'2', width:'20', height:'20', rx:'5', ry:'5' }),
      h('circle', { cx:'12', cy:'12', r:'4' }),
      h('circle', { cx:'17.5', cy:'6.5', r:'1', fill:'#E1306C', stroke:'none' })
    );
  }
  function YouTubeIcon() {
    return h('svg', { width:18, height:18, viewBox:'0 0 24 24', fill:'#FF0000' },
      h('path', { d:'M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z' })
    );
  }
  function EmailIcon() {
    return h('svg', { width:18, height:18, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:'2', strokeLinecap:'round', strokeLinejoin:'round' },
      h('rect', { x:'2', y:'4', width:'20', height:'16', rx:'2' }),
      h('path', { d:'M2 7l10 7 10-7' })
    );
  }
  function DriveIcon() {
    return h('svg', { width:18, height:18, viewBox:'0 0 87.3 78' },
      h('path', { d:'M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0a7.3 7.3 0 0 0 1.05 3.75z', fill:'#0066DA' }),
      h('path', { d:'M43.65 25L29.9 1.2a8.23 8.23 0 0 0-3.3 3.3L.95 49.5A7.26 7.26 0 0 0 0 53h27.5z', fill:'#00AC47' }),
      h('path', { d:'M73.55 76.8a8.23 8.23 0 0 0 3.3-3.3l1.6-2.75 7.65-13.25A7.26 7.26 0 0 0 87.3 53H59.8l5.85 11.5z', fill:'#EA4335' }),
      h('path', { d:'M43.65 25L57.4 1.2A8.1 8.1 0 0 0 53.65 0H33.65a8.1 8.1 0 0 0-3.75 1.2z', fill:'#00832D' }),
      h('path', { d:'M59.8 53H27.5L13.75 76.8a8.1 8.1 0 0 0 3.75 1.2h52.3a8.1 8.1 0 0 0 3.75-1.2z', fill:'#2684FC' }),
      h('path', { d:'M73.4 26.5l-13.1-22.7a8.23 8.23 0 0 0-2.9-2.6L43.65 25 59.8 53h27.45a7.26 7.26 0 0 0-.95-3.5z', fill:'#FFBA00' })
    );
  }

  var PLATFORM_MAP = [
    { key:'facebook', label:'Facebook', color:'#1877F2', icon:FacebookIcon },
    { key:'instagram', label:'Instagram', color:'#E1306C', icon:InstagramIcon },
    { key:'youtube', label:'YouTube', color:'#FF0000', icon:YouTubeIcon },
    { key:'email', label:'Email (Resend)', color:'#111111', icon:EmailIcon },
    { key:'google_drive', label:'Google Drive', color:'#4285F4', icon:DriveIcon }
  ];

  function Button(props) {
    var u = ui();
    return h('button', {
      type: props.type || 'button',
      onClick: props.onClick,
      disabled: props.disabled,
      style: Object.assign({
        height: props.size === 'sm' ? 34 : 40,
        padding: props.size === 'sm' ? '0 12px' : '0 16px',
        borderRadius: 10,
        border: '1px solid ' + (props.variant === 'danger' ? u.red : props.variant === 'secondary' ? u.border : u.purple),
        background: props.variant === 'danger' ? u.red : props.variant === 'secondary' ? u.surface : u.purple,
        color: props.variant === 'secondary' ? u.text : '#fff',
        fontSize: 13,
        fontWeight: 800,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? .55 : 1,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: props.variant === 'secondary' ? 'none' : '0 12px 28px rgba(129,113,238,.22)'
      }, props.style || {})
    }, props.iconName ? appIcon(props.iconName, 14) : null, props.children);
  }

  function SoftCard(props) {
    var u = ui();
    return h('div', { style:Object.assign({
      background: u.surface,
      border: '1px solid ' + u.border,
      borderRadius: 18,
      boxShadow: '0 18px 42px rgba(10,10,25,.08)',
      overflow: 'hidden'
    }, props.style || {}) }, props.children);
  }

  function FieldLabel(props) {
    var u = ui();
    return h('label', { style:{ display:'block', fontSize:11, color:u.textMut, textTransform:'uppercase', letterSpacing:'.06em', fontWeight:800, marginBottom:6 } }, props.children);
  }
  function TextInput(props) {
    var u = ui();
    return h('input', {
      value: props.value === undefined || props.value === null ? '' : props.value,
      type: props.type || 'text',
      placeholder: props.placeholder || '',
      onChange: function(e){ if (props.onChange) props.onChange(e.target.value); },
      style: Object.assign({ width:'100%', height:40, boxSizing:'border-box', borderRadius:10, border:'1px solid ' + u.border, background:u.raised, color:u.text, padding:'0 12px', fontSize:13, outline:'none', fontFamily:'inherit' }, props.style || {})
    });
  }
  function SelectInput(props) {
    var u = ui();
    return h('select', {
      value: props.value === undefined || props.value === null ? '' : props.value,
      onChange: function(e){ if (props.onChange) props.onChange(e.target.value); },
      style: Object.assign({ width:'100%', height:40, boxSizing:'border-box', borderRadius:10, border:'1px solid ' + u.border, background:u.raised, color:u.text, padding:'0 12px', fontSize:13, outline:'none', fontFamily:'inherit' }, props.style || {})
    }, (props.options || []).map(function(opt){
      if (typeof opt === 'string') return h('option', { key:opt, value:opt }, opt);
      return h('option', { key:opt.value, value:opt.value }, opt.label);
    }));
  }
  function TextArea(props) {
    var u = ui();
    return h('textarea', {
      value: props.value,
      defaultValue: props.defaultValue,
      placeholder: props.placeholder || '',
      onChange: function(e){ if (props.onChange) props.onChange(e.target.value); },
      onBlur: props.onBlur,
      style: Object.assign({ width:'100%', minHeight:props.minHeight || 120, boxSizing:'border-box', borderRadius:10, border:'1px solid ' + u.border, background:u.raised, color:u.text, padding:'10px 12px', fontSize:13, lineHeight:1.6, outline:'none', resize:'vertical', fontFamily:'inherit' }, props.style || {})
    });
  }

  function parseAgeFields(label) {
    if (!label || label === 'Unknown') return { value:'', unit:'years', hint:'' };
    var m = String(label).match(/^(\d+(?:\.\d+)?)\s*(years?|yrs?|months?|mos?|weeks?|wks?)?$/i);
    if (m) {
      var unit = (m[2] || 'years').toLowerCase();
      if (unit.indexOf('mo') === 0) unit = 'months';
      else if (unit.indexOf('wk') === 0) unit = 'weeks';
      else unit = 'years';
      return { value:m[1], unit:unit, hint:'' };
    }
    return { value:'', unit:'years', hint:label };
  }
  function formatAgeLabel(value, unit) {
    var v = String(value || '').trim();
    if (!v) return '';
    if (!/^\d+(\.\d+)?$/.test(v)) return null;
    var n = parseFloat(v);
    if (unit === 'months') return v + ' ' + (n === 1 ? 'month' : 'months');
    if (unit === 'weeks') return v + ' ' + (n === 1 ? 'week' : 'weeks');
    return v + ' ' + (n === 1 ? 'year' : 'years');
  }
  function parseWeightField(label) {
    if (!label || label === 'Unknown') return { value:'', unit:'lbs', hint:'' };
    var m = String(label).match(/^(\d+(?:\.\d+)?)\s*(lbs?|pounds?|kg|kilograms?)?$/i);
    if (m) return { value:m[1], unit:(m[2] || 'lbs').toLowerCase().indexOf('kg') === 0 ? 'kg' : 'lbs', hint:'' };
    return { value:'', unit:'lbs', hint:label };
  }
  function formatWeightLabel(value, unit) {
    var v = String(value || '').trim();
    if (!v) return '';
    if (!/^\d+(\.\d+)?$/.test(v)) return null;
    return v + ' ' + (unit === 'kg' ? 'kg' : 'lbs');
  }
  function mediaTypeFromUpload(d, file) {
    var mime = d.mime_type || (file && file.type) || '';
    if (d.asset_type === 'video' || mime.indexOf('video/') === 0) return 'video';
    if (d.asset_type === 'document' || mime === 'application/pdf') return 'pdf';
    return 'image';
  }
  function parsePostMedia(post) {
    if (post.media_json) {
      try {
        var parsed = typeof post.media_json === 'string' ? JSON.parse(post.media_json) : post.media_json;
        if (Array.isArray(parsed) && parsed.length) return parsed;
      } catch (e) {}
    }
    if (post.media_url) return [{ url:post.media_url, type:post.media_type || 'image', name:'' }];
    return [];
  }

  function AgeFieldGroup(props) {
    var u = ui();
    var err = props.error;
    return h('div', null,
      h(FieldLabel, null, 'Age'),
      h('div', { style:{ display:'grid', gridTemplateColumns:'1fr 110px', gap:8 } },
        h(TextInput, { type:'number', min:'0', step:'any', value:props.value, placeholder:'e.g. 2', onChange:props.onValueChange }),
        h(SelectInput, { value:props.unit, onChange:props.onUnitChange, options:[{value:'years', label:'Years'}, {value:'months', label:'Months'}, {value:'weeks', label:'Weeks'}] })
      ),
      props.hint ? h('div', { style:{ color:u.textMut, fontSize:11, marginTop:4 } }, 'Previous: ' + props.hint) : null,
      err ? h('div', { style:{ color:u.red, fontSize:11, marginTop:4, fontWeight:700 } }, err) : null
    );
  }
  function WeightFieldGroup(props) {
    var u = ui();
    var err = props.error;
    return h('div', null,
      h(FieldLabel, null, 'Weight'),
      h('div', { style:{ display:'grid', gridTemplateColumns:'1fr 72px', gap:8 } },
        h(TextInput, { type:'number', min:'0', step:'any', value:props.value, placeholder:'e.g. 45', onChange:props.onValueChange }),
        h(SelectInput, { value:props.unit, onChange:props.onUnitChange, options:[{value:'lbs', label:'lbs'}, {value:'kg', label:'kg'}] })
      ),
      props.hint ? h('div', { style:{ color:u.textMut, fontSize:11, marginTop:4 } }, 'Previous: ' + props.hint) : null,
      err ? h('div', { style:{ color:u.red, fontSize:11, marginTop:4, fontWeight:700 } }, err) : null
    );
  }

  function PostMediaAttachments(props) {
    var media = props.media || [];
    var onChange = props.onChange;
    var uploadingState = useState(false), uploading = uploadingState[0], setUploading = uploadingState[1];
    var errorState = useState(''), error = errorState[0], setError = errorState[1];
    var u = ui();
    var MAX_ATTACHMENTS = 10;

    function uploadFiles(fileList) {
      var files = Array.prototype.slice.call(fileList || []);
      if (!files.length) return;
      if (media.length + files.length > MAX_ATTACHMENTS) {
        setError('Maximum ' + MAX_ATTACHMENTS + ' attachments per post.');
        return;
      }
      setUploading(true); setError('');
      var pending = files.slice();
      var next = media.slice();
      function step() {
        if (!pending.length) { setUploading(false); onChange(next); return; }
        var file = pending.shift();
        var fd = new FormData();
        fd.append('file', file);
        fd.append('usage_context', 'social_post');
        fd.append('category', 'social');
        fd.append('label', file.name);
        fetch('/api/cms/asset/upload', { method:'POST', credentials:'include', body:fd })
          .then(function(res){ return res.json().then(function(d){ if (!res.ok) throw new Error(d.error || 'Upload failed'); return d; }); })
          .then(function(d){
            var url = d.public_url || d.cdn_url || d.pub_url || d.url;
            if (!url) throw new Error('Upload succeeded but no URL returned.');
            next.push({ url:url, type:mediaTypeFromUpload(d, file), name:file.name, mime_type:d.mime_type || file.type });
          })
          .catch(function(e){ setError(e.message || 'Upload failed'); })
          .finally(step);
      }
      step();
    }

    function removeAt(idx) {
      var copy = media.slice();
      copy.splice(idx, 1);
      onChange(copy);
    }

    return h('div', { style:{ marginTop:12 } },
      h(FieldLabel, null, 'Attachments'),
      h('div', {
        onDragOver: function(e){ e.preventDefault(); },
        onDrop: function(e){ e.preventDefault(); if (!uploading) uploadFiles(e.dataTransfer.files); },
        style:{ border:'1px dashed ' + u.border, borderRadius:12, padding:12, background:'rgba(255,255,255,.02)' }
      },
        media.length ? h('div', { style:{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(88px, 1fr))', gap:8, marginBottom:10 } },
          media.map(function(item, idx){
            return h('div', { key:item.url + idx, style:{ position:'relative', border:'1px solid ' + u.border, borderRadius:10, overflow:'hidden', background:u.raised, minHeight:72 } },
              item.type === 'image' ? h('img', { src:item.url, alt:item.name || 'Attachment', style:{ width:'100%', height:72, objectFit:'cover', display:'block' } }) :
              item.type === 'video' ? h('div', { style:{ height:72, display:'flex', alignItems:'center', justifyContent:'center', color:u.purpleL, fontSize:11, fontWeight:800, padding:8, textAlign:'center' } }, appIcon('video', 18), h('span', { style:{ marginLeft:6 } }, 'Video')) :
              h('div', { style:{ height:72, display:'flex', alignItems:'center', justifyContent:'center', color:u.yellow, fontSize:11, fontWeight:800, padding:8, textAlign:'center' } }, appIcon('file', 18), h('span', { style:{ marginLeft:6 } }, 'PDF')),
              h('button', { type:'button', onClick:function(){ removeAt(idx); }, style:{ position:'absolute', top:4, right:4, width:22, height:22, borderRadius:99, border:'none', background:'rgba(0,0,0,.72)', color:'#fff', cursor:'pointer', fontSize:12, lineHeight:'22px' } }, '×')
            );
          })
        ) : h('div', { style:{ color:u.textMut, fontSize:12, marginBottom:10, textAlign:'center', padding:'8px 0' } }, 'Add images, PDFs, or MP4 videos'),
        h('div', { style:{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' } },
          h('label', { style:{ height:34, border:'1px solid ' + u.purple, borderRadius:10, display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'0 12px', color:'#fff', background:u.purple, fontSize:12, fontWeight:800, cursor:uploading ? 'not-allowed' : 'pointer', opacity:uploading ? .6 : 1 } },
            uploading ? 'Uploading...' : 'Add files',
            h('input', { type:'file', multiple:true, accept:'image/*,application/pdf,video/mp4,video/quicktime,video/webm', disabled:uploading || media.length >= MAX_ATTACHMENTS, style:{ display:'none' }, onChange:function(e){ uploadFiles(e.target.files); e.target.value = ''; } })
          ),
          h('span', { style:{ color:u.textMut, fontSize:11, alignSelf:'center' } }, media.length + ' / ' + MAX_ATTACHMENTS)
        )
      ),
      error ? h('div', { style:{ color:u.red, fontSize:11, marginTop:6, fontWeight:700 } }, error) : null
    );
  }

  function StatusPill(props) {
    var u = ui();
    var label = props.label || statusLabel(props.status);
    var color = props.color || statusColor(props.status);
    return h('span', { style:Object.assign({ display:'inline-flex', alignItems:'center', gap:6, height:24, padding:'0 10px', borderRadius:999, fontSize:11, fontWeight:800, letterSpacing:'-.01em', color:color, background:color + '1f', border:'1px solid ' + color + '44', whiteSpace:'nowrap' }, props.style || {}) },
      props.dot === false ? null : h('span', { style:{ width:6, height:6, borderRadius:99, background:color, flexShrink:0 } }),
      label
    );
  }

  function EmptyPanel(props) {
    var u = ui();
    return h('div', {
      onClick: props.onClick,
      style: Object.assign({
        padding: props.compact ? '16px' : '32px 20px',
        textAlign: 'center',
        color: u.textMut,
        border: '1px dashed ' + u.border,
        borderRadius: 14,
        background: 'rgba(255,255,255,.02)',
        fontSize: 13,
        cursor: props.onClick ? 'pointer' : 'default'
      }, props.style || {})
    },
      props.iconName ? h('div', { style:{ marginBottom:10, display:'flex', justifyContent:'center', color:u.textMut } }, appIcon(props.iconName, 22)) : null,
      props.message || 'Nothing to show yet.'
    );
  }
  function LoadingBlock(props) {
    var u = ui();
    return h('div', { style:{ padding:props.padding || 32, color:u.textMut, fontSize:13, textAlign:'center' } }, props.children || 'Loading...');
  }
  function DetailRow(label, value, renderValue) {
    var u = ui();
    return h('div', { key:label, style:{ display:'grid', gridTemplateColumns:'120px 1fr', gap:14, alignItems:'center', padding:'10px 0', borderBottom:'1px solid ' + u.border } },
      h('div', { style:{ fontSize:12, color:u.textMut, fontWeight:700 } }, label),
      h('div', { style:{ fontSize:13, color:u.text, fontWeight:650, minWidth:0 } }, renderValue ? renderValue(value) : (value || '-'))
    );
  }
  function YesNoBadge(value) {
    var u = ui();
    var v = value || 'Unknown';
    var color = v === 'Yes' ? u.green : v === 'No' ? u.red : u.textMut;
    return h(StatusPill, { label:v, color:color, dot:true, style:{ height:22 } });
  }
  function percentProfile(a) {
    if (!a) return 0;
    var checks = [a.name, a.species, a.breed, a.sex, a.age_label, a.status, a.weight_label, a.energy_level, a.photo, a.bio, a.good_with_dogs, a.good_with_cats, a.good_with_kids, a.public_visible !== null && a.public_visible !== undefined];
    return Math.round(checks.filter(Boolean).length / checks.length * 100);
  }
  function iconButtonStyle(color) {
    return { background:'transparent', border:'none', color:color, cursor:'pointer', padding:6, borderRadius:8, display:'inline-flex', alignItems:'center', justifyContent:'center' };
  }

  var NOTE_TYPES = [
    { value:'general', label:'General', color:'#94a3b8' },
    { value:'medical', label:'Medical', color:'#f87171' },
    { value:'behavioral', label:'Behavioral', color:'#fb923c' },
    { value:'foster', label:'Foster', color:'#a78bfa' },
    { value:'intake', label:'Intake', color:'#60a5fa' },
    { value:'urgent', label:'Urgent', color:'#ef4444' }
  ];
  function noteTypeColor(t) {
    var found = NOTE_TYPES.find(function(n){ return n.value === t; });
    return found ? found.color : '#94a3b8';
  }
  function noteTypeLabel(t) {
    var found = NOTE_TYPES.find(function(n){ return n.value === t; });
    return found ? found.label : labelize(t || 'general');
  }

  function AnimalNotesTab(props) {
    var animalId = props.animalId;
    var isMobile = !!props.isMobile;
    var notesState = useState(null), notes = notesState[0], setNotes = notesState[1];
    var loadingState = useState(true), loading = loadingState[0], setLoading = loadingState[1];
    var submittingState = useState(false), submitting = submittingState[0], setSubmitting = submittingState[1];
    var editingState = useState(null), editingId = editingState[0], setEditingId = editingState[1];
    var deletingState = useState(null), deletingId = deletingState[0], setDeletingId = deletingState[1];
    var errorState = useState(''), error = errorState[0], setError = errorState[1];
    var composeState = useState(false), showCompose = composeState[0], setShowCompose = composeState[1];
    var bodyState = useState(''), body = bodyState[0], setBody = bodyState[1];
    var typeState = useState('general'), noteType = typeState[0], setNoteType = typeState[1];
    var pinnedState = useState(false), isPinned = pinnedState[0], setIsPinned = pinnedState[1];
    var privateState = useState(false), isPrivate = privateState[0], setIsPrivate = privateState[1];
    var editBodyState = useState(''), editBody = editBodyState[0], setEditBody = editBodyState[1];
    var editTypeState = useState('general'), editNoteType = editTypeState[0], setEditNoteType = editTypeState[1];
    var editPinnedState = useState(false), editPinned = editPinnedState[0], setEditPinned = editPinnedState[1];

    var load = useCallback(function() {
      setLoading(true);
      apiJSON('/api/dashboard/animals/' + encodeURIComponent(animalId) + '/notes')
        .then(function(d){ setNotes(d.notes || []); setLoading(false); })
        .catch(function(){ setNotes([]); setLoading(false); });
    }, [animalId]);
    useEffect(function(){ load(); }, [load]);

    function submitNote() {
      var trimmed = (body || '').trim();
      if (!trimmed) { setError('Note body is required.'); return; }
      setError(''); setSubmitting(true);
      apiJSON('/api/dashboard/animals/' + encodeURIComponent(animalId) + '/notes', { method:'POST', body:JSON.stringify({ body:trimmed, note_type:noteType, is_pinned:isPinned ? 1 : 0, is_private:isPrivate ? 1 : 0 }) })
        .then(function(d){
          if (!d.ok) { setError(d.error || 'Failed to save note.'); return; }
          setBody(''); setNoteType('general'); setIsPinned(false); setIsPrivate(false); setShowCompose(false); load();
        })
        .catch(function(e){ setError(e.message || 'Network error.'); })
        .finally(function(){ setSubmitting(false); });
    }
    function saveEdit(noteId) {
      var trimmed = (editBody || '').trim();
      if (!trimmed) return;
      setSubmitting(true);
      apiJSON('/api/dashboard/animals/' + encodeURIComponent(animalId) + '/notes/' + encodeURIComponent(noteId), { method:'PATCH', body:JSON.stringify({ body:trimmed, note_type:editNoteType, is_pinned:editPinned ? 1 : 0 }) })
        .then(function(){ setEditingId(null); load(); }).finally(function(){ setSubmitting(false); });
    }
    function togglePin(note) {
      apiJSON('/api/dashboard/animals/' + encodeURIComponent(animalId) + '/notes/' + encodeURIComponent(note.id), { method:'PATCH', body:JSON.stringify({ is_pinned:note.is_pinned ? 0 : 1 }) }).then(load).catch(function(){});
    }
    function deleteNote(noteId) {
      apiJSON('/api/dashboard/animals/' + encodeURIComponent(animalId) + '/notes/' + encodeURIComponent(noteId), { method:'DELETE' }).then(function(){ setDeletingId(null); load(); }).catch(function(){ setDeletingId(null); load(); });
    }

    if (loading) return h(LoadingBlock, null, 'Loading notes...');
    var u = ui();
    var all = notes || [];
    var pinned = all.filter(function(n){ return !!n.is_pinned; });
    var regular = all.filter(function(n){ return !n.is_pinned; });

    function renderNote(note) {
      var isEditing = editingId === note.id;
      var isConfirm = deletingId === note.id;
      var color = noteTypeColor(note.note_type);
      return h('div', { key:note.id, style:{ background:note.is_pinned ? u.purpleDim : u.surface, border:'1px solid ' + (note.is_pinned ? u.purple + '55' : u.border), borderLeft:'3px solid ' + color, borderRadius:12, padding:isMobile ? '12px' : '14px 16px', marginBottom:10 } },
        h('div', { style:{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8, flexWrap:'wrap' } },
          h('span', { style:{ fontSize:10, fontWeight:900, padding:'3px 8px', borderRadius:999, color:color, background:color + '22', border:'1px solid ' + color + '44', textTransform:'uppercase', letterSpacing:'.05em' } }, noteTypeLabel(note.note_type)),
          note.is_pinned ? h(StatusPill, { label:'Pinned', color:u.purpleL, dot:false, style:{ height:20, fontSize:10 } }) : null,
          note.is_private ? h(StatusPill, { label:'Private', color:u.yellow, dot:false, style:{ height:20, fontSize:10 } }) : null,
          h('div', { style:{ flex:1 } }),
          !isEditing && !isConfirm ? h('div', { style:{ display:'flex', gap:4 } },
            h('button', { title:note.is_pinned ? 'Unpin' : 'Pin note', onClick:function(){ togglePin(note); }, style:iconButtonStyle(note.is_pinned ? u.purpleL : u.textMut) }, appIcon('pin', 14)),
            h('button', { title:'Edit note', onClick:function(){ setEditingId(note.id); setEditBody(note.body || ''); setEditNoteType(note.note_type || 'general'); setEditPinned(!!note.is_pinned); }, style:iconButtonStyle(u.textMut) }, appIcon('edit', 14)),
            h('button', { title:'Delete note', onClick:function(){ setDeletingId(note.id); }, style:iconButtonStyle(u.textMut) }, appIcon('trash', 14))
          ) : null
        ),
        isConfirm ? h('div', { style:{ background:'rgba(248,113,113,.10)', border:'1px solid rgba(248,113,113,.28)', borderRadius:10, padding:12, marginBottom:10, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' } },
          h('span', { style:{ color:u.red, fontSize:13, flex:1 } }, 'Delete this note permanently?'),
          h(Button, { variant:'secondary', size:'sm', onClick:function(){ setDeletingId(null); } }, 'Cancel'),
          h(Button, { variant:'danger', size:'sm', onClick:function(){ deleteNote(note.id); } }, 'Delete')
        ) : null,
        isEditing ? h('div', null,
          h('div', { style:{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '160px 1fr', gap:8, marginBottom:8 } },
            h(SelectInput, { value:editNoteType, onChange:setEditNoteType, options:NOTE_TYPES.map(function(t){ return { value:t.value, label:t.label }; }) }),
            h('label', { style:{ display:'flex', alignItems:'center', gap:8, color:u.textSec, fontSize:12 } }, h('input', { type:'checkbox', checked:editPinned, onChange:function(e){ setEditPinned(e.target.checked); } }), 'Pinned')
          ),
          h(TextArea, { value:editBody, onChange:setEditBody, minHeight:100 }),
          h('div', { style:{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:10 } },
            h(Button, { variant:'secondary', size:'sm', onClick:function(){ setEditingId(null); } }, 'Cancel'),
            h(Button, { size:'sm', disabled:submitting, onClick:function(){ saveEdit(note.id); } }, submitting ? 'Saving...' : 'Save Note')
          )
        ) : h('div', null,
          h('div', { style:{ whiteSpace:'pre-wrap', color:u.textSec, fontSize:13, lineHeight:1.65 } }, note.body || ''),
          h('div', { style:{ marginTop:10, color:u.textMut, fontSize:11, display:'flex', gap:8, flexWrap:'wrap' } },
            h('span', null, note.author_full_name || note.author_name || 'Staff'),
            h('span', null, fmtDateTime(note.created_at)),
            note.edited_at ? h('span', null, 'Edited ' + fmtDateTime(note.edited_at)) : null
          )
        )
      );
    }

    return h('div', null,
      h('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:14, flexWrap:'wrap' } },
        h('div', null,
          h('h3', { style:{ margin:'0 0 4px', color:u.text, fontSize:16 } }, 'Animal Notes'),
          h('div', { style:{ color:u.textMut, fontSize:12 } }, 'Create, pin, edit, and manage internal notes for this animal.')
        ),
        h(Button, { size:'sm', iconName:'plus', onClick:function(){ setShowCompose(!showCompose); } }, showCompose ? 'Close' : 'Add Note')
      ),
      showCompose ? h(SoftCard, { style:{ padding:isMobile ? 14 : 18, marginBottom:18, borderColor:u.purple + '66' } },
        h('div', { style:{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '160px 1fr', gap:10, marginBottom:10 } },
          h('div', null, h(FieldLabel, null, 'Type'), h(SelectInput, { value:noteType, onChange:setNoteType, options:NOTE_TYPES.map(function(t){ return { value:t.value, label:t.label }; }) })),
          h('div', { style:{ display:'flex', alignItems:'end', gap:14, flexWrap:'wrap' } },
            h('label', { style:{ display:'flex', alignItems:'center', gap:8, color:u.textSec, fontSize:12, height:40 } }, h('input', { type:'checkbox', checked:isPinned, onChange:function(e){ setIsPinned(e.target.checked); } }), 'Pin note'),
            h('label', { style:{ display:'flex', alignItems:'center', gap:8, color:u.textSec, fontSize:12, height:40 } }, h('input', { type:'checkbox', checked:isPrivate, onChange:function(e){ setIsPrivate(e.target.checked); } }), 'Private')
          )
        ),
        h(FieldLabel, null, 'Note'),
        h(TextArea, { value:body, onChange:setBody, minHeight:120, placeholder:'Add a clear staff note, foster update, behavior note, or care instruction.' }),
        error ? h('div', { style:{ color:u.red, fontSize:12, marginTop:8 } }, error) : null,
        h('div', { style:{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:10 } },
          h(Button, { variant:'secondary', size:'sm', onClick:function(){ setShowCompose(false); setError(''); } }, 'Cancel'),
          h(Button, { size:'sm', disabled:submitting, onClick:submitNote }, submitting ? 'Saving...' : 'Save Note')
        )
      ) : null,
      all.length === 0 ? h(EmptyPanel, { iconName:'file', message:'No notes yet. Add the first staff note for this animal.' }) : null,
      pinned.length ? h('div', { style:{ marginBottom:14 } }, pinned.map(renderNote)) : null,
      regular.length ? h('div', null, regular.map(renderNote)) : null
    );
  }

  // ── AnimalCard — image uses cover + top anchor so faces are always visible ──
  function AnimalCard(props) {
    var a = props.animal;
    var isMobile = props.isMobile;
    var hoverState = useState(false), hover = hoverState[0], setHover = hoverState[1];
    var u = ui();
    var completion = percentProfile(a);
    var needsFosterBadge = Number(a.foster_needed) === 1 && a.status !== 'foster';
    return h('div', { onClick:function(){ if (props.onOpen) props.onOpen(a); }, onMouseEnter:function(){ setHover(true); }, onMouseLeave:function(){ setHover(false); }, style:{ position:'relative', background:'linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.012)), ' + u.surface, border:'1px solid ' + (hover ? u.purple + '77' : u.border), borderRadius:18, overflow:'hidden', cursor:'pointer', transition:'all .16s ease', transform:hover && !isMobile ? 'translateY(-2px)' : 'none', boxShadow:hover && !isMobile ? '0 22px 58px rgba(12,12,28,.18)' : '0 14px 34px rgba(12,12,28,.08)' } },
      h('div', { style:{ height:isMobile ? 160 : 190, background:u.raised, overflow:'hidden', position:'relative' } },
        a.photo ? h('img', { src:a.photo, alt:a.name || 'Animal photo', style:{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center', display:'block' }, onError:function(e){ e.currentTarget.style.display='none'; } }) :
        h(EmptyPanel, {
          compact: true,
          iconName: 'plus',
          message: 'Add photo',
          onClick: function(e){
            e.stopPropagation();
            window.__editPhotoOfId = a.id;
            if (props.onOpen) props.onOpen(a);
          },
          style: { height:'100%', border:'none', borderRadius:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer' }
        }),
        h('div', { style:{ position:'absolute', top:8, right:8 } }, h(StatusPill, { status:a.status, style:{ background:'rgba(15,15,30,.72)', backdropFilter:'blur(10px)' } })),
        needsFosterBadge ? h('div', { style:{ position:'absolute', top:8, left:8 } }, h(StatusPill, { label:'Foster Needed', color:u.yellow, dot:true, style:{ background:'rgba(15,15,30,.72)', backdropFilter:'blur(10px)' } })) : null,
        hover && !isMobile ? h('div', { style:{ position:'absolute', inset:0, background:'rgba(0,0,0,.42)', display:'flex', alignItems:'center', justifyContent:'center' } }, h(Button, { size:'sm', iconName:'edit' }, 'Edit Profile')) : null
      ),
      h('div', { style:{ padding:isMobile ? '12px' : '14px' } },
        h('div', { style:{ color:u.text, fontSize:14, lineHeight:1.2, fontWeight:900, marginBottom:5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, a.name || 'Unnamed'),
        h('div', { style:{ color:u.textSec, fontSize:11, lineHeight:1.35, minHeight:15, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, (a.species || '-') + ' - ' + (a.breed || '-')),
        h('div', { style:{ color:u.textMut, fontSize:11, lineHeight:1.35, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, [a.age_label, a.sex, a.weight_label].filter(Boolean).join(' - ') || '-'),
        h('div', { style:{ display:'flex', alignItems:'center', gap:8, marginTop:10 } },
          h('div', { style:{ flex:1, height:5, background:'rgba(255,255,255,.08)', borderRadius:99, overflow:'hidden' } }, h('div', { style:{ width:completion + '%', height:'100%', background:completion >= 80 ? u.green : u.purple, borderRadius:99 } })),
          h('span', { style:{ color:u.textMut, fontSize:10, fontWeight:800 } }, completion + '%')
        )
      )
    );
  }

  function LibraryPickerModal(props) {
    var isMobile = props.isMobile, onClose = props.onClose, onSelect = props.onSelect;
    var u = ui();
    var assetsState = useState(null), assets = assetsState[0], setAssets = assetsState[1];
    var loadingState = useState(true), loading = loadingState[0], setLoading = loadingState[1];
    var errorState = useState(''), error = errorState[0], setError = errorState[1];

    useEffect(function(){
      setLoading(true); setError('');
      apiJSON('/api/cms/assets?category=animal')
        .then(function(d){ setAssets(d.assets || []); })
        .catch(function(e){ setError(e.message || 'Failed to load library images'); })
        .finally(function(){ setLoading(false); });
    }, []);

    var content;
    if (loading) {
      content = h('div', { style:{ padding:30, textAlign:'center', color:u.textMut } }, 'Loading library...');
    } else if (error) {
      content = h('div', { style:{ padding:30, textAlign:'center', color:u.red } }, error);
    } else if (!assets || assets.length === 0) {
      content = h('div', { style:{ padding:30, textAlign:'center', color:u.textMut } }, 'No animal photos in library.');
    } else {
      content = h('div', { style:{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(100px, 1fr))', gap:12, maxHeight:320, overflowY:'auto', padding:'4px 2px' } },
        assets.map(function(asset){
          var url = asset.public_url || asset.cdn_url || asset.pub_url || asset.url || '';
          return h('div', {
            key: asset.id,
            onClick: function(){ onSelect(url); },
            style: {
              background: u.raised,
              border: '1px solid ' + u.border,
              borderRadius: 12,
              overflow: 'hidden',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              transition: 'border-color 0.2s',
            }
          },
            h('div', { style:{ width:'100%', height:80, background:'#000', overflow:'hidden' } },
              h('img', { src:url, alt:asset.label || 'Asset', style:{ width:'100%', height:'100%', objectFit:'cover' } })
            ),
            h('div', { style:{ padding:6, fontSize:10, color:u.text, textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap', fontWeight:700, textAlign:'center' } }, asset.label || asset.filename || 'Image')
          );
        })
      );
    }

    return h('div', { style:{ position:'fixed', inset:0, zIndex:250, background:'rgba(0,0,0,.52)', display:'flex', alignItems:'center', justifyContent:'center', padding:isMobile ? 0 : 16 } },
      h('div', { style:{ width:isMobile ? '100%' : 460, maxHeight:'90vh', background:u.bg, border:'1px solid ' + u.border, borderRadius:isMobile ? 0 : 16, padding:18, display:'flex', flexDirection:'column', boxSizing:'border-box' } },
        h('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 } },
          h('h3', { style:{ margin:0, color:u.text, fontSize:16, fontWeight:800 } }, 'Select Photo from Library'),
          h(Button, { variant:'secondary', size:'sm', onClick:onClose }, 'Close')
        ),
        content
      )
    );
  }

  function ProfilePhotoField(props) {
    var photoUrl = props.value, onChange = props.onChange, animalName = props.animalName || 'Animal', isMobile = props.isMobile;
    var u = ui();
    var uploadingState = useState(false), uploading = uploadingState[0], setUploading = uploadingState[1];
    var errorState = useState(''), error = errorState[0], setError = errorState[1];
    var pickerState = useState(false), showPicker = pickerState[0], setShowPicker = pickerState[1];

    function uploadPhoto(file) {
      if (!file) return;
      setUploading(true);
      setError('');
      var fd = new FormData();
      fd.append('file', file);
      fd.append('usage_context', 'animal_profile');
      fd.append('category', 'animal');
      fd.append('label', animalName || file.name);
      fd.append('alt_text', (animalName || 'Animal') + ' photo');

      fetch('/api/cms/asset/upload', { method:'POST', credentials:'include', body:fd })
        .then(function(res){
          if (!res.ok) {
            return res.json().catch(function(){ return {}; }).then(function(d){
              throw new Error(d.error || 'Upload failed with status ' + res.status);
            });
          }
          return res.json();
        })
        .then(function(d){
          var uploadedUrl = d.public_url || d.cdn_url || d.pub_url || d.url;
          if (uploadedUrl) {
            onChange(uploadedUrl);
          } else {
            throw new Error('Upload succeeded but no public URL was returned.');
          }
        })
        .catch(function(err){
          setError(err.message || 'Upload failed');
        })
        .finally(function(){
          setUploading(false);
        });
    }

    return h('div', { style:{ border:'1px solid ' + u.border, borderRadius:14, padding:14, background:u.surface, display:'flex', flexDirection:'column', gap:10, marginBottom:8 } },
      h('div', { style:{ display:'flex', gap:12, alignItems:'center' } },
        h('div', { style:{ width:70, height:70, borderRadius:12, overflow:'hidden', border:'1px solid ' + u.border, background:u.raised, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' } },
          photoUrl ? h('img', { src:photoUrl, alt:'Preview', style:{ width:'100%', height:'100%', objectFit:'cover' } }) :
          h('span', { style:{ fontSize:10, color:u.textMut, fontWeight:700 } }, 'No Photo')
        ),
        h('div', { style:{ display:'flex', flexDirection:'column', gap:6, flex:1 } },
          h('div', { style:{ display:'flex', gap:8, flexWrap:'wrap' } },
            h('label', { style:{ height:34, border:'1px solid ' + u.purple, borderRadius:10, display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'0 12px', color:'#fff', background:u.purple, fontSize:12, fontWeight:800, cursor:uploading ? 'not-allowed' : 'pointer', opacity:uploading ? .6 : 1 } },
              uploading ? 'Uploading...' : 'Upload Photo',
              h('input', { type:'file', accept:'image/*', disabled:uploading, style:{ display:'none' }, onChange:function(e){ if (e.target.files && e.target.files[0]) uploadPhoto(e.target.files[0]); } })
            ),
            h(Button, { variant:'secondary', size:'sm', onClick:function(){ setShowPicker(true); } }, 'Choose from Library')
          ),
          photoUrl ? h('div', null,
            h('button', {
              onClick: function(){ onChange(''); },
              style: { border:'none', background:'transparent', color:u.red, fontSize:11, fontWeight:800, cursor:'pointer', padding:0 }
            }, 'Clear photo')
          ) : null
        )
      ),
      h('div', null,
        h(FieldLabel, null, 'Photo URL'),
        h(TextInput, {
          value: photoUrl,
          placeholder: 'https://...',
          onChange: onChange,
          style: { height:36, fontSize:12 }
        }),
        h('span', { style:{ fontSize:10, color:u.textMut, marginTop:4, display:'block' } },
          'Upload a photo, choose an existing media asset, or paste an official image URL.'
        )
      ),
      error ? h('div', { style:{ color:u.red, fontSize:11, fontWeight:700 } }, error) : null,
      showPicker ? h(LibraryPickerModal, {
        isMobile: isMobile,
        onClose: function(){ setShowPicker(false); },
        onSelect: function(url){ onChange(url); setShowPicker(false); }
      }) : null
    );
  }

  function AnimalAddModal(props) {
    var isMobile = props.isMobile;
    var u = ui();
    var formState = useState({ name:'', species:'Dog', breed:'', sex:'Unknown', status:'available', photo_url:'', age_value:'', age_unit:'years', weight_value:'', weight_unit:'lbs' });
    var form = formState[0], setForm = formState[1];
    var savingState = useState(false), saving = savingState[0], setSaving = savingState[1];
    var errorState = useState(''), error = errorState[0], setError = errorState[1];
    var fieldErrorsState = useState({}), fieldErrors = fieldErrorsState[0], setFieldErrors = fieldErrorsState[1];
    function set(k, v) { var next = Object.assign({}, form); next[k] = v; setForm(next); }
    function submit() {
      if (!form.name.trim()) { setError('Name is required.'); return; }
      var ageLabel = formatAgeLabel(form.age_value, form.age_unit);
      var weightLabel = formatWeightLabel(form.weight_value, form.weight_unit);
      var errors = {};
      if (String(form.age_value || '').trim() && !ageLabel) errors.age = 'Enter a valid age number.';
      if (String(form.weight_value || '').trim() && !weightLabel) errors.weight = 'Enter a valid weight number.';
      if (Object.keys(errors).length) { setFieldErrors(errors); return; }
      setFieldErrors({});
      var payload = {
        name:form.name, species:form.species, breed:form.breed, sex:form.sex, status:form.status,
        photo_url:form.photo_url, age_label:ageLabel || 'Unknown', weight_label:weightLabel || null
      };
      setSaving(true); setError('');
      apiJSON('/api/dashboard/animals', { method:'POST', body:JSON.stringify(payload) })
        .then(function(d){ if (!d.ok) throw new Error(d.error || 'Could not add animal.'); if (props.onSaved) props.onSaved(); })
        .catch(function(e){ setError(e.message || 'Could not add animal.'); })
        .finally(function(){ setSaving(false); });
    }
    return h('div', { style:{ position:'fixed', inset:0, zIndex:220, background:'rgba(0,0,0,.48)', display:'flex', alignItems:isMobile ? 'stretch' : 'center', justifyContent:'center', padding:isMobile ? 0 : 24 } },
      h('div', { style:{ width:isMobile ? '100%' : 520, maxHeight:'100vh', overflowY:'auto', background:u.bg, border:'1px solid ' + u.border, borderRadius:isMobile ? 0 : 20, padding:isMobile ? 18 : 24, boxSizing:'border-box' } },
        h('div', { style:{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'center', marginBottom:18 } }, h('h2', { style:{ margin:0, color:u.text, fontSize:20 } }, 'Add Animal'), h(Button, { variant:'secondary', size:'sm', onClick:props.onClose }, 'Close')),
        h('div', { style:{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '1fr 1fr', gap:12 } },
          h('div', { style:{ gridColumn:isMobile ? 'span 1' : 'span 2' } }, h(ProfilePhotoField, { value:form.photo_url || '', onChange:function(v){ set('photo_url', v); }, animalName:form.name, isMobile:isMobile })),
          h('div', null, h(FieldLabel, null, 'Name'), h(TextInput, { value:form.name, onChange:function(v){ set('name', v); } })),
          h('div', null, h(FieldLabel, null, 'Species'), h(SelectInput, { value:form.species, onChange:function(v){ set('species', v); }, options:['Dog','Cat','Other'] })),
          h('div', null, h(FieldLabel, null, 'Breed'), h(TextInput, { value:form.breed, onChange:function(v){ set('breed', v); } })),
          h(AgeFieldGroup, { value:form.age_value, unit:form.age_unit, error:fieldErrors.age, onValueChange:function(v){ set('age_value', v); }, onUnitChange:function(v){ set('age_unit', v); } }),
          h('div', null, h(FieldLabel, null, 'Sex'), h(SelectInput, { value:form.sex, onChange:function(v){ set('sex', v); }, options:['Male','Female','Unknown'] })),
          h(WeightFieldGroup, { value:form.weight_value, unit:form.weight_unit, error:fieldErrors.weight, onValueChange:function(v){ set('weight_value', v); }, onUnitChange:function(v){ set('weight_unit', v); } }),
          h('div', null, h(FieldLabel, null, 'Status'), h(SelectInput, { value:form.status, onChange:function(v){ set('status', v); }, options:[{value:'available', label:'Available'}, {value:'foster', label:'Foster'}, {value:'medical', label:'Medical'}, {value:'adopted', label:'Adopted'}] }))
        ),
        error ? h('div', { style:{ color:u.red, fontSize:12, marginTop:12 } }, error) : null,
        h('div', { style:{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:20 } }, h(Button, { variant:'secondary', onClick:props.onClose }, 'Cancel'), h(Button, { disabled:saving, onClick:submit }, saving ? 'Saving...' : 'Add Animal'))
      )
    );
  }

  function AnimalsView(props) {
    var onNavigate = props.onNavigate;
    var animalsState = useState([]), animals = animalsState[0], setAnimals = animalsState[1];
    var loadingState = useState(true), loading = loadingState[0], setLoading = loadingState[1];
    var errorState = useState(''), error = errorState[0], setError = errorState[1];
    var filterState = useState('All'), filter = filterState[0], setFilter = filterState[1];
    var searchState = useState(''), search = searchState[0], setSearch = searchState[1];
    var viewState = useState('grid'), viewMode = viewState[0], setViewMode = viewState[1];
    var addState = useState(false), showAdd = addState[0], setShowAdd = addState[1];
    var bp = useBreakpoint();
    var isMobile = bp === 'mobile';
    var u = ui();
    function loadAnimals() {
      setLoading(true); setError('');
      apiJSON('/api/dashboard/animals').then(function(d){ setAnimals(d.animals || []); setLoading(false); }).catch(function(e){ setError(e.message || 'Failed to load animals.'); setLoading(false); });
    }
    useEffect(function(){ loadAnimals(); }, []);
    function filterMatch(a, f) {
      if (f === 'All') return true;
      if (f === 'Dogs') return a.species === 'Dog';
      if (f === 'Cats') return a.species === 'Cat';
      if (f === 'Available') return a.status === 'available';
      if (f === 'Foster') return a.status === 'foster' || Number(a.foster_needed) === 1;
      if (f === 'Medical') return a.status === 'medical' || a.status === 'medical watch';
      if (f === 'Adopted') return a.status === 'adopted';
      return true;
    }
    var q = search.toLowerCase().trim();
    var filtered = animals.filter(function(a){ return filterMatch(a, filter) && (!q || [a.name, a.breed, a.age_label, a.id, a.species].some(function(v){ return v && String(v).toLowerCase().indexOf(q) !== -1; })); });
    var tabs = ['All','Dogs','Cats','Available','Foster','Medical','Adopted'].map(function(f){ return { value:f, label:f, count:animals.filter(function(a){ return filterMatch(a, f); }).length }; });
    var columns = isMobile ? 'repeat(2, minmax(0,1fr))' : bp === 'tablet' ? 'repeat(3, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))';
    return h('div', { className: 'dash-page' },
      h(PageHeader, {
        title: 'Animals',
        subtitle: animals.length + ' total animals in the system',
        action: h('div', { style:{ display:'flex', gap:8, flexWrap:'wrap' } }, h(Button, { variant:'secondary', size:'sm', iconName:'download', onClick:function(){ window.print && window.print(); } }, 'Export'), h(Button, { size:'sm', iconName:'plus', onClick:function(){ setShowAdd(true); } }, 'Add Animal'))
      }),
      h('div', { style:{ marginBottom:14, overflowX:'auto', whiteSpace:'nowrap', paddingBottom:2 } }, h('div', { style:{ display:'inline-flex', gap:4, borderBottom:'1px solid ' + u.border, minWidth:'100%' } }, tabs.map(function(t){ var active = filter === t.value; return h('button', { key:t.value, onClick:function(){ setFilter(t.value); }, style:{ border:'none', background:'transparent', color:active ? u.purpleL : u.textSec, padding:'12px 14px', borderBottom:'2px solid ' + (active ? u.purple : 'transparent'), fontWeight:active ? 900 : 700, fontSize:13, cursor:'pointer' } }, t.label, h('span', { style:{ marginLeft:7, color:active ? u.purpleL : u.textMut, fontSize:11 } }, t.count)); }))),
      h('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:16, flexWrap:'wrap' } },
        h('div', { style:{ position:'relative', flex:isMobile ? '1 1 100%' : '0 1 360px' } }, h('div', { style:{ position:'absolute', left:12, top:11, color:u.textMut } }, appIcon('search', 15)), h(TextInput, { value:search, onChange:setSearch, placeholder:'Search animals, breeds, ages...', style:{ paddingLeft:36, height:42 } })),
        h('div', { style:{ display:'flex', gap:4, padding:4, border:'1px solid ' + u.border, borderRadius:12, background:u.surface } }, [['grid','grid'], ['list','list']].map(function(item){ var active = viewMode === item[0]; return h('button', { key:item[0], onClick:function(){ setViewMode(item[0]); }, style:{ width:36, height:32, border:'none', borderRadius:9, background:active ? u.purple : 'transparent', color:active ? '#fff' : u.textMut, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center' } }, appIcon(item[1], 15)); }))
      ),
      error ? h(EmptyPanel, { message:error, iconName:'file', style:{ marginBottom:16, borderColor:u.red + '66', color:u.red } }) : null,
      loading ? h(LoadingBlock, null, 'Loading animals...') : filtered.length === 0 ? h(EmptyPanel, { iconName:'search', message:'No animals match this search or filter.' }) : viewMode === 'grid' ? h('div', { style:{ display:'grid', gridTemplateColumns:columns, gap:isMobile ? 14 : 16 } }, filtered.map(function(a){ return h(AnimalCard, { key:a.id, animal:a, isMobile:isMobile, onOpen:function(row){ if (onNavigate) onNavigate('animal-profile', { animalId:row.id }); } }); })) : h(SoftCard, { style:{ overflowX:'auto' } }, renderAnimalTable(filtered, onNavigate)),
      showAdd ? h(AnimalAddModal, { isMobile:isMobile, onClose:function(){ setShowAdd(false); }, onSaved:function(){ setShowAdd(false); loadAnimals(); } }) : null
    );
  }

  function tdStyle() { var u = ui(); return { padding:'12px 14px', borderBottom:'1px solid ' + u.border, color:u.textSec, fontSize:13 }; }
  function renderAnimalTable(rows, onNavigate) {
    var u = ui();
    return h('table', { style:{ width:'100%', borderCollapse:'collapse', minWidth:720 } },
      h('thead', null, h('tr', null, ['Animal','Species','Breed','Age','Sex','Status','Profile'].map(function(hd){ return h('th', { key:hd, style:{ textAlign:'left', padding:'12px 14px', color:u.textMut, fontSize:11, textTransform:'uppercase', letterSpacing:'.06em', borderBottom:'1px solid ' + u.border } }, hd); }))),
      h('tbody', null, rows.map(function(a){ return h('tr', { key:a.id, onClick:function(){ if (onNavigate) onNavigate('animal-profile', { animalId:a.id }); }, style:{ cursor:'pointer' } },
        h('td', { style:tdStyle() }, h('div', { style:{ display:'flex', alignItems:'center', gap:10 } }, a.photo ? h('img', { src:a.photo, alt:a.name, style:{ width:38, height:38, borderRadius:9, objectFit:'cover', objectPosition:'top center' } }) : null, h('div', null, h('div', { style:{ color:u.text, fontWeight:800 } }, a.name), h('div', { style:{ color:u.textMut, fontSize:11 } }, a.id)))),
        h('td', { style:tdStyle() }, a.species || '-'), h('td', { style:tdStyle() }, a.breed || '-'), h('td', { style:tdStyle() }, a.age_label || '-'), h('td', { style:tdStyle() }, a.sex || '-'), h('td', { style:tdStyle() }, h(StatusPill, { status:a.status })), h('td', { style:tdStyle() }, percentProfile(a) + '%')
      ); }))
    );
  }

  function ProfileHero(props) {
    var a = props.animal, foster = props.foster, isMobile = props.isMobile, onEditPhoto = props.onEditPhoto;
    var u = ui();
    return h(SoftCard, { style:{ padding:isMobile ? 16 : 22, marginBottom:18 } },
      h('div', { style:{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '160px 1fr', gap:isMobile ? 14 : 22, alignItems:'start' } },
        h('div', { style:{ width:isMobile ? '100%' : 160, height:isMobile ? 220 : 200, borderRadius:16, overflow:'hidden', border:'1px solid ' + u.border, background:u.raised } },
          a.photo ? h('img', { src:a.photo, alt:a.name, style:{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center', display:'block' } }) :
          h(EmptyPanel, {
            compact: true,
            iconName: 'plus',
            message: 'Add photo',
            onClick: onEditPhoto,
            style: { height:'100%', border:'none', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer' }
          })
        ),
        h('div', null,
          h('div', { style:{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:6 } }, h('h2', { style:{ margin:0, color:u.text, fontSize:isMobile ? 24 : 28, fontWeight:950, letterSpacing:'-.04em' } }, a.name || 'Unnamed'), h(StatusPill, { status:a.status })),
          h('div', { style:{ color:u.textSec, fontSize:13, marginBottom:12 } }, [a.breed, a.species].filter(Boolean).join(' - ') || 'Animal profile'),
          h('div', { style:{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 } }, [a.age_label, a.sex, a.weight_label, a.energy_level].filter(Boolean).map(function(x){ return h(StatusPill, { key:x, label:x, color:u.textMut, dot:false, style:{ height:24 } }); })),
          a.intake_date ? h('div', { style:{ color:u.textMut, fontSize:12, marginBottom:12 } }, 'Intake date: ' + fmtDate(a.intake_date)) : null,
          (a.tags || []).length ? h('div', { style:{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 } }, a.tags.map(function(t){ return h('span', { key:t, style:{ padding:'4px 8px', borderRadius:999, background:'rgba(255,255,255,.06)', color:u.textMut, fontSize:11, fontWeight:700 } }, labelize(t)); })) : null,
          Number(a.foster_needed) === 1 && !foster ? h('div', { style:{ padding:12, borderRadius:12, border:'1px solid ' + u.yellow + '44', background:u.yellow + '14', color:u.yellow, fontSize:13, fontWeight:800, marginTop:12, display:'flex', gap:8, alignItems:'center' } }, appIcon('alert', 15, { color:u.yellow }), 'This dog needs a foster home.') : null,
          foster ? h('div', { style:{ padding:14, borderRadius:14, border:'1px solid ' + u.purple + '44', background:u.purpleDim, color:u.textSec, fontSize:13, lineHeight:1.55, marginTop:12 } },
            h('div', { style:{ display:'flex', alignItems:'center', gap:8, color:u.purpleL, fontWeight:900, marginBottom:5 } }, appIcon('heart', 15, { color:u.purpleL }), 'In foster with ' + (foster.foster_name || 'current foster')),
            h('div', null, [foster.foster_phone, labelize(foster.foster_type), foster.start_date ? 'Since ' + fmtDate(foster.start_date) : null].filter(Boolean).join(' - ')),
            h('div', null, [foster.expected_end_date ? 'Expected return: ' + fmtDate(foster.expected_end_date) : null, foster.check_in_frequency ? 'Check-ins: ' + labelize(foster.check_in_frequency) : null].filter(Boolean).join(' - ')),
            foster.notes ? h('div', { style:{ marginTop:6 } }, 'Notes: ' + foster.notes) : null
          ) : null
        )
      )
    );
  }

  function OverviewTab(props) {
    var data = props.data, isMobile = props.isMobile, saveBio = props.saveBio, saving = props.saving, saveMsg = props.saveMsg;
    var a = data.animal;
    var u = ui();
    return h('div', { style:{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '1.5fr 1fr', gap:16 } },
      h(SoftCard, { style:{ padding:18 } },
        h('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:10 } }, h('h3', { style:{ margin:0, color:u.text, fontSize:15 } }, 'About'), h('div', { style:{ fontSize:12, color:saving ? u.yellow : saveMsg ? u.green : u.textMut } }, saving ? 'Saving...' : saveMsg)),
        h(TextArea, { defaultValue:a.bio || '', onBlur:function(e){ if (e.target.value !== (a.bio || '')) saveBio(e.target.value); }, minHeight:isMobile ? 140 : 180, placeholder:'No bio yet. Add one to help potential fosters connect.' })
      ),
      h(SoftCard, { style:{ padding:18 } },
        h('h3', { style:{ margin:'0 0 8px', color:u.text, fontSize:15 } }, 'Details'),
        [
          ['Species', a.species], ['Breed', a.breed], ['Age', a.age_label], ['Sex', a.sex], ['Weight', a.weight_label], ['Energy', a.energy_level], ['Intake Date', a.intake_date ? fmtDate(a.intake_date) : '-'],
          ['Good w/ Dogs', a.good_with_dogs, YesNoBadge], ['Good w/ Cats', a.good_with_cats, YesNoBadge], ['Good w/ Kids', a.good_with_kids, YesNoBadge],
          ['Public', Number(a.public_visible) === 1 ? 'Visible' : 'Hidden'], ['Featured', Number(a.featured) === 1 ? 'Yes' : 'No']
        ].map(function(row){ return DetailRow(row[0], row[1], row[2]); })
      )
    );
  }

  function CareTab(props) {
    var data = props.data, animalId = props.animalId, careTasks = props.careTasks, setCareTasks = props.setCareTasks, showAddTask = props.showAddTask, setShowAddTask = props.setShowAddTask, newTask = props.newTask, setNewTask = props.setNewTask;
    var u = ui();
    var isMobile = props.isMobile;
    function setTask(k, v) { var n = Object.assign({}, newTask); n[k] = v; setNewTask(n); }
    function addTask() {
      if (!newTask.title.trim()) return;
      var payload = Object.assign({}, newTask);
      if (payload.due_at) payload.due_at = payload.due_at + 'T12:00:00Z';
      apiJSON('/api/dashboard/animals/' + encodeURIComponent(animalId) + '/care-tasks', { method:'POST', body:JSON.stringify(payload) }).then(function(d){
        setShowAddTask(false); setNewTask({ task_type:'feed', title:'', priority:'normal', due_at:'' });
        return apiJSON('/api/dashboard/animals/' + encodeURIComponent(animalId) + '/care-tasks');
      }).then(function(d){ setCareTasks(d.care_tasks || []); }).catch(function(){});
    }
    function completeTask(task) {
      var done = task.status === 'completed';
      apiJSON('/api/dashboard/animals/' + encodeURIComponent(animalId) + '/care-tasks/' + encodeURIComponent(task.id), { method:'PATCH', body:JSON.stringify({ status:done ? 'open' : 'completed', completed_at:done ? null : new Date().toISOString() }) }).then(function(){
        setCareTasks((careTasks || []).map(function(t){ return t.id === task.id ? Object.assign({}, t, { status:done ? 'open' : 'completed', completed_at:done ? null : new Date().toISOString() }) : t; }));
      });
    }
    function group(title, types) {
      var list = (careTasks || []).filter(function(t){ return types.indexOf(t.task_type) !== -1; });
      if (!list.length) return null;
      return h('div', { style:{ marginTop:16 } }, h('h4', { style:{ margin:'0 0 10px', color:u.text, fontSize:13 } }, title), list.map(function(t){ var done = t.status === 'completed'; return h('div', { key:t.id, style:{ padding:'12px', border:'1px solid ' + u.border, borderRadius:12, background:u.surface, marginBottom:8, opacity:done ? .55 : 1 } },
        h('div', { style:{ display:'flex', alignItems:'flex-start', gap:10 } },
          h('input', { type:'checkbox', checked:done, onChange:function(){ completeTask(t); }, style:{ marginTop:3 } }),
          h('div', { style:{ flex:1 } }, h('div', { style:{ color:u.text, fontWeight:800, textDecoration:done ? 'line-through' : 'none' } }, t.title), t.description ? h('div', { style:{ color:u.textMut, fontSize:12, marginTop:3 } }, t.description) : null, h('div', { style:{ display:'flex', gap:8, flexWrap:'wrap', marginTop:7 } }, h(StatusPill, { label:labelize(t.task_type), color:u.textMut, dot:false, style:{ height:20, fontSize:10 } }), h(StatusPill, { label:labelize(t.priority || 'normal'), color:t.priority === 'urgent' ? u.red : t.priority === 'high' ? u.yellow : u.textMut, dot:false, style:{ height:20, fontSize:10 } }), t.due_at ? h('span', { style:{ color:u.textMut, fontSize:11, display:'inline-flex', alignItems:'center', gap:4 } }, appIcon('clock', 12), fmtDateTime(t.due_at)) : null))
        )
      ); }));
    }
    return h('div', null,
      data.animal.medical_notes ? h('div', { style:{ padding:14, borderRadius:14, border:'1px solid ' + u.yellow + '44', background:u.yellow + '14', color:u.yellow, fontSize:13, fontWeight:700, lineHeight:1.55, marginBottom:14, display:'flex', gap:10 } }, appIcon('alert', 16, { color:u.yellow }), h('div', null, data.animal.medical_notes)) : null,
      h('div', { style:{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'center', marginBottom:12, flexWrap:'wrap' } }, h('h3', { style:{ margin:0, color:u.text, fontSize:16 } }, 'Care & Medical Tasks'), h(Button, { size:'sm', iconName:'plus', onClick:function(){ setShowAddTask(!showAddTask); } }, showAddTask ? 'Close' : 'Add Task')),
      showAddTask ? h(SoftCard, { style:{ padding:16, marginBottom:16 } }, h('div', { style:{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '140px 1fr 140px 150px', gap:10 } },
        h('div', null, h(FieldLabel, null, 'Type'), h(SelectInput, { value:newTask.task_type, onChange:function(v){ setTask('task_type', v); }, options:['feed','walk','med','vaccine','procedure','check'] })),
        h('div', null, h(FieldLabel, null, 'Title'), h(TextInput, { value:newTask.title, onChange:function(v){ setTask('title', v); }, placeholder:'Task title' })),
        h('div', null, h(FieldLabel, null, 'Priority'), h(SelectInput, { value:newTask.priority, onChange:function(v){ setTask('priority', v); }, options:['normal','high','urgent'] })),
        h('div', null, h(FieldLabel, null, 'Due Date'), h(TextInput, { type:'date', value:newTask.due_at, onChange:function(v){ setTask('due_at', v); } }))
      ), h('div', { style:{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:12 } }, h(Button, { variant:'secondary', onClick:function(){ setShowAddTask(false); } }, 'Cancel'), h(Button, { onClick:addTask }, 'Save Task'))) : null,
      careTasks === null ? h(LoadingBlock, null, 'Loading tasks...') : careTasks.length === 0 ? h(EmptyPanel, { iconName:'check', message:'No care tasks yet.' }) : h('div', null, group('Medical', ['med','vaccine','procedure','check']), group('Daily Care', ['feed','walk']))
    );
  }

  function ApplicationsTab(props) {
    var apps = props.applications;
    var u = ui();
    function badgeColor(s) { return s === 'approved' ? u.green : s === 'denied' ? u.red : s === 'under_review' ? u.yellow : u.textMut; }
    function saveNotes(app, value) {
      apiJSON('/api/dashboard/applications/' + encodeURIComponent(app.id), { method:'PATCH', body:JSON.stringify({ internal_notes:value }) }).catch(function(){});
    }
    if (apps === null) return h(LoadingBlock, null, 'Loading applications...');
    if (!apps.length) return h(EmptyPanel, { iconName:'file', message:'No applications for this animal.' });
    return h('div', null, apps.map(function(app){ var answers = parseAnswers(app.answers_json || app.answers); var name = [app.first_name, app.last_name].filter(Boolean).join(' ') || app.applicant_name || 'Applicant'; return h(SoftCard, { key:app.id, style:{ padding:16, marginBottom:12 } },
      h('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' } }, h('div', null, h('div', { style:{ color:u.text, fontWeight:900, fontSize:15 } }, name), h('div', { style:{ color:u.textSec, fontSize:12, marginTop:3 } }, [app.email || app.applicant_email, app.phone].filter(Boolean).join(' - ')), h('div', { style:{ color:u.textMut, fontSize:11, marginTop:3 } }, 'Submitted: ' + fmtDate(app.submitted_at || app.created_at))), h(StatusPill, { label:labelize(app.review_status || app.status || 'new'), color:badgeColor(app.review_status || app.status) })),
      h('div', { style:{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10, marginTop:14 } }, h('div', { style:{ color:u.textSec, fontSize:12 } }, 'Home type: ' + (answers.home_type || answers.housing || '-')), h('div', { style:{ color:u.textSec, fontSize:12 } }, 'Experience: ' + (answers.experience || answers.pet_experience || '-'))),
      h('div', { style:{ marginTop:14 } }, h(FieldLabel, null, 'Internal Notes'), h(TextArea, { defaultValue:app.internal_notes || '', minHeight:80, onBlur:function(e){ if (e.target.value !== (app.internal_notes || '')) saveNotes(app, e.target.value); } }))
    ); }))
  }

  function ToggleRow(props) {
    var u = ui();
    return h('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'10px 0', borderBottom:'1px solid ' + u.border } },
      h('div', null, h('div', { style:{ color:u.text, fontSize:13, fontWeight:800 } }, props.label), props.help ? h('div', { style:{ color:u.textMut, fontSize:11, marginTop:2 } }, props.help) : null),
      h('button', { onClick:props.onClick, style:{ width:42, height:24, borderRadius:99, border:'1px solid ' + (props.checked ? u.green : u.border), background:props.checked ? u.green + '33' : u.raised, padding:2, cursor:'pointer' } }, h('span', { style:{ display:'block', width:18, height:18, borderRadius:99, background:props.checked ? u.green : u.textMut, transform:props.checked ? 'translateX(16px)' : 'translateX(0)', transition:'transform .15s' } }))
    );
  }

  function PublishPanel(props) {
    var data = props.data, reload = props.reload, isCompact = props.isCompact;
    var a = data.animal;
    var postDraft = props.postDraft, setPostDraft = props.setPostDraft;
    var posting = props.posting, setPosting = props.setPosting;
    var u = ui();
    function patchAnimal(payload) { return apiJSON('/api/dashboard/animals/' + encodeURIComponent(a.id), { method:'PATCH', body:JSON.stringify(payload) }).then(reload).catch(function(){}); }
    function isConnected(key) {
      if (key === 'email') return true;
      return (data.social_connections || []).some(function(c){ return c.provider === key && c.status === 'connected'; });
    }
    function setDraft(k, v) { var n = Object.assign({}, postDraft); n[k] = v; setPostDraft(n); }
    function togglePlatform(key) {
      if (!isConnected(key)) return;
      var current = postDraft.platforms || [];
      setDraft('platforms', current.indexOf(key) === -1 ? current.concat([key]) : current.filter(function(p){ return p !== key; }));
    }
    function generatePost() {
      setPosting(true);
      apiJSON('/api/agentsam/chat', { method:'POST', body:JSON.stringify({ mode:'ask', message:'Write a 2-sentence social media post for a rescue dog named ' + (a.name || 'this animal') + '. Breed: ' + (a.breed || 'Unknown') + '. Age: ' + (a.age_label || 'Unknown') + '. Bio: ' + (a.bio || '') + '. Warm, urgent tone. Under 160 characters. No hashtags.' }) })
        .then(function(d){ var text = d.response || d.message || d.content || d.text || (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || ''; if (text) setDraft('content_text', text); })
        .finally(function(){ setPosting(false); });
    }
    function submitPost(schedule) {
      if (!postDraft.content_text || !(postDraft.platforms || []).length) return;
      setPosting(true);
      var media = postDraft.media || [];
      apiJSON('/api/dashboard/animals/' + encodeURIComponent(a.id) + '/publish', { method:'POST', body:JSON.stringify({
        content_text: postDraft.content_text,
        platforms: postDraft.platforms,
        media: media,
        media_url: media[0] ? media[0].url : (a.photo || null),
        media_type: media[0] ? media[0].type : 'image',
        scheduled_at: schedule ? postDraft.scheduled_at : null
      }) })
        .then(function(){ setPostDraft({ content_text:'', platforms:[], scheduled_at:'', media:[] }); reload(); }).finally(function(){ setPosting(false); });
    }
    function cancelPost(post) {
      apiJSON('/api/dashboard/animals/' + encodeURIComponent(a.id) + '/posts/' + encodeURIComponent(post.id), { method:'DELETE' }).then(reload).catch(function(){});
    }
    function section(title, children, style) { return h(SoftCard, { style:Object.assign({ padding:16, marginBottom:14 }, style || {}) }, h('h3', { style:{ margin:'0 0 12px', color:u.text, fontSize:15 } }, title), children); }
    var charCount = (postDraft.content_text || '').length;
    var canSubmit = !!(postDraft.content_text || '').trim() && (postDraft.platforms || []).length;
    return h('div', { style:{ width:isCompact ? '100%' : 340 } },
      section('Publishing', h('div', null,
        h('div', { style:{ marginBottom:10 } }, h(FieldLabel, null, 'Status'), h(SelectInput, { value:a.status || 'available', onChange:function(v){ patchAnimal({ status:v }); }, options:[{value:'available', label:'Available'}, {value:'foster', label:'Foster'}, {value:'medical', label:'Medical'}, {value:'adopted', label:'Adopted'}] })),
        h(ToggleRow, { label:'Visible', help:'Show on public website', checked:Number(a.public_visible) === 1, onClick:function(){ patchAnimal({ public_visible:Number(a.public_visible) === 1 ? 0 : 1 }); } }),
        h(ToggleRow, { label:'Featured', help:'Prioritize in animal grids', checked:Number(a.featured) === 1, onClick:function(){ patchAnimal({ featured:Number(a.featured) === 1 ? 0 : 1 }); } }),
        h('div', { style:{ marginTop:12 } }, h(FieldLabel, null, 'Profile completeness'), h('div', { style:{ display:'flex', alignItems:'center', gap:8 } }, h('div', { style:{ flex:1, height:7, borderRadius:99, background:'rgba(255,255,255,.08)', overflow:'hidden' } }, h('div', { style:{ width:percentProfile(a) + '%', height:'100%', background:u.purple } })), h('span', { style:{ color:u.textMut, fontSize:12, fontWeight:800 } }, percentProfile(a) + '%')))
      )),
      section('Post & Schedule', h('div', null,
        h(TextArea, { value:postDraft.content_text || '', onChange:function(v){ setDraft('content_text', v); }, minHeight:120, placeholder:'Write a post about this animal...' }),
        h('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 } },
          h('span', { style:{ color:u.textMut, fontSize:11 } }, 'Images, PDFs, and videos can be attached below'),
          h('span', { style:{ color:charCount > 280 ? u.red : u.textMut, fontSize:11, fontWeight:800 } }, charCount + ' / 280')
        ),
        h(PostMediaAttachments, { media:postDraft.media || [], onChange:function(v){ setDraft('media', v); } }),
        h('div', { style:{ marginTop:14 } },
          h(FieldLabel, null, 'Platforms'),
          h('div', { style:{ display:'flex', flexWrap:'wrap', gap:8, marginTop:4 } },
            PLATFORM_MAP.filter(function(p){ return p.key !== 'google_drive'; }).map(function(p){
              var connected = isConnected(p.key);
              var selected = (postDraft.platforms || []).indexOf(p.key) !== -1;
              var IconFn = p.icon;
              return h('button', {
                key:p.key,
                type:'button',
                disabled:!connected,
                onClick:function(){ togglePlatform(p.key); },
                title:connected ? p.label : p.label + ' (not connected)',
                style:{
                  display:'inline-flex', alignItems:'center', gap:6, height:34, padding:'0 10px', borderRadius:999,
                  border:'1px solid ' + (selected ? p.color : u.border),
                  background:selected ? p.color + '22' : u.raised,
                  color:selected ? p.color : u.textSec,
                  opacity:connected ? 1 : .45,
                  cursor:connected ? 'pointer' : 'not-allowed',
                  fontSize:12, fontWeight:800
                }
              }, h(IconFn), p.label, connected ? null : h('span', { style:{ fontSize:10, color:u.textMut } }, '· off'));
            })
          )
        ),
        h('div', { style:{ marginTop:12 } }, h(FieldLabel, null, 'Schedule for (optional)'), h(TextInput, { type:'datetime-local', value:postDraft.scheduled_at || '', onChange:function(v){ setDraft('scheduled_at', v); } })),
        h('div', { style:{ display:'flex', gap:8, marginTop:14, flexWrap:'wrap' } },
          h(Button, { variant:'secondary', size:'sm', disabled:posting, onClick:generatePost, iconName:'send' }, 'Generate with AI'),
          h(Button, { size:'sm', disabled:posting || !canSubmit, onClick:function(){ submitPost(!!postDraft.scheduled_at); }, iconName:'send' }, postDraft.scheduled_at ? 'Schedule' : 'Post Now')
        ),
        (data.scheduled_posts || []).length ? h('div', { style:{ marginTop:16 } },
          h(FieldLabel, null, 'Queued & scheduled'),
          (data.scheduled_posts || []).map(function(post){
            var attachments = parsePostMedia(post);
            return h('div', { key:post.id, style:{ padding:'10px 0', borderTop:'1px solid ' + u.border } },
              h('div', { style:{ display:'flex', gap:8, alignItems:'flex-start' } },
                attachments.length && attachments[0].type === 'image' ? h('img', { src:attachments[0].url, alt:'', style:{ width:44, height:44, borderRadius:8, objectFit:'cover', flexShrink:0 } }) :
                attachments.length ? h('div', { style:{ width:44, height:44, borderRadius:8, background:u.raised, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 } }, appIcon(attachments[0].type === 'video' ? 'video' : 'file', 16)) : null,
                h('div', { style:{ flex:1, minWidth:0 } },
                  h('div', { style:{ color:u.text, fontSize:12, fontWeight:800 } }, labelize(post.platform || 'post')),
                  h('div', { style:{ color:u.textMut, fontSize:11, marginTop:2 } }, [labelize(post.status || 'scheduled'), fmtDateTime(post.scheduled_at || post.created_at)].join(' · ')),
                  post.content_text ? h('div', { style:{ color:u.textSec, fontSize:11, marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, post.content_text) : null,
                  attachments.length > 1 ? h('div', { style:{ color:u.textMut, fontSize:10, marginTop:2 } }, attachments.length + ' attachments') : null
                ),
                h(Button, { variant:'secondary', size:'sm', onClick:function(){ cancelPost(post); } }, 'Cancel')
              )
            );
          })
        ) : null
      ), { marginBottom:0 })
    );
  }

  function EditDrawer(props) {
    var data = props.data, isMobile = props.isMobile, onClose = props.onClose, reload = props.reload;
    var a = data.animal;
    var u = ui();
    var parsedAge = parseAgeFields(a.age_label);
    var parsedWeight = parseWeightField(a.weight_label);
    var formState = useState({
      name:a.name || '', species:a.species || 'Dog', breed:a.breed || '', sex:a.sex || 'Unknown', energy_level:a.energy_level || 'Unknown', status:a.status || 'available', intake_date:a.intake_date || '', good_with_dogs:a.good_with_dogs || 'Unknown', good_with_cats:a.good_with_cats || 'Unknown', good_with_kids:a.good_with_kids || 'Unknown', medical_notes:a.medical_notes || '', foster_needed:Number(a.foster_needed) === 1, featured:Number(a.featured) === 1, public_visible:Number(a.public_visible) === 1,
      photo_url:a.photo_url || a.photo || '',
      age_value:parsedAge.value, age_unit:parsedAge.unit, age_hint:parsedAge.hint,
      weight_value:parsedWeight.value, weight_unit:parsedWeight.unit, weight_hint:parsedWeight.hint
    });
    var form = formState[0], setForm = formState[1];
    var savingState = useState(false), saving = savingState[0], setSaving = savingState[1];
    var fieldErrorsState = useState({}), fieldErrors = fieldErrorsState[0], setFieldErrors = fieldErrorsState[1];
    function set(k, v) { var n = Object.assign({}, form); n[k] = v; setForm(n); }
    function save() {
      var ageLabel = formatAgeLabel(form.age_value, form.age_unit);
      var weightLabel = formatWeightLabel(form.weight_value, form.weight_unit);
      var errors = {};
      if (String(form.age_value || '').trim() && !ageLabel) errors.age = 'Enter a valid age number.';
      if (String(form.weight_value || '').trim() && !weightLabel) errors.weight = 'Enter a valid weight number.';
      if (Object.keys(errors).length) { setFieldErrors(errors); return; }
      setFieldErrors({});
      var payload = {
        name:form.name, species:form.species, breed:form.breed, sex:form.sex, energy_level:form.energy_level,
        status:form.status, intake_date:form.intake_date || null, good_with_dogs:form.good_with_dogs,
        good_with_cats:form.good_with_cats, good_with_kids:form.good_with_kids, medical_notes:form.medical_notes,
        foster_needed:form.foster_needed ? 1 : 0, featured:form.featured ? 1 : 0, public_visible:form.public_visible ? 1 : 0,
        photo_url:form.photo_url, age_label:ageLabel || null, weight_label:weightLabel || null
      };
      setSaving(true);
      apiJSON('/api/dashboard/animals/' + encodeURIComponent(a.id), { method:'PATCH', body:JSON.stringify(payload) }).then(function(){ onClose(); reload(); }).finally(function(){ setSaving(false); });
    }
    var panel = h('div', { style:{ width:isMobile ? '100%' : 420, height:isMobile ? '100%' : '100vh', maxHeight:'100vh', overflowY:'auto', background:u.bg, borderLeft:isMobile ? 'none' : '1px solid ' + u.border, padding:isMobile ? 18 : 24, boxSizing:'border-box' } },
      h('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 } }, h('h2', { style:{ margin:0, color:u.text, fontSize:20 } }, 'Edit Profile'), h(Button, { variant:'secondary', size:'sm', onClick:onClose }, 'Close')),
      h('div', { style:{ display:'grid', gridTemplateColumns:'1fr', gap:12 } },
        h('div', null, h(ProfilePhotoField, { value:form.photo_url || '', onChange:function(v){ set('photo_url', v); }, animalName:form.name, isMobile:isMobile })),
        h('div', null, h(FieldLabel, null, 'Name'), h(TextInput, { value:form.name, onChange:function(v){ set('name', v); } })),
        h('div', null, h(FieldLabel, null, 'Species'), h(SelectInput, { value:form.species, onChange:function(v){ set('species', v); }, options:['Dog','Cat','Other'] })),
        h('div', null, h(FieldLabel, null, 'Breed'), h(TextInput, { value:form.breed, onChange:function(v){ set('breed', v); } })),
        h(AgeFieldGroup, { value:form.age_value, unit:form.age_unit, hint:form.age_hint, error:fieldErrors.age, onValueChange:function(v){ set('age_value', v); }, onUnitChange:function(v){ set('age_unit', v); } }),
        h('div', null, h(FieldLabel, null, 'Sex'), h(SelectInput, { value:form.sex, onChange:function(v){ set('sex', v); }, options:['Male','Female','Unknown'] })),
        h(WeightFieldGroup, { value:form.weight_value, unit:form.weight_unit, hint:form.weight_hint, error:fieldErrors.weight, onValueChange:function(v){ set('weight_value', v); }, onUnitChange:function(v){ set('weight_unit', v); } }),
        h('div', null, h(FieldLabel, null, 'Energy Level'), h(SelectInput, { value:form.energy_level, onChange:function(v){ set('energy_level', v); }, options:['Low','Medium','High','Unknown'] })),
        h('div', null, h(FieldLabel, null, 'Status'), h(SelectInput, { value:form.status, onChange:function(v){ set('status', v); }, options:[{value:'available', label:'Available'}, {value:'foster', label:'Foster'}, {value:'medical', label:'Medical'}, {value:'adopted', label:'Adopted'}] })),
        h('div', null, h(FieldLabel, null, 'Intake Date'), h(TextInput, { type:'date', value:form.intake_date || '', onChange:function(v){ set('intake_date', v); } })),
        h('div', null, h(FieldLabel, null, 'Good w/ Dogs'), h(SelectInput, { value:form.good_with_dogs, onChange:function(v){ set('good_with_dogs', v); }, options:['Yes','No','Unknown'] })),
        h('div', null, h(FieldLabel, null, 'Good w/ Cats'), h(SelectInput, { value:form.good_with_cats, onChange:function(v){ set('good_with_cats', v); }, options:['Yes','No','Unknown'] })),
        h('div', null, h(FieldLabel, null, 'Good w/ Kids'), h(SelectInput, { value:form.good_with_kids, onChange:function(v){ set('good_with_kids', v); }, options:['Yes','No','Unknown'] })),
        h('div', null, h(FieldLabel, null, 'Medical Notes'), h(TextArea, { value:form.medical_notes, onChange:function(v){ set('medical_notes', v); }, minHeight:90 })),
        h(ToggleRow, { label:'Foster Needed', checked:form.foster_needed, onClick:function(){ set('foster_needed', !form.foster_needed); } }),
        h(ToggleRow, { label:'Featured', checked:form.featured, onClick:function(){ set('featured', !form.featured); } }),
        h(ToggleRow, { label:'Public', checked:form.public_visible, onClick:function(){ set('public_visible', !form.public_visible); } })
      ),
      h('div', { style:{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:20 } }, h(Button, { variant:'secondary', onClick:onClose }, 'Cancel'), h(Button, { disabled:saving, onClick:save }, saving ? 'Saving...' : 'Save Changes'))
    );
    return h('div', { style:{ position:'fixed', inset:0, zIndex:230, background:'rgba(0,0,0,.46)', display:'flex', justifyContent:isMobile ? 'stretch' : 'flex-end' } }, panel);
  }

  function AnimalProfileView(props) {
    var animalId = props.animalId;
    var onNavigate = props.onNavigate;
    var dataState = useState(null), data = dataState[0], setData = dataState[1];
    var careState = useState(null), careTasks = careState[0], setCareTasks = careState[1];
    var appsState = useState(null), applications = appsState[0], setApplications = appsState[1];
    var loadingState = useState(true), loading = loadingState[0], setLoading = loadingState[1];
    var tabState = useState('overview'), tab = tabState[0], setTab = tabState[1];
    var savingState = useState(false), saving = savingState[0], setSaving = savingState[1];
    var msgState = useState(''), saveMsg = msgState[0], setSaveMsg = msgState[1];
    var editState = useState(false), showEdit = editState[0], setShowEdit = editState[1];
    var addTaskState = useState(false), showAddTask = addTaskState[0], setShowAddTask = addTaskState[1];
    var newTaskState = useState({ task_type:'feed', title:'', priority:'normal', due_at:'' }), newTask = newTaskState[0], setNewTask = newTaskState[1];
    var draftState = useState({ content_text:'', platforms:[], scheduled_at:'', media:[] }), postDraft = draftState[0], setPostDraft = draftState[1];
    var postingState = useState(false), posting = postingState[0], setPosting = postingState[1];
    var bp = useBreakpoint();
    var isMobile = bp === 'mobile';
    var isDesktop = bp === 'desktop';
    var u = ui();

    var loadProfile = useCallback(function() {
      setLoading(true); setData(null); setCareTasks(null); setApplications(null);
      apiJSON('/api/dashboard/animals/' + encodeURIComponent(animalId)).then(function(d){ setData(d); setLoading(false); }).catch(function(){ setLoading(false); });
    }, [animalId]);
    useEffect(function(){ loadProfile(); }, [loadProfile]);
    useEffect(function(){
      if (window.__editPhotoOfId === animalId) {
        window.__editPhotoOfId = null;
        setShowEdit(true);
      }
    }, [animalId]);
    useEffect(function(){
      if (tab === 'care' && careTasks === null && animalId) apiJSON('/api/dashboard/animals/' + encodeURIComponent(animalId) + '/care-tasks').then(function(d){ setCareTasks(d.care_tasks || []); }).catch(function(){ setCareTasks([]); });
      if (tab === 'apps' && applications === null && animalId) apiJSON('/api/dashboard/animals/' + encodeURIComponent(animalId) + '/applications').then(function(d){ setApplications(d.applications || []); }).catch(function(){ setApplications([]); });
    }, [tab, animalId, careTasks, applications]);

    function saveBio(val) {
      setSaving(true);
      apiJSON('/api/dashboard/animals/' + encodeURIComponent(animalId), { method:'PATCH', body:JSON.stringify({ bio:val }) }).catch(function(){}).then(function(){
        setData(function(d){ return Object.assign({}, d, { animal:Object.assign({}, d.animal, { bio:val }) }); });
        setSaving(false); setSaveMsg('Saved'); setTimeout(function(){ setSaveMsg(''); }, 2500);
      });
    }

    if (loading || !data || !data.animal) return h('div', { style:{ padding:isMobile ? 18 : 28, flex:1, overflowY:'auto' } }, h(LoadingBlock, null, 'Loading animal profile...'));
    var a = data.animal;
    var tabs = [
      { value:'overview', label:'Overview' },
      { value:'care', label:'Care & Medical', count:careTasks === null ? (a.medical_notes ? '!' : null) : careTasks.length },
      { value:'apps', label:'Applications', count:data.application_count || null },
      { value:'notes', label:'Notes', count:data.note_count || null }
    ];
    if (!isDesktop) tabs.push({ value:'publish', label:'Publish' });
    function tabContent() {
      if (tab === 'overview') return h(OverviewTab, { data:data, isMobile:isMobile, saveBio:saveBio, saving:saving, saveMsg:saveMsg });
      if (tab === 'care') return h(CareTab, { data:data, animalId:animalId, isMobile:isMobile, careTasks:careTasks, setCareTasks:setCareTasks, showAddTask:showAddTask, setShowAddTask:setShowAddTask, newTask:newTask, setNewTask:setNewTask });
      if (tab === 'apps') return h(ApplicationsTab, { applications:applications });
      if (tab === 'notes') return h(AnimalNotesTab, { animalId:animalId, isMobile:isMobile });
      if (tab === 'publish') return h(PublishPanel, { data:data, reload:loadProfile, isCompact:true, postDraft:postDraft, setPostDraft:setPostDraft, posting:posting, setPosting:setPosting });
      return null;
    }
    return h('div', { style:{ padding:isMobile ? '18px 12px 40px' : '28px 28px 40px', flex:1, overflowY:'auto', boxSizing:'border-box' } },
      h('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:18, flexWrap:'wrap' } },
        h('button', { onClick:function(){ if (onNavigate) onNavigate('animals'); }, style:{ border:'none', background:'transparent', color:u.textSec, fontSize:13, fontWeight:800, cursor:'pointer' } }, '< Back to Animals'),
        h('div', { style:{ display:'flex', gap:8 } }, h(Button, { variant:'secondary', size:'sm', iconName:'edit', onClick:function(){ setShowEdit(true); } }, 'Edit'), h(Button, { size:'sm', iconName:'plus', onClick:function(){ setTab('care'); setShowAddTask(true); } }, 'Add Record'))
      ),
      h('div', { style:{ display:isDesktop ? 'flex' : 'block', gap:20, alignItems:'flex-start' } },
        h('div', { style:{ flex:1, minWidth:0 } },
          h(ProfileHero, { animal:a, foster:data.foster, isMobile:isMobile, onEditPhoto:function(){ setShowEdit(true); } }),
          h('div', { style:{ overflowX:'auto', whiteSpace:'nowrap', borderBottom:'1px solid ' + u.border, marginBottom:18 } }, h('div', { style:{ display:'inline-flex', gap:4, minWidth:'100%' } }, tabs.map(function(t){ var active = tab === t.value; return h('button', { key:t.value, onClick:function(){ setTab(t.value); }, style:{ border:'none', background:'transparent', color:active ? u.purpleL : u.textSec, padding:'12px 14px', borderBottom:'2px solid ' + (active ? u.purple : 'transparent'), fontWeight:active ? 900 : 700, fontSize:13, cursor:'pointer' } }, t.label, t.count ? h('span', { style:{ marginLeft:7, fontSize:11, color:active ? u.purpleL : u.textMut } }, t.count) : null); }))),
          tabContent()
        ),
        isDesktop ? h('div', { style:{ width:340, flexShrink:0, position:'sticky', top:20 } }, h(PublishPanel, { data:data, reload:loadProfile, isCompact:false, postDraft:postDraft, setPostDraft:setPostDraft, posting:posting, setPosting:setPosting })) : null
      ),
      showEdit ? h(EditDrawer, { data:data, isMobile:isMobile, onClose:function(){ setShowEdit(false); }, reload:loadProfile }) : null
    );
  }

  // ── FosterCard — clean profile card for each foster record ────────────────
  function FosterCard(props) {
    var item = props.item;
    var onViewAnimal = props.onViewAnimal;
    var u = ui();
    var isActive = item.status === 'active';
    var accentColor = isActive ? u.purple : u.textMut;

    return h(SoftCard, { style:{ padding:0, overflow:'hidden' } },
      // Photo + animal header
      h('div', { style:{ display:'flex', alignItems:'stretch', gap:0 } },
        h('div', { style:{ width:88, height:88, flexShrink:0, background:u.raised, overflow:'hidden' } },
          item.asset_cdn_url ? h('img', { src:item.asset_cdn_url, alt:item.animal_name || 'Animal', style:{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center' } }) :
          h('div', { style:{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:u.textMut, fontSize:11 } }, 'No photo')
        ),
        h('div', { style:{ flex:1, padding:'14px 16px', minWidth:0 } },
          h('div', { style:{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:4 } },
            h('div', null,
              h('div', { style:{ color:u.text, fontWeight:900, fontSize:15, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, item.animal_name || 'Animal'),
              h('div', { style:{ color:u.textSec, fontSize:12, marginTop:1 } }, [item.species, item.breed].filter(Boolean).join(' - ') || '-')
            ),
            h(StatusPill, { label:isActive ? 'Active' : labelize(item.status || 'inactive'), color:accentColor })
          ),
          h('div', { style:{ display:'flex', alignItems:'center', gap:8, marginTop:6 } },
            h('div', { style:{ width:28, height:28, borderRadius:'50%', background:u.purpleDim, border:'1px solid ' + u.purple + '44', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:u.purpleL, flexShrink:0 } },
              (item.foster_name || '?').split(' ').map(function(w){ return w[0]; }).join('').slice(0, 2).toUpperCase()
            ),
            h('div', { style:{ color:u.text, fontSize:13, fontWeight:700 } }, item.foster_name || 'Unknown foster')
          )
        )
      ),
      // Details row
      h('div', { style:{ borderTop:'1px solid ' + u.border, padding:'12px 16px', display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:'8px 16px' } },
        h('div', null,
          h('div', { style:{ color:u.textSec, fontSize:10, textTransform:'uppercase', letterSpacing:'.05em', fontWeight:800, marginBottom:2 } }, 'Foster type'),
          h('div', { style:{ color:u.textSec, fontSize:12 } }, labelize(item.foster_type || 'standard'))
        ),
        h('div', null,
          h('div', { style:{ color:u.textSec, fontSize:10, textTransform:'uppercase', letterSpacing:'.05em', fontWeight:800, marginBottom:2 } }, 'Check-ins'),
          h('div', { style:{ color:u.textSec, fontSize:12 } }, labelize(item.check_in_frequency || '-'))
        ),
        h('div', null,
          h('div', { style:{ color:u.textSec, fontSize:10, textTransform:'uppercase', letterSpacing:'.05em', fontWeight:800, marginBottom:2 } }, 'Started'),
          h('div', { style:{ color:u.textSec, fontSize:12 } }, fmtDate(item.start_date) || '-')
        ),
        h('div', null,
          h('div', { style:{ color:u.textSec, fontSize:10, textTransform:'uppercase', letterSpacing:'.05em', fontWeight:800, marginBottom:2 } }, 'Expected return'),
          h('div', { style:{ color:item.expected_end_date ? u.yellow : u.textSec, fontSize:12 } }, fmtDate(item.expected_end_date) || 'Open-ended')
        )
      ),
      // Contact + notes footer
      (item.foster_email || item.foster_phone || item.notes) ? h('div', { style:{ borderTop:'1px solid ' + u.border, padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' } },
        h('div', { style:{ display:'flex', gap:12, flexWrap:'wrap' } },
          item.foster_phone ? h('span', { style:{ color:u.textSec, fontSize:12, display:'inline-flex', alignItems:'center', gap:5 } }, appIcon('phone', 12, { color:u.textMut }), item.foster_phone) : null,
          item.foster_email ? h('span', { style:{ color:u.textSec, fontSize:12, display:'inline-flex', alignItems:'center', gap:5 } }, appIcon('mail', 12, { color:u.textMut }), item.foster_email) : null
        ),
        item.animal_id ? h('button', { onClick:function(){ if (onViewAnimal) onViewAnimal(item.animal_id); }, style:{ background:'none', border:'none', color:u.purpleL, fontSize:12, fontWeight:700, cursor:'pointer', padding:0 } }, 'View animal →') : null
      ) : null,
      item.notes ? h('div', { style:{ borderTop:'1px solid ' + u.border, padding:'8px 16px', color:u.textMut, fontSize:12, fontStyle:'italic' } }, item.notes) : null
    );
  }

  // ── FostersView — live API-powered foster profile cards ───────────────────
  function FostersView(props) {
    var onNavigate = props.onNavigate;
    var itemsState = useState(null), items = itemsState[0], setItems = itemsState[1];
    var filterState = useState('all'), filter = filterState[0], setFilter = filterState[1];
    var bp = useBreakpoint();
    var isMobile = bp === 'mobile';
    var u = ui();

    useEffect(function(){
      apiJSON('/api/dashboard/fosters')
        .then(function(d){ setItems(d.fosters || []); })
        .catch(function(){ setItems([]); });
    }, []);

    var filtered = (items || []).filter(function(f){
      if (filter === 'active') return f.status === 'active';
      if (filter === 'ended') return f.status !== 'active';
      return true;
    });

    var activeCount = (items || []).filter(function(f){ return f.status === 'active'; }).length;

    return h('div', { className: 'dash-page' },
      h(PageHeader, {
        title: 'Fosters',
        subtitle: items === null ? 'Loading...' : activeCount + ' active placements'
      }),
      // Summary stats
      items !== null && h('div', { style:{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 } },
        h(SoftCard, { style:{ padding:'16px 20px' } },
          h('div', { style:{ color:u.textMut, fontSize:11, textTransform:'uppercase', letterSpacing:'.06em', fontWeight:800, marginBottom:4 } }, 'Active'),
          h('div', { style:{ color:u.text, fontSize:26, fontWeight:900 } }, activeCount)
        ),
        h(SoftCard, { style:{ padding:'16px 20px' } },
          h('div', { style:{ color:u.textMut, fontSize:11, textTransform:'uppercase', letterSpacing:'.06em', fontWeight:800, marginBottom:4 } }, 'Total'),
          h('div', { style:{ color:u.text, fontSize:26, fontWeight:900 } }, (items || []).length)
        ),
        h(SoftCard, { style:{ padding:'16px 20px' } },
          h('div', { style:{ color:u.textMut, fontSize:11, textTransform:'uppercase', letterSpacing:'.06em', fontWeight:800, marginBottom:4 } }, 'Ended'),
          h('div', { style:{ color:u.text, fontSize:26, fontWeight:900 } }, (items || []).length - activeCount)
        )
      ),
      // Filter tabs
      h('div', { style:{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid ' + u.border } },
        [['all','All'],['active','Active'],['ended','Ended']].map(function(pair){
          var active = filter === pair[0];
          return h('button', { key:pair[0], onClick:function(){ setFilter(pair[0]); }, style:{ border:'none', background:'transparent', color:active ? u.purpleL : u.textSec, padding:'10px 14px', borderBottom:'2px solid ' + (active ? u.purple : 'transparent'), fontWeight:active ? 900 : 700, fontSize:13, cursor:'pointer', marginBottom:-1 } }, pair[1]);
        })
      ),
      items === null ? h(LoadingBlock, null, 'Loading foster records...') :
      !filtered.length ? h(EmptyPanel, { iconName:'heart', message:filter === 'active' ? 'No active foster placements.' : 'No foster records yet.' }) :
      h('div', { style:{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : 'repeat(2,minmax(0,1fr))', gap:16 } },
        filtered.map(function(item, idx){
          return h(FosterCard, { key:item.id || idx, item:item, onViewAnimal:function(animalId){ if (onNavigate) onNavigate('animal-profile', { animalId:animalId }); } });
        })
      )
    );
  }

  // ── AdoptionsView — clean table (unchanged logic, kept minimal) ────────────
  function AdoptionsView(props) {
    var itemsState = useState(null), items = itemsState[0], setItems = itemsState[1];
    var bp = useBreakpoint();
    var isMobile = bp === 'mobile';
    var u = ui();
    useEffect(function(){ apiJSON('/api/dashboard/adoptions').then(function(d){ setItems(d.adoptions || []); }).catch(function(){ setItems([]); }); }, []);
    return h('div', { className: 'dash-page' },
      h(PageHeader, { title: 'Adoptions', subtitle: 'Approved adoption placements' }),
      items === null ? h(LoadingBlock, null, 'Loading...') :
      !items.length ? h(EmptyPanel, { iconName:'check', message:'No adoption records yet.' }) :
      h('div', { style:{ display:'flex', flexDirection:'column', gap:12 } }, items.map(function(item, idx){
        var name = [item.first_name, item.last_name].filter(Boolean).join(' ') || item.applicant_name || 'Applicant';
        return h(SoftCard, { key:item.id || idx, style:{ padding:16 } },
          h('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' } },
            h('div', null,
              h('div', { style:{ color:u.text, fontWeight:900, fontSize:15 } }, name),
              h('div', { style:{ color:u.textSec, fontSize:12, marginTop:2 } }, [item.email || item.applicant_email, item.phone].filter(Boolean).join(' - ') || '-')
            ),
            h('div', { style:{ display:'flex', gap:8, alignItems:'center' } },
              h(StatusPill, { label:labelize(item.review_status || item.status || 'approved'), color:u.green }),
              h('div', { style:{ color:u.textMut, fontSize:11 } }, fmtDate(item.submitted_at || item.created_at))
            )
          )
        );
      }))
    );
  }

  Object.assign(window, { AnimalsView:AnimalsView, AnimalProfileView:AnimalProfileView, FostersView:FostersView, AdoptionsView:AdoptionsView });
})();
