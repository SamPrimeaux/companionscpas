// ─── Email Workspace v2 — glass mail app (live APIs, no mock data) ───────────

function emailApi(url, options) {
  return fetch(url, Object.assign({
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  }, options || {})).then(function(res) {
    return res.json().then(function(data) {
      if (!res.ok) throw new Error(data.error || ("Request failed (" + res.status + ")"));
      return data;
    });
  });
}

function fmtWhen(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch { return ""; }
}

function parseFrom(email) {
  const raw = String(email || "");
  const m = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (m) return { name: m[1].replace(/"/g, "").trim(), addr: m[2] };
  return { name: raw.split("@")[0], addr: raw };
}

function shortAddr(email) {
  return parseFrom(email).addr || String(email || "");
}

const MAILBOX_NAV = [
  { key: "inbox", label: "Inbox", icon: "mail" },
  { key: "important", label: "Starred", icon: "star" },
  { key: "sent", label: "Sent", icon: "arrowR" },
  { key: "drafts", label: "Drafts", icon: "docs" },
  { key: "deleted", label: "Deleted", icon: "trash" },
];

const SMART_NAV = [
  { key: "notifications", label: "Notifications", icon: "bell", isNotifications: true },
  { key: "needs", label: "Needs reply", icon: "mail", filter: "unread" },
  { key: "onboarding", label: "Onboarding", icon: "layers", folderSlug: "onboarding" },
  { key: "system", label: "System notices", icon: "gear", smart: "system" },
];

const NOTIF_TYPE_LABELS = {
  donation: "Donation",
  contact: "Contact form",
  foster: "Foster app",
  system: "System",
};

function notifTypeLabel(type) {
  return NOTIF_TYPE_LABELS[type] || String(type || "alert").replace(/_/g, " ");
}

function notificationLabels(n) {
  const labels = [];
  if (n.status === "unread") labels.push({ text: "unread", cls: "action" });
  labels.push({ text: notifTypeLabel(n.type), cls: "primary" });
  if (n.source) labels.push({ text: n.source.replace(/_/g, " "), cls: "client" });
  return labels;
}

const SENT_TYPE_LABELS = {
  donation_receipt: "Donation receipt",
  dashboard_send: "Manual send",
  manual: "Manual",
  foster_application: "Foster app",
  contact_form: "Contact form",
  password_reset: "Password reset",
  member_invite: "Member invite",
};

function sentTypeLabel(type) {
  return SENT_TYPE_LABELS[type] || String(type || "system").replace(/_/g, " ");
}

const AVATAR_COLORS = ["av-purple", "av-teal", "av-blue", "av-orange", "av-dark", "av-light"];

function avatarFor(email) {
  const p = parseFrom(email);
  const initials = (p.name || p.addr || "?").replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "??";
  let h = 0;
  const s = p.addr || p.name;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return { initials, color: AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length] };
}

function plainToHtml(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
  return raw.split(/\n\n+/).map(function(p) {
    return "<p>" + p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>") + "</p>";
  }).join("");
}

function messageLabels(m, view) {
  const labels = [];
  if (m.status === "unread") labels.push({ text: "unread", cls: "action" });
  if (m.is_important) labels.push({ text: "starred", cls: "primary" });
  if (m.source === "gmail") labels.push({ text: "gmail", cls: "client" });
  if (m.source === "resend") labels.push({ text: "resend", cls: "promo" });
  if (view === "sent" && m.email_type) labels.push({ text: sentTypeLabel(m.email_type), cls: "primary" });
  if (m.mailbox && m.mailbox.includes("support")) labels.push({ text: "support", cls: "client" });
  return labels;
}

function EmailView() {
  const [view, setView] = React.useState("inbox");
  const [folderId, setFolderId] = React.useState(null);
  const [activeMailbox, setActiveMailbox] = React.useState("all");
  const [smartKey, setSmartKey] = React.useState(null);
  const [folders, setFolders] = React.useState([]);
  const [config, setConfig] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [sent, setSent] = React.useState([]);
  const [drafts, setDrafts] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [detail, setDetail] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [toast, setToast] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [readFilter, setReadFilter] = React.useState("all");
  const [listFilter, setListFilter] = React.useState("all");
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [notifications, setNotifications] = React.useState([]);
  const [notifUnreadCount, setNotifUnreadCount] = React.useState(0);
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [addFolderOpen, setAddFolderOpen] = React.useState(false);
  const [railCollapsed, setRailCollapsed] = React.useState(false);
  const [mobilePanel, setMobilePanel] = React.useState("list");
  const [newFolderName, setNewFolderName] = React.useState("");
  const [compose, setCompose] = React.useState({ to: "", subject: "", html: "", from: "" });

  function notify(msg, isErr) {
    setToast((isErr ? "err:" : "ok:") + msg);
    setTimeout(function() { setToast(""); }, 4200);
  }

  function loadNotifications() {
    return emailApi("/api/email/notifications?status=active&limit=100").then(function(d) {
      setNotifications(d.notifications || []);
      setNotifUnreadCount(Number(d.unread_count || 0));
    });
  }

  function loadMessages() {
    if (view === "notifications") {
      return loadNotifications();
    }
    if (view === "sent") {
      return emailApi("/api/email/outbound?limit=100").then(function(d) { setSent(d.messages || []); });
    }
    if (view === "drafts") {
      return emailApi("/api/email/drafts").then(function(d) { setDrafts(d.drafts || []); });
    }
    const params = new URLSearchParams({
      view: view === "folder" ? "folder" : view,
      read_filter: readFilter,
    });
    if (folderId && view === "folder") params.set("folder_id", folderId);
    if (search.trim()) params.set("q", search.trim());
    if (view === "inbox" && activeMailbox && activeMailbox !== "all") params.set("mailbox", activeMailbox);
    return emailApi("/api/email/inbox?" + params.toString()).then(function(d) {
      setMessages(d.messages || []);
      setUnreadCount(Number(d.unread_count || 0));
    });
  }

  function loadAll() {
    setLoading(true);
    Promise.all([
      emailApi("/api/email/config"),
      emailApi("/api/email/folders"),
      emailApi("/api/email/drafts"),
      emailApi("/api/email/notifications?status=active&limit=1"),
      loadMessages(),
    ]).then(function(results) {
      setConfig(results[0]);
      setFolders(results[1].folders || []);
      setDrafts(results[2].drafts || []);
      setNotifUnreadCount(Number(results[3]?.unread_count || 0));
      const supportFrom = results[0]?.from_addresses?.support;
      if (supportFrom) setCompose(function(c) { return Object.assign({}, c, { from: supportFrom }); });
      const params = new URLSearchParams(window.location.search);
      if (params.get("connected") === "gmail") notify("Gmail connected — syncing…");
      if (params.get("error")) notify("Gmail failed: " + params.get("error"), true);
    }).catch(function(e) { notify(e.message || "Failed to load email.", true); })
      .finally(function() { setLoading(false); });
  }

  React.useEffect(function() { loadAll(); }, []);
  React.useEffect(function() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "notifications") {
      selectSmart(SMART_NAV[0]);
      window.history.replaceState({}, "", "/dashboard/email");
    }
  }, []);
  React.useEffect(function() {
    if (!loading) loadMessages().catch(function() {});
  }, [view, folderId, readFilter, search, activeMailbox]);

  React.useEffect(function() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "gmail" && config?.gmail_accounts?.length) {
      emailApi("/api/email/sync-gmail", { method: "POST", body: "{}" })
        .then(function(d) { notify("Synced " + (d.synced || 0) + " Gmail message(s)."); loadMessages(); })
        .catch(function() {});
      window.history.replaceState({}, "", "/dashboard/email");
    }
  }, [config?.gmail_accounts?.length]);

  React.useEffect(function() {
    function onKey(e) {
      if (e.key === "Escape") { setComposeOpen(false); setSettingsOpen(false); }
    }
    document.addEventListener("keydown", onKey);
    return function() { document.removeEventListener("keydown", onKey); };
  }, []);

  function selectNav(key) {
    setView(key);
    setFolderId(null);
    setSmartKey(null);
    setSelected(null);
    setDetail(null);
    setListFilter("all");
    setMobilePanel("list");
  }

  function selectSmart(item) {
    setSmartKey(item.key);
    setSelected(null);
    setDetail(null);
    if (item.isNotifications) {
      setView("notifications");
      setFolderId(null);
      setReadFilter("all");
      setListFilter("all");
      setMobilePanel("list");
      loadNotifications().catch(function() {});
      return;
    }
    if (item.folderSlug) {
      const fld = folders.find(function(f) { return f.slug === item.folderSlug; });
      if (fld) { setView("folder"); setFolderId(fld.id); }
    } else if (item.filter === "unread") {
      setView("inbox");
      setFolderId(null);
      setReadFilter("unread");
    } else {
      setView("inbox");
      setFolderId(null);
      setReadFilter("all");
    }
    setMobilePanel("list");
  }

  function selectFolder(fld) {
    setView("folder");
    setFolderId(fld.id);
    setSmartKey(null);
    setSelected(null);
    setDetail(null);
    setMobilePanel("list");
  }

  function openCompose(preset) {
    setCompose(Object.assign({
      to: "", subject: "", html: "",
      from: config?.from_addresses?.support || compose.from,
    }, preset || {}));
    setComposeOpen(true);
  }

  function openNotification(notif) {
    setSelected(notif.id);
    setDetail({
      id: notif.id,
      is_notification: true,
      subject: notif.title,
      from_email: notifTypeLabel(notif.type) + (notif.source ? " · " + notif.source.replace(/_/g, " ") : ""),
      received_at: notif.created_at,
      body_html: "<p>" + String(notif.body || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>") + "</p>",
      body_text: notif.body || "",
      notification: notif,
      reply_to_email: notif.reply_to_email,
      reply_subject: notif.reply_subject,
      action_url: notif.action_url,
      action_label: notif.action_label,
      status: notif.status,
      type: notif.type,
    });
    setMobilePanel("reader");
    if (notif.status === "unread") {
      emailApi("/api/email/notifications/" + encodeURIComponent(notif.id), {
        method: "PATCH", body: JSON.stringify({ status: "read" }),
      }).then(function() {
        setNotifications(function(list) {
          return list.map(function(n) {
            return n.id === notif.id ? Object.assign({}, n, { status: "read" }) : n;
          });
        });
        setNotifUnreadCount(function(c) { return Math.max(0, c - 1); });
        setDetail(function(d) {
          return d && d.id === notif.id ? Object.assign({}, d, { status: "read" }) : d;
        });
      }).catch(function() {});
    }
  }

  function dismissNotification(notifId) {
    return emailApi("/api/email/notifications/" + encodeURIComponent(notifId), {
      method: "PATCH", body: JSON.stringify({ status: "dismissed" }),
    }).then(function() {
      setNotifications(function(list) { return list.filter(function(n) { return n.id !== notifId; }); });
      if (selected === notifId) { setSelected(null); setDetail(null); }
      return loadNotifications();
    });
  }

  function deleteNotification(notifId) {
    return emailApi("/api/email/notifications/" + encodeURIComponent(notifId), {
      method: "DELETE",
    }).then(function() {
      setNotifications(function(list) { return list.filter(function(n) { return n.id !== notifId; }); });
      if (selected === notifId) { setSelected(null); setDetail(null); }
      notify("Notification deleted.");
    });
  }

  function replyToNotification(notif) {
    if (!notif?.reply_to_email) return;
    openCompose({
      to: notif.reply_to_email,
      subject: notif.reply_subject || ("Re: " + (notif.title || "Companions of CPAS")),
      html: "",
      from: config?.from_addresses?.support || compose.from,
    });
  }

  function followNotificationAction(notif) {
    const url = notif?.action_url;
    if (!url) return;
    if (url.startsWith("/dashboard/")) {
      const path = url.replace(/^\/dashboard\/?/, "").split("/")[0] || "overview";
      if (typeof window.__navigate === "function") window.__navigate(path);
      else window.location.href = url;
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openMessage(msg) {
    if (view === "notifications") {
      openNotification(msg.notification || msg);
      return;
    }
    if (view === "drafts") {
      const to = (function() { try { return JSON.parse(msg.to_json || "[]")[0] || ""; } catch { return ""; } })();
      openCompose({ to, subject: msg.subject || "", html: msg.body_html || "", from: msg.draft_from || compose.from });
      return;
    }
    if (view === "sent") {
      setSelected(msg.id);
      const fromAddr = msg.from_email || config?.from_addresses?.noreply;
      setDetail({
        id: msg.id,
        subject: msg.subject || "(no subject)",
        from_email: fromAddr,
        received_at: msg.sent_at || msg.created_at,
        body_html: "<p><strong>From:</strong> " + shortAddr(fromAddr) + "</p><p><strong>To:</strong> " + (msg.recipient_email || "") + "</p><p><strong>Type:</strong> " + sentTypeLabel(msg.email_type) + "</p><p><strong>Status:</strong> " + (msg.status || "sent") + "</p>",
        source: "resend",
        email_type: msg.email_type,
      });
      setMobilePanel("reader");
      return;
    }
    setSelected(msg.id);
    emailApi("/api/email/inbox/" + encodeURIComponent(msg.id)).then(function(d) {
      setDetail(d.message);
      setMobilePanel("reader");
      if (d.message?.status === "unread") {
        emailApi("/api/email/inbox/" + encodeURIComponent(msg.id), {
          method: "PATCH", body: JSON.stringify({ status: "read" }),
        }).then(loadMessages).catch(function() {});
      }
    }).catch(function(e) { notify(e.message, true); });
  }

  function patchMessage(patch) {
    if (!selected) return;
    return emailApi("/api/email/inbox/" + encodeURIComponent(selected), {
      method: "PATCH", body: JSON.stringify(patch),
    }).then(function() {
      loadMessages();
      if (detail) setDetail(Object.assign({}, detail, patch));
    });
  }

  function toggleStar(msg, e) {
    if (e) e.stopPropagation();
    if (view === "sent" || view === "drafts") return;
    emailApi("/api/email/inbox/" + encodeURIComponent(msg.id), {
      method: "PATCH",
      body: JSON.stringify({ is_important: msg.is_important ? 0 : 1 }),
    }).then(loadMessages).catch(function(err) { notify(err.message, true); });
  }

  function sendCompose() {
    const to = String(compose.to || "").trim();
    const subject = String(compose.subject || "").trim() || "(no subject)";
    const html = plainToHtml(compose.html);
    if (!to) { notify("Add a recipient in the To field.", true); return; }
    if (!String(compose.html || "").trim()) { notify("Write a message before sending.", true); return; }
    setBusy(true);
    emailApi("/api/email/send", {
      method: "POST",
      body: JSON.stringify({ to: to, subject: subject, html: html, from: compose.from }),
    }).then(function() {
      notify("Email sent.");
      setComposeOpen(false);
      setListFilter("all");
      setView("sent");
      return loadMessages();
    }).catch(function(e) { notify(e.message, true); })
      .finally(function() { setBusy(false); });
  }

  function saveDraft() {
    emailApi("/api/email/drafts", { method: "POST", body: JSON.stringify(compose) })
      .then(function() { notify("Draft saved."); setComposeOpen(false); if (view === "drafts") loadMessages(); })
      .catch(function(e) { notify(e.message, true); });
  }

  function replyToDetail(all) {
    if (!detail) return;
    const from = parseFrom(detail.from_email);
    openCompose({
      to: from.addr || detail.from_email,
      subject: (detail.subject || "").startsWith("Re:") ? detail.subject : ("Re: " + (detail.subject || "")),
      html: "<p></p><hr/><p><em>On " + fmtWhen(detail.received_at) + ", " + (detail.from_email || "") + " wrote:</em></p>" + (detail.body_html || ("<pre>" + (detail.body_text || "") + "</pre>")),
      from: config?.from_addresses?.support || compose.from,
    });
  }

  function addFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    emailApi("/api/email/folders", { method: "POST", body: JSON.stringify({ name }) })
      .then(function() { setNewFolderName(""); setAddFolderOpen(false); return emailApi("/api/email/folders"); })
      .then(function(d) { setFolders(d.folders || []); notify("Folder created."); })
      .catch(function(e) { notify(e.message, true); });
  }

  function refreshList() {
    setBusy(true);
    const sync = view === "notifications"
      ? loadNotifications()
      : Promise.all([loadMessages(), config?.gmail_accounts?.length ? emailApi("/api/email/sync-gmail", { method: "POST", body: "{}" }) : Promise.resolve()]);
    Promise.resolve(sync)
      .then(function() { notify(view === "notifications" ? "Notifications refreshed." : "Inbox refreshed."); })
      .catch(function(e) { notify(e.message, true); })
      .finally(function() { setBusy(false); });
  }

  function connectGmail() { window.location.href = "/api/integrations/gmail/connect"; }

  function syncGmail(email) {
    setBusy(true);
    emailApi("/api/integrations/gmail/sync", { method: "POST", body: JSON.stringify(email ? { account_email: email } : {}) })
      .then(function(d) { notify("Synced " + (d.synced || 0) + " message(s)."); return loadMessages(); })
      .catch(function(e) { notify(e.message, true); })
      .finally(function() { setBusy(false); });
  }

  function disconnectGmail(acct) {
    emailApi("/api/integrations/gmail/disconnect", {
      method: "POST",
      body: JSON.stringify({ connection_id: acct.id, account_email: acct.email }),
    }).then(function() { notify("Gmail disconnected."); loadAll(); })
      .catch(function(e) { notify(e.message, true); });
  }

  const listTitle = view === "notifications"
    ? "Notifications"
    : view === "folder"
    ? (folders.find(function(f) { return f.id === folderId; })?.name || "Folder")
    : (MAILBOX_NAV.find(function(n) { return n.key === view; })?.label || "Inbox");

  const sharedMailboxes = config?.shared_mailboxes || config?.mailboxes || [];
  const gmailAccounts = config?.gmail_accounts || [];
  const onboardingFolder = folders.find(function(f) { return f.slug === "onboarding"; });
  const customFolders = folders.filter(function(f) { return !f.is_system && f.slug !== "onboarding"; });

  const fromOptions = [
    { value: config?.from_addresses?.support || "", label: "Support — support@companionsofcaddo.org" },
    { value: config?.from_addresses?.noreply || "", label: "System — no-reply@companionsofcaddo.org" },
  ].filter(function(o) { return o.value; });

  let listRows = view === "notifications" ? notifications.map(function(n) {
    return {
      id: n.id,
      from_email: notifTypeLabel(n.type),
      subject: n.title,
      preview_text: n.body || "",
      received_at: n.created_at,
      status: n.status === "unread" ? "unread" : "read",
      is_notification: true,
      notification: n,
    };
  }) : view === "sent" ? sent.map(function(m) {
    return Object.assign({}, m, {
      from_email: m.from_email || config?.from_addresses?.noreply,
      preview_text: "To: " + (m.recipient_email || "") + " · " + sentTypeLabel(m.email_type),
      received_at: m.sent_at || m.created_at,
      status: "read",
    });
  }) : view === "drafts" ? drafts.map(function(m) {
    return {
      id: m.id, from_email: "Draft", subject: m.subject,
      preview_text: (m.body_text || m.body_html || "").replace(/<[^>]*>/g, "").slice(0, 120),
      received_at: m.updated_at, status: "read", to_json: m.to_json, body_html: m.body_html,
      draft_from: m.from_email,
    };
  }) : messages;

  if (view === "notifications") {
    if (listFilter === "unread") listRows = listRows.filter(function(m) { return m.status === "unread"; });
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      listRows = listRows.filter(function(m) {
        return (m.subject || "").toLowerCase().includes(q)
          || (m.preview_text || "").toLowerCase().includes(q)
          || (m.from_email || "").toLowerCase().includes(q);
      });
    }
  }
  if (smartKey === "system" && view === "inbox") {
    listRows = listRows.filter(function(m) {
      return m.source === "resend" || /noreply|notify|workspace|mailer/i.test(String(m.from_email || ""));
    });
  }
  if (view === "inbox" || view === "folder") {
    if (listFilter === "unread") listRows = listRows.filter(function(m) { return m.status === "unread"; });
    if (listFilter === "starred") listRows = listRows.filter(function(m) { return m.is_important; });
    if (listFilter === "needs") listRows = listRows.filter(function(m) { return m.status === "unread"; });
  }
  if (search.trim() && (view === "sent" || view === "drafts")) {
    const q = search.trim().toLowerCase();
    listRows = listRows.filter(function(m) {
      return (m.subject || "").toLowerCase().includes(q)
        || (m.recipient_email || "").toLowerCase().includes(q)
        || (m.from_email || "").toLowerCase().includes(q)
        || (m.preview_text || "").toLowerCase().includes(q);
    });
  }
  if (view === "sent" && listFilter === "manual") {
    listRows = listRows.filter(function(m) { return m.email_type === "dashboard_send" || m.email_type === "manual"; });
  }
  if (view === "sent" && listFilter === "system") {
    listRows = listRows.filter(function(m) {
      return m.email_type && m.email_type !== "dashboard_send" && m.email_type !== "manual";
    });
  }

  const draftCount = drafts.length;
  const subhead = view === "notifications"
    ? (notifUnreadCount ? notifUnreadCount + " unread" : "All caught up") + " · donations, contact forms & alerts"
    : view === "inbox"
    ? (unreadCount ? unreadCount + " unread" : "All caught up") + " · support@ + Gmail"
    : view === "sent" ? "Outbound log incl. no-reply automations"
    : "Filtered mailbox view";

  return React.createElement("div", { className: "email-workspace" },
    toast && React.createElement("div", { className: "mail-toast" + (toast.indexOf("err:") === 0 ? " is-error" : "") },
      toast.replace(/^(err:|ok:)/, "")
    ),

    React.createElement("div", { className: "mail-stage" },
      React.createElement("div", { className: "mail-mobile-tabs" },
        ["rail", "list", "reader"].map(function(p) {
          return React.createElement("button", {
            key: p,
            type: "button",
            className: mobilePanel === p ? "is-active" : "",
            onClick: function() { setMobilePanel(p); },
          }, p === "rail" ? "Folders" : p === "list" ? "Inbox" : "Read");
        })
      ),

      React.createElement("div", {
        className: "mail-app" + (railCollapsed ? " rail-collapsed" : ""),
        "data-mobile": mobilePanel,
      },
        React.createElement("button", {
          type: "button",
          className: "mail-rail-toggle",
          onClick: function() { setRailCollapsed(!railCollapsed); },
          "aria-label": "Collapse folders",
        }, React.createElement(Icon, { name: "chevL", size: 16 })),

        /* ── Rail ── */
        React.createElement("aside", { className: "mail-rail" },
          React.createElement("div", { className: "mail-rail-head" },
            React.createElement("div", { className: "mail-rail-title" },
              React.createElement("h1", null, "Email"),
              React.createElement("p", null, "Client, platform, and project communication for Companions of CPAS.")
            ),
            React.createElement("button", { type: "button", className: "mail-icon-btn", onClick: function() { setSettingsOpen(true); }, title: "Mail settings" },
              React.createElement(Icon, { name: "gear", size: 16 })
            )
          ),
          React.createElement("button", { type: "button", className: "mail-compose-btn", onClick: function() { openCompose(); } },
            React.createElement(Icon, { name: "plus", size: 16 }),
            React.createElement("span", null, "Compose")
          ),
          React.createElement("div", { className: "mail-nav-section" },
            React.createElement("div", { className: "mail-nav-label" }, "Mailbox"),
            MAILBOX_NAV.map(function(item) {
              const active = view === item.key && !smartKey;
              const badge = item.key === "inbox" && unreadCount > 0 ? unreadCount : item.key === "drafts" && draftCount ? draftCount : null;
              return React.createElement("button", {
                key: item.key,
                type: "button",
                className: "mail-nav-item" + (active ? " is-active" : ""),
                onClick: function() { selectNav(item.key); },
              },
                React.createElement(Icon, { name: item.icon, size: 16 }),
                React.createElement("span", { className: "mail-nav-text" }, item.label),
                badge ? React.createElement("span", { className: "mail-nav-badge" + (item.key === "drafts" ? " soft" : "") }, badge) : null
              );
            })
          ),
          React.createElement("div", { className: "mail-nav-section" },
            React.createElement("div", { className: "mail-nav-label" }, "Smart Views"),
            SMART_NAV.map(function(item) {
              const badge = item.key === "notifications" && notifUnreadCount > 0 ? notifUnreadCount : null;
              return React.createElement("button", {
                key: item.key,
                type: "button",
                className: "mail-nav-item" + ((smartKey === item.key || (item.isNotifications && view === "notifications")) ? " is-active" : ""),
                onClick: function() { selectSmart(item); },
              },
                React.createElement(Icon, { name: item.icon, size: 16 }),
                React.createElement("span", { className: "mail-nav-text" }, item.label),
                badge ? React.createElement("span", { className: "mail-nav-badge" }, badge) : null
              );
            })
          ),
          React.createElement("div", { className: "mail-nav-section" },
            React.createElement("div", { className: "mail-nav-label" },
              React.createElement("span", null, "Folders"),
              React.createElement("button", { type: "button", className: "mail-icon-btn sm", onClick: function() { setAddFolderOpen(true); } },
                React.createElement(Icon, { name: "plus", size: 12 })
              )
            ),
            onboardingFolder && React.createElement("button", {
              type: "button",
              className: "mail-nav-item" + (view === "folder" && folderId === onboardingFolder.id ? " is-active" : ""),
              onClick: function() { selectFolder(onboardingFolder); },
            },
              React.createElement(Icon, { name: "layers", size: 16 }),
              React.createElement("span", { className: "mail-nav-text" }, "Onboarding")
            ),
            customFolders.map(function(fld) {
              return React.createElement("button", {
                key: fld.id,
                type: "button",
                className: "mail-nav-item" + (view === "folder" && folderId === fld.id ? " is-active" : ""),
                onClick: function() { selectFolder(fld); },
              },
                React.createElement(Icon, { name: "tag", size: 16 }),
                React.createElement("span", { className: "mail-nav-text" }, fld.name)
              );
            })
          ),
          React.createElement("div", { className: "mail-rail-bottom" },
            React.createElement("div", { className: "mail-route-card" },
              React.createElement("strong", null, "Mail routing"),
              React.createElement("span", null, "Gmail receives · Resend sends app mail"),
              React.createElement("div", { className: "mail-route-status" },
                React.createElement("span", { className: "mail-sync-dot" + (config?.gmail_accounts?.length ? "" : " warn") }),
                React.createElement("span", null, config?.gmail_accounts?.length ? "Gmail connected" : "Connect Gmail in settings")
              )
            )
          )
        ),

        /* ── List ── */
        React.createElement("section", { className: "mail-list" },
          React.createElement("div", { className: "mail-list-head" },
            React.createElement("div", null,
              React.createElement("h2", null, listTitle),
              React.createElement("span", { className: "mail-list-sub" }, subhead)
            ),
            React.createElement("div", { className: "mail-list-actions" },
              React.createElement("button", { type: "button", className: "mail-icon-btn", disabled: busy, onClick: refreshList, title: "Refresh" },
                React.createElement(Icon, { name: "refresh", size: 16 })
              ),
              React.createElement("button", { type: "button", className: "mail-icon-btn", onClick: function() { setSettingsOpen(true); }, title: "Settings" },
                React.createElement(Icon, { name: "gear", size: 16 })
              )
            )
          ),
          view === "inbox" && React.createElement("div", { className: "mail-mailbox-row" },
            React.createElement("button", {
              type: "button",
              className: "mail-chip" + (activeMailbox === "all" ? " is-active" : ""),
              onClick: function() { setActiveMailbox("all"); },
            }, "All"),
            sharedMailboxes.map(function(mb) {
              return React.createElement("button", {
                key: mb,
                type: "button",
                className: "mail-chip" + (activeMailbox === mb ? " is-active" : ""),
                onClick: function() { setActiveMailbox(mb); },
              }, shortAddr(mb));
            }),
            gmailAccounts.map(function(g) {
              return React.createElement("button", {
                key: g.email,
                type: "button",
                className: "mail-chip" + (activeMailbox === g.email ? " is-active" : ""),
                onClick: function() { setActiveMailbox(g.email); },
              }, shortAddr(g.email));
            })
          ),
          React.createElement("label", { className: "mail-search" },
            React.createElement(Icon, { name: "search", size: 16 }),
            React.createElement("input", {
              type: "search",
              placeholder: view === "notifications" ? "Search notifications…" : "Search messages, senders, subject…",
              value: search,
              onChange: function(e) { setSearch(e.target.value); },
            })
          ),
          React.createElement("div", { className: "mail-segmented" },
            (view === "notifications"
              ? ["all", "unread"]
              : view === "sent"
              ? ["all", "manual", "system"]
              : ["all", "unread", "starred", "needs"]
            ).map(function(f) {
              const label = f === "needs" ? "Needs reply" : f === "manual" ? "Manual" : f === "system" ? "Automated" : f.charAt(0).toUpperCase() + f.slice(1);
              return React.createElement("button", {
                key: f,
                type: "button",
                className: listFilter === f ? "is-active" : "",
                onClick: function() { setListFilter(f); },
              }, label);
            })
          ),
          React.createElement("div", { className: "mail-list-meta" },
            React.createElement("span", null, loading ? "Loading…" : listRows.length + (view === "notifications" ? " notifications" : " messages")),
            view === "inbox" && React.createElement("button", { type: "button", onClick: function() { setReadFilter(readFilter === "unread" ? "all" : "unread"); } },
              readFilter === "unread" ? "Show all" : "Unread only"
            )
          ),
          React.createElement("div", { className: "mail-rows" },
            !loading && !listRows.length && React.createElement("div", { className: "mail-empty" },
              React.createElement(Icon, { name: view === "notifications" ? "bell" : "mail", size: 32 }),
              React.createElement("p", null, view === "notifications" ? "No notifications in this view." : "No messages in this view.")
            ),
            !loading && listRows.map(function(m) {
              const av = avatarFor(m.from_email);
              const labels = m.is_notification ? notificationLabels(m.notification || m) : messageLabels(m, view);
              const isSel = selected === m.id;
              return React.createElement("article", {
                key: m.id,
                className: "mail-row" + (isSel ? " is-selected" : "") + (m.status === "unread" ? " is-unread" : ""),
                onClick: function() { openMessage(m); },
                onKeyDown: function(e) { if (e.key === "Enter") openMessage(m); },
                tabIndex: 0,
                role: "button",
              },
                React.createElement("div", { className: "mail-avatar " + av.color },
                  m.status === "unread" && React.createElement("span", { className: "mail-unread-dot" }),
                  av.initials
                ),
                React.createElement("div", { className: "mail-row-main" },
                  React.createElement("div", { className: "mail-row-top" },
                    React.createElement("span", { className: "mail-row-from" }, parseFrom(m.from_email).name || parseFrom(m.from_email).addr),
                    React.createElement("span", { className: "mail-row-date" }, fmtWhen(m.received_at))
                  ),
                  React.createElement("div", { className: "mail-row-subject" }, m.subject || "(no subject)"),
                  React.createElement("div", { className: "mail-row-preview" }, m.preview_text || ""),
                  labels.length > 0 && React.createElement("div", { className: "mail-labels" },
                    labels.map(function(lb, i) {
                      return React.createElement("span", { key: i, className: "mail-label " + lb.cls }, lb.text);
                    })
                  )
                ),
                view !== "sent" && view !== "drafts" && view !== "notifications" && React.createElement("button", {
                  type: "button",
                  className: "mail-star-btn" + (m.is_important ? " is-active" : ""),
                  onClick: function(e) { toggleStar(m, e); },
                  "aria-label": "Star",
                }, React.createElement(Icon, { name: "star", size: 14 }))
              );
            })
          )
        ),

        /* ── Reader ── */
        React.createElement("section", { className: "mail-reader" },
          React.createElement("div", { className: "mail-reader-toolbar" },
            React.createElement("div", { className: "mail-toolbar-left" },
              React.createElement("button", { type: "button", className: "mail-tool-btn mobile-only", onClick: function() { setMobilePanel("list"); } },
                React.createElement(Icon, { name: "chevL", size: 14 })
              ),
              detail && view === "notifications" && React.createElement(React.Fragment, null,
                detail.reply_to_email && React.createElement("button", {
                  type: "button", className: "mail-tool-btn",
                  onClick: function() { replyToNotification(detail.notification || detail); },
                },
                  React.createElement(Icon, { name: "arrowR", size: 14 }), React.createElement("span", null, "Reply")
                ),
                detail.action_url && React.createElement("button", {
                  type: "button", className: "mail-tool-btn",
                  onClick: function() { followNotificationAction(detail.notification || detail); },
                },
                  React.createElement(Icon, { name: "chevR", size: 14 }),
                  React.createElement("span", null, detail.action_label || "View")
                )
              ),
              detail && view !== "notifications" && React.createElement(React.Fragment, null,
                React.createElement("button", { type: "button", className: "mail-tool-btn", onClick: replyToDetail },
                  React.createElement(Icon, { name: "arrowR", size: 14 }), React.createElement("span", null, "Reply")
                ),
                view !== "sent" && React.createElement("button", { type: "button", className: "mail-tool-btn", onClick: function() { patchMessage({ is_important: !detail.is_important }); } },
                  React.createElement(Icon, { name: "star", size: 14 }), React.createElement("span", null, detail.is_important ? "Unstar" : "Star")
                )
              )
            ),
            React.createElement("div", { className: "mail-toolbar-right" },
              detail && view === "notifications" && React.createElement(React.Fragment, null,
                React.createElement("button", {
                  type: "button", className: "mail-tool-btn",
                  onClick: function() {
                    dismissNotification(detail.id).then(function() { notify("Notification dismissed."); });
                  },
                },
                  React.createElement(Icon, { name: "close", size: 14 }), React.createElement("span", null, "Dismiss")
                ),
                React.createElement("button", {
                  type: "button", className: "mail-tool-btn danger",
                  onClick: function() { deleteNotification(detail.id); },
                },
                  React.createElement(Icon, { name: "trash", size: 14 })
                )
              ),
              detail && view !== "notifications" && view !== "sent" && React.createElement("button", { type: "button", className: "mail-tool-btn danger", onClick: function() {
                patchMessage({ is_deleted: 1 }).then(function() { setDetail(null); setSelected(null); });
              }},
                React.createElement(Icon, { name: "trash", size: 14 })
              ),
              onboardingFolder && detail && view !== "sent" && view !== "notifications" && React.createElement("button", { type: "button", className: "mail-tool-btn", onClick: function() {
                patchMessage({ folder_id: onboardingFolder.id }).then(function() { notify("Moved to Onboarding."); });
              }},
                React.createElement(Icon, { name: "layers", size: 14 }), React.createElement("span", null, "Onboarding")
              )
            )
          ),
          React.createElement("div", { className: "mail-reader-body" },
            !detail && React.createElement("div", { className: "mail-empty" },
              React.createElement(Icon, { name: view === "notifications" ? "bell" : "mail", size: 40 }),
              React.createElement("h3", null, view === "notifications" ? "Select a notification" : "Select a message"),
              React.createElement("p", null, view === "notifications"
                ? "Donations, contact forms, and foster applications appear here. Reply or dismiss from the toolbar."
                : "Choose an email from the list to read, reply, or route to a folder.")
            ),
            detail && React.createElement("div", { className: "mail-reader-content" },
              React.createElement("div", { className: "mail-header-card" },
                React.createElement("div", { className: "mail-header-main" },
                  React.createElement("div", { className: "mail-avatar lg " + avatarFor(detail.from_email).color }, avatarFor(detail.from_email).initials),
                  React.createElement("div", { className: "mail-header-stack" },
                    React.createElement("h2", null, detail.subject || "(no subject)"),
                    React.createElement("p", null, detail.from_email)
                  ),
                  React.createElement("span", { className: "mail-header-date" }, fmtWhen(detail.received_at))
                ),
                React.createElement("div", { className: "mail-meta-grid" },
                  detail.mailbox && React.createElement("div", { className: "mail-meta-item" }, React.createElement("b", null, "Mailbox"), React.createElement("span", null, detail.mailbox)),
                  detail.source && React.createElement("div", { className: "mail-meta-item" }, React.createElement("b", null, "Source"), React.createElement("span", null, detail.source)),
                  view === "sent" && detail.email_type && React.createElement("div", { className: "mail-meta-item" }, React.createElement("b", null, "Type"), React.createElement("span", null, sentTypeLabel(detail.email_type))),
                  view === "notifications" && detail.type && React.createElement("div", { className: "mail-meta-item" }, React.createElement("b", null, "Type"), React.createElement("span", null, notifTypeLabel(detail.type))),
                  view === "notifications" && detail.reply_to_email && React.createElement("div", { className: "mail-meta-item" }, React.createElement("b", null, "Reply to"), React.createElement("span", null, detail.reply_to_email))
                ),
                view === "notifications" && React.createElement("div", { className: "mail-sam-strip" },
                  React.createElement("div", null,
                    React.createElement("strong", null, "Quick actions"),
                    React.createElement("span", null, "Reply when a response is needed, open related records, or dismiss when handled.")
                  )
                ),
                view !== "sent" && view !== "notifications" && React.createElement("div", { className: "mail-sam-strip" },
                  React.createElement("div", null,
                    React.createElement("strong", null, "Quick actions"),
                    React.createElement("span", null, "Reply, star, move to Onboarding, or delete from the toolbar above.")
                  )
                )
              ),
              React.createElement("div", {
                className: "mail-body-html",
                dangerouslySetInnerHTML: { __html: detail.body_html || ("<pre>" + (detail.body_text || detail.preview_text || "") + "</pre>") },
              })
            )
          )
        )
      )
    ),

    /* Compose sheet */
    composeOpen && React.createElement(React.Fragment, null,
      React.createElement("button", { type: "button", className: "mail-compose-backdrop", onClick: function() { setComposeOpen(false); }, "aria-label": "Close" }),
      React.createElement("section", { className: "mail-compose-sheet open", role: "dialog" },
        React.createElement("div", { className: "mail-compose-head" },
          React.createElement("strong", null, "New message"),
          React.createElement("button", { type: "button", onClick: function() { setComposeOpen(false); } }, "×")
        ),
        React.createElement("div", { className: "mail-compose-fields" },
          React.createElement("label", { className: "mail-compose-field" }, "From",
            React.createElement("select", { value: compose.from, onChange: function(e) { setCompose(function(c) { return Object.assign({}, c, { from: e.target.value }); }); } },
              fromOptions.map(function(o) { return React.createElement("option", { key: o.value, value: o.value }, o.label); })
            )
          ),
          React.createElement("label", { className: "mail-compose-field" }, "To",
            React.createElement("input", { type: "email", value: compose.to, placeholder: "recipient@example.com", required: true, onChange: function(e) { setCompose(function(c) { return Object.assign({}, c, { to: e.target.value }); }); } })
          ),
          React.createElement("label", { className: "mail-compose-field" }, "Subject",
            React.createElement("input", { type: "text", value: compose.subject, placeholder: "Optional — defaults to (no subject)", onChange: function(e) { setCompose(function(c) { return Object.assign({}, c, { subject: e.target.value }); }); } })
          )
        ),
        React.createElement("div", { className: "mail-compose-body" },
          React.createElement("textarea", {
            value: compose.html,
            placeholder: "Write your message…",
            required: true,
            onChange: function(e) { setCompose(function(c) { return Object.assign({}, c, { html: e.target.value }); }); },
          })
        ),
        React.createElement("div", { className: "mail-compose-actions" },
          React.createElement("button", { type: "button", className: "mail-btn ghost", onClick: saveDraft }, "Save draft"),
          React.createElement("button", { type: "button", className: "mail-btn primary", disabled: busy, onClick: sendCompose }, busy ? "Sending…" : "Send")
        )
      )
    ),

    /* Settings modal */
    settingsOpen && React.createElement("div", { className: "mail-modal-backdrop open", onClick: function(e) { if (e.target === e.currentTarget) setSettingsOpen(false); } },
      React.createElement("section", { className: "mail-settings-modal", role: "dialog" },
        React.createElement("div", { className: "mail-settings-head" },
          React.createElement("div", null,
            React.createElement("h2", null, "Mail settings"),
            React.createElement("span", null, "Connect Gmail for inbox sync. Resend handles support@ and no-reply@ outbound.")
          ),
          React.createElement("button", { type: "button", className: "mail-icon-btn", onClick: function() { setSettingsOpen(false); } },
            React.createElement(Icon, { name: "close", size: 18 })
          )
        ),
        React.createElement("div", { className: "mail-settings-body" },
          React.createElement("div", { className: "mail-settings-card full" },
            React.createElement("strong", null, "Connected sources"),
            React.createElement("div", { className: "mail-accounts-list" },
              React.createElement("div", { className: "mail-account-row" },
                React.createElement("div", { className: "mail-prov-icon resend" }, "RS"),
                React.createElement("div", null,
                  React.createElement("strong", null, "support@companionsofcaddo.org"),
                  React.createElement("span", null, "Resend inbound · shared by all members")
                ),
                React.createElement("span", { className: "mail-pill connected" }, "Active")
              ),
              gmailAccounts.map(function(acct) {
                return React.createElement("div", { key: acct.id || acct.email, className: "mail-account-row" },
                  React.createElement("div", { className: "mail-prov-icon gmail" }, "GM"),
                  React.createElement("div", null,
                    React.createElement("strong", null, acct.email),
                    React.createElement("span", null, "Gmail inbox sync")
                  ),
                  React.createElement("div", { className: "mail-account-actions" },
                    React.createElement("button", { type: "button", className: "mail-btn ghost sm", disabled: busy, onClick: function() { syncGmail(acct.email); } }, "Sync"),
                    React.createElement("button", { type: "button", className: "mail-btn ghost sm", onClick: function() { disconnectGmail(acct); } }, "Disconnect")
                  )
                );
              }),
              !gmailAccounts.length && React.createElement("div", { className: "mail-account-row" },
                React.createElement("div", { className: "mail-prov-icon add" }, "+"),
                React.createElement("div", null,
                  React.createElement("strong", null, "No Gmail connected"),
                  React.createElement("span", null, "Connect companionsCPAS@gmail.com or any org Gmail")
                ),
                React.createElement("button", { type: "button", className: "mail-btn primary sm", onClick: connectGmail }, "Connect Gmail")
              )
            ),
            React.createElement("div", { className: "mail-settings-actions" },
              React.createElement("button", { type: "button", className: "mail-btn ghost", onClick: connectGmail }, "Add Gmail account"),
              React.createElement("button", { type: "button", className: "mail-btn primary", onClick: function() { setSettingsOpen(false); } }, "Done")
            )
          ),
          config && React.createElement("div", { className: "mail-settings-card full" },
            React.createElement("strong", null, "Status"),
            React.createElement("pre", { className: "mail-payload-preview" }, JSON.stringify({
              resend: config.resend_configured,
              webhook: config.webhook_configured,
              mailboxes: config.shared_mailboxes,
              gmail_accounts: gmailAccounts.map(function(a) { return a.email; }),
            }, null, 2))
          )
        )
      )
    ),

    React.createElement(Modal, {
      open: addFolderOpen,
      onClose: function() { setAddFolderOpen(false); },
      title: "Add Folder",
      width: 400,
    },
      React.createElement(Input, { value: newFolderName, onChange: function(v) { setNewFolderName(v); }, placeholder: "Folder name" }),
      React.createElement("div", { style: { marginTop: 16, display: "flex", justifyContent: "flex-end" } },
        React.createElement(Btn, { onClick: addFolder }, "Create folder")
      )
    )
  );
}
