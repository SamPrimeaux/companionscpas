// ─── Email Workspace — Gmail-style 3-column layout ──────────────────────────

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
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
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
  const p = parseFrom(email);
  return p.addr || String(email || "");
}

const NAV_ITEMS = [
  { key: "inbox", label: "Inbox", icon: "mail" },
  { key: "important", label: "Important", icon: "star" },
  { key: "sent", label: "Sent", icon: "arrowR" },
  { key: "drafts", label: "Drafts", icon: "docs" },
  { key: "deleted", label: "Deleted", icon: "trash" },
];

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

function EmailView() {
  const [view, setView] = React.useState("inbox");
  const [folderId, setFolderId] = React.useState(null);
  const [activeMailbox, setActiveMailbox] = React.useState("all");
  const [folders, setFolders] = React.useState([]);
  const [config, setConfig] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [sent, setSent] = React.useState([]);
  const [drafts, setDrafts] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [detail, setDetail] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [readFilter, setReadFilter] = React.useState("all");
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [addFolderOpen, setAddFolderOpen] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [compose, setCompose] = React.useState({ to: "", subject: "", html: "", from: "" });

  function notify(msg, isErr) {
    if (isErr) setError(msg); else setNotice(msg);
    setTimeout(function() { setError(""); setNotice(""); }, 4500);
  }

  function loadMessages() {
    if (view === "sent") {
      return emailApi("/api/email/outbound?limit=100").then(function(d) {
        setSent(d.messages || []);
      });
    }
    if (view === "drafts") {
      return emailApi("/api/email/drafts").then(function(d) {
        setDrafts(d.drafts || []);
      });
    }
    const params = new URLSearchParams({
      view: view === "folder" ? "folder" : view,
      read_filter: readFilter,
    });
    if (folderId && view === "folder") params.set("folder_id", folderId);
    if (search.trim()) params.set("q", search.trim());
    if (view === "inbox" && activeMailbox && activeMailbox !== "all") {
      params.set("mailbox", activeMailbox);
    }
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
      loadMessages(),
    ]).then(function(results) {
      setConfig(results[0]);
      setFolders(results[1].folders || []);
      const supportFrom = results[0]?.from_addresses?.support;
      if (supportFrom) {
        setCompose(function(c) { return Object.assign({}, c, { from: supportFrom }); });
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get("connected") === "gmail") notify("Gmail connected. Syncing inbox…");
      if (params.get("error")) notify("Gmail connection failed: " + params.get("error"), true);
    }).catch(function(e) {
      setError(e.message || "Failed to load email.");
    }).finally(function() { setLoading(false); });
  }

  React.useEffect(function() { loadAll(); }, []);
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
    if (!composeOpen) return;
    const h = function(e) { if (e.key === "Escape") setComposeOpen(false); };
    document.addEventListener("keydown", h);
    return function() { document.removeEventListener("keydown", h); };
  }, [composeOpen]);

  function selectNav(key) {
    setView(key);
    setFolderId(null);
    setSelected(null);
    setDetail(null);
  }

  function selectFolder(fld) {
    setView("folder");
    setFolderId(fld.id);
    setSelected(null);
    setDetail(null);
  }

  function openCompose(preset) {
    setCompose(Object.assign({
      to: "",
      subject: "",
      html: "",
      from: config?.from_addresses?.support || compose.from,
    }, preset || {}));
    setComposeOpen(true);
  }

  function openMessage(msg) {
    if (view === "drafts") {
      const to = (function() {
        try { return JSON.parse(msg.to_json || "[]")[0] || ""; } catch { return ""; }
      })();
      openCompose({
        to,
        subject: msg.subject || "",
        html: msg.body_html || "",
        from: msg.from_email || compose.from,
      });
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
        body_html: "<p><strong>From:</strong> " + shortAddr(fromAddr) + "</p>"
          + "<p><strong>To:</strong> " + (msg.recipient_email || "") + "</p>"
          + "<p><strong>Type:</strong> " + sentTypeLabel(msg.email_type) + "</p>"
          + "<p><strong>Status:</strong> " + (msg.status || "sent") + "</p>"
          + (msg.error_message ? "<p><strong>Error:</strong> " + msg.error_message + "</p>" : ""),
        source: "resend",
        email_type: msg.email_type,
      });
      return;
    }
    setSelected(msg.id);
    emailApi("/api/email/inbox/" + encodeURIComponent(msg.id)).then(function(d) {
      setDetail(d.message);
      if (d.message?.status === "unread") {
        emailApi("/api/email/inbox/" + encodeURIComponent(msg.id), {
          method: "PATCH",
          body: JSON.stringify({ status: "read" }),
        }).then(loadMessages).catch(function() {});
      }
    }).catch(function(e) { notify(e.message, true); });
  }

  function patchMessage(patch) {
    if (!selected) return;
    return emailApi("/api/email/inbox/" + encodeURIComponent(selected), {
      method: "PATCH",
      body: JSON.stringify(patch),
    }).then(function() {
      loadMessages();
      if (detail) setDetail(Object.assign({}, detail, patch));
    });
  }

  function sendCompose() {
    setBusy(true);
    emailApi("/api/email/send", {
      method: "POST",
      body: JSON.stringify({
        to: compose.to,
        subject: compose.subject,
        html: compose.html,
        from: compose.from,
      }),
    }).then(function() {
      notify("Email sent.");
      setComposeOpen(false);
      setView("sent");
      return loadMessages();
    }).catch(function(e) { notify(e.message, true); })
      .finally(function() { setBusy(false); });
  }

  function saveDraft() {
    emailApi("/api/email/drafts", {
      method: "POST",
      body: JSON.stringify(compose),
    }).then(function() {
      notify("Draft saved.");
      setComposeOpen(false);
      if (view === "drafts") loadMessages();
    }).catch(function(e) { notify(e.message, true); });
  }

  function replyToDetail() {
    if (!detail) return;
    const from = parseFrom(detail.from_email);
    openCompose({
      to: from.addr || detail.from_email,
      subject: (detail.subject || "").startsWith("Re:") ? detail.subject : ("Re: " + (detail.subject || "")),
      html: "<p></p><hr/><p><em>On " + fmtWhen(detail.received_at) + ", " + (detail.from_email || "") + " wrote:</em></p>"
        + (detail.body_html || ("<pre>" + (detail.body_text || "") + "</pre>")),
      from: config?.from_addresses?.support || compose.from,
    });
  }

  function addFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    emailApi("/api/email/folders", { method: "POST", body: JSON.stringify({ name }) })
      .then(function() {
        setNewFolderName("");
        setAddFolderOpen(false);
        return emailApi("/api/email/folders");
      })
      .then(function(d) { setFolders(d.folders || []); notify("Folder created."); })
      .catch(function(e) { notify(e.message, true); });
  }

  function refreshList() {
    setBusy(true);
    loadMessages().catch(function(e) { notify(e.message, true); }).finally(function() { setBusy(false); });
  }

  function connectGmail() {
    window.location.href = "/api/integrations/gmail/connect";
  }

  function syncGmail(accountEmail) {
    setBusy(true);
    emailApi("/api/integrations/gmail/sync", {
      method: "POST",
      body: JSON.stringify(accountEmail ? { account_email: accountEmail } : {}),
    }).then(function(d) {
      notify("Synced " + (d.synced || 0) + " Gmail message(s).");
      return loadMessages();
    }).catch(function(e) { notify(e.message, true); })
      .finally(function() { setBusy(false); });
  }

  function disconnectGmail(account) {
    emailApi("/api/integrations/gmail/disconnect", {
      method: "POST",
      body: JSON.stringify({ connection_id: account.id, account_email: account.email }),
    }).then(loadAll).catch(function(e) { notify(e.message, true); });
  }

  const listTitle = view === "folder"
    ? (folders.find(function(f) { return f.id === folderId; })?.name || "Folder")
    : (NAV_ITEMS.find(function(n) { return n.key === view; })?.label || "Inbox");

  const sharedMailboxes = config?.shared_mailboxes || config?.mailboxes || [];
  const gmailAccounts = config?.gmail_accounts || [];
  const mailboxFilters = [{ key: "all", label: "All inboxes" }]
    .concat(sharedMailboxes.map(function(mb) { return { key: mb, label: shortAddr(mb) }; }))
    .concat(gmailAccounts.map(function(g) { return { key: g.email, label: shortAddr(g.email) }; }));

  const fromOptions = [
    { value: config?.from_addresses?.support || "", label: "Support — support@companionsofcaddo.org" },
    { value: config?.from_addresses?.noreply || "", label: "System — no-reply@companionsofcaddo.org" },
  ].filter(function(o) { return o.value; });

  const listRows = view === "sent" ? sent.map(function(m) {
    return {
      id: m.id,
      from_email: m.from_email || config?.from_addresses?.noreply,
      subject: m.subject,
      preview_text: "To: " + (m.recipient_email || "") + " · " + sentTypeLabel(m.email_type),
      received_at: m.sent_at || m.created_at,
      status: "read",
      email_type: m.email_type,
      recipient_email: m.recipient_email,
    };
  }) : view === "drafts" ? drafts.map(function(m) {
    return {
      id: m.id,
      from_email: "Draft",
      subject: m.subject,
      preview_text: (m.body_text || m.body_html || "").replace(/<[^>]*>/g, "").slice(0, 120),
      received_at: m.updated_at,
      status: "read",
    };
  }) : messages;

  const customFolders = folders.filter(function(f) { return !f.is_system && f.slug !== "onboarding"; });
  const onboardingFolder = folders.find(function(f) { return f.slug === "onboarding"; });

  return React.createElement("div", { className: "email-workspace" + (composeOpen ? " is-composing" : "") },
    (error || notice) && React.createElement("div", { className: "email-toast " + (error ? "is-error" : "is-ok") }, error || notice),

    React.createElement("div", { className: "email-layout" },
      React.createElement("nav", { className: "email-nav", "aria-label": "Email navigation" },
        React.createElement("div", { className: "email-nav-title" }, "Email"),
        React.createElement("ul", { className: "email-nav-list" },
          NAV_ITEMS.map(function(item) {
            const active = view === item.key;
            const badge = item.key === "inbox" && unreadCount > 0 ? unreadCount : null;
            return React.createElement("li", { key: item.key },
              React.createElement("button", {
                type: "button",
                className: "email-nav-item" + (active ? " is-active" : ""),
                onClick: function() { selectNav(item.key); },
              },
                React.createElement(Icon, { name: item.icon, size: 16 }),
                React.createElement("span", null, item.label),
                badge ? React.createElement("span", { className: "email-nav-badge" }, badge) : null
              )
            );
          })
        ),
        React.createElement("div", { className: "email-nav-section" },
          React.createElement("div", { className: "email-nav-section-head" },
            React.createElement("span", null, "Folders"),
            React.createElement("button", { type: "button", className: "email-nav-icon-btn", title: "Add folder", onClick: function() { setAddFolderOpen(true); } },
              React.createElement(Icon, { name: "plus", size: 14 })
            )
          ),
          React.createElement("ul", { className: "email-nav-list" },
            onboardingFolder && React.createElement("li", { key: onboardingFolder.id },
              React.createElement("button", {
                type: "button",
                className: "email-nav-item" + (view === "folder" && folderId === onboardingFolder.id ? " is-active" : ""),
                onClick: function() { selectFolder(onboardingFolder); },
              },
                React.createElement(Icon, { name: "layers", size: 16 }),
                React.createElement("span", null, "Onboarding")
              )
            ),
            customFolders.map(function(fld) {
              return React.createElement("li", { key: fld.id },
                React.createElement("button", {
                  type: "button",
                  className: "email-nav-item" + (view === "folder" && folderId === fld.id ? " is-active" : ""),
                  onClick: function() { selectFolder(fld); },
                },
                  React.createElement(Icon, { name: "tag", size: 16 }),
                  React.createElement("span", null, fld.name)
                )
              );
            }),
            React.createElement("li", null,
              React.createElement("button", { type: "button", className: "email-nav-item email-nav-add", onClick: function() { setAddFolderOpen(true); } },
                React.createElement(Icon, { name: "plus", size: 14 }),
                React.createElement("span", null, "Add Folder")
              )
            )
          )
        ),
        React.createElement("div", { className: "email-nav-gmail" },
          React.createElement("div", { className: "email-nav-section-head" },
            React.createElement("span", null, "Gmail"),
            React.createElement("button", { type: "button", className: "email-nav-icon-btn", title: "Connect another Gmail", onClick: connectGmail },
              React.createElement(Icon, { name: "plus", size: 14 })
            )
          ),
          gmailAccounts.length
            ? gmailAccounts.map(function(acct) {
                return React.createElement("div", { key: acct.id || acct.email, className: "email-gmail-account" },
                  React.createElement("div", { className: "email-gmail-pill" },
                    React.createElement(Icon, { name: "mail", size: 14 }),
                    React.createElement("span", null, acct.email)
                  ),
                  React.createElement("div", { className: "email-gmail-actions" },
                    React.createElement(Btn, { size: "sm", variant: "secondary", disabled: busy, onClick: function() { syncGmail(acct.email); } }, "Sync"),
                    React.createElement(Btn, { size: "sm", variant: "ghost", onClick: function() { disconnectGmail(acct); } }, "Disconnect")
                  )
                );
              })
            : React.createElement("button", { type: "button", className: "email-gmail-connect", onClick: connectGmail },
                React.createElement(Icon, { name: "link", size: 14 }),
                "Connect Gmail"
              )
        )
      ),

      React.createElement("section", { className: "email-list-panel" },
        React.createElement("div", { className: "email-list-head" },
          React.createElement("h2", null, listTitle),
          React.createElement("div", { className: "email-list-actions" },
            React.createElement("button", { type: "button", className: "email-icon-btn", title: "Refresh", disabled: busy, onClick: refreshList },
              React.createElement(Icon, { name: "refresh", size: 16 })
            ),
            React.createElement("button", { type: "button", className: "email-compose-fab", onClick: function() { openCompose(); }, title: "Compose" },
              React.createElement(Icon, { name: "plus", size: 18 })
            )
          )
        ),
        view === "inbox" && mailboxFilters.length > 1 && React.createElement("div", { className: "email-mailbox-row" },
          mailboxFilters.map(function(mb) {
            return React.createElement("button", {
              key: mb.key,
              type: "button",
              className: "email-mailbox-chip" + (activeMailbox === mb.key ? " is-active" : ""),
              onClick: function() { setActiveMailbox(mb.key); },
            }, mb.label);
          })
        ),
        view === "sent" && React.createElement("p", { className: "email-sent-hint" }, "Includes manual sends and automated receipts from no-reply@ (donations, forms, apps)."),
        React.createElement("div", { className: "email-search-wrap" },
          React.createElement(Icon, { name: "search", size: 16 }),
          React.createElement("input", {
            className: "email-search",
            placeholder: "Search",
            value: search,
            onChange: function(e) { setSearch(e.target.value); },
          })
        ),
        view === "inbox" && React.createElement("div", { className: "email-filters" },
          ["all", "read", "unread"].map(function(f) {
            return React.createElement("button", {
              key: f,
              type: "button",
              className: "email-filter-pill" + (readFilter === f ? " is-active" : ""),
              onClick: function() { setReadFilter(f); },
            }, f.charAt(0).toUpperCase() + f.slice(1));
          })
        ),
        React.createElement("div", { className: "email-list-scroll" },
          loading && React.createElement("div", { className: "email-empty" }, "Loading…"),
          !loading && !listRows.length && React.createElement("div", { className: "email-empty" }, "No messages in this view."),
          !loading && listRows.map(function(m) {
            const from = parseFrom(m.from_email);
            const active = selected === m.id;
            return React.createElement("button", {
              key: m.id,
              type: "button",
              className: "email-list-item" + (active ? " is-active" : "") + (m.status === "unread" ? " is-unread" : ""),
              onClick: function() { openMessage(m); },
            },
              React.createElement("div", { className: "email-list-item-top" },
                React.createElement("span", { className: "email-list-from-wrap" },
                  m.status === "unread" && React.createElement("span", { className: "email-unread-dot", "aria-hidden": "true" }),
                  React.createElement("span", { className: "email-list-from" },
                    view === "sent" ? shortAddr(m.from_email) : (from.name || from.addr)
                  )
                ),
                React.createElement("span", { className: "email-list-time" }, fmtWhen(m.received_at))
              ),
              React.createElement("div", { className: "email-list-subject-row" },
                React.createElement("span", { className: "email-list-subject" }, m.subject || "(no subject)"),
                m.is_important ? React.createElement(Icon, { name: "star", size: 14, style: { color: "#f59e0b" } }) : null,
                view === "sent" && m.email_type && React.createElement("span", { className: "email-type-tag" }, sentTypeLabel(m.email_type))
              ),
              React.createElement("div", { className: "email-list-preview" }, m.preview_text || "")
            );
          })
        )
      ),

      React.createElement("section", { className: "email-detail-panel" },
        !detail && view !== "sent" && view !== "drafts" && React.createElement("div", { className: "email-detail-empty" },
          React.createElement(Icon, { name: "mail", size: 40 }),
          React.createElement("p", null, "Select a message to read")
        ),
        (view === "sent" || view === "drafts") && !detail && React.createElement("div", { className: "email-detail-empty" },
          React.createElement("p", null, view === "sent" ? "Select a sent message to view details" : "Select a draft to edit")
        ),
        detail && view !== "sent" && React.createElement("div", { className: "email-detail" },
          React.createElement("div", { className: "email-detail-toolbar" },
            React.createElement("button", { type: "button", className: "email-tool-btn", onClick: replyToDetail },
              React.createElement(Icon, { name: "arrowR", size: 14 }), " Reply"
            ),
            React.createElement("button", { type: "button", className: "email-tool-btn", onClick: function() { patchMessage({ is_important: !detail.is_important }); } },
              React.createElement(Icon, { name: "star", size: 14 }), detail.is_important ? " Unstar" : " Star"
            ),
            React.createElement("button", { type: "button", className: "email-tool-btn", onClick: function() {
              patchMessage({ is_deleted: 1 }).then(function() { setDetail(null); setSelected(null); });
            }},
              React.createElement(Icon, { name: "trash", size: 14 }), " Delete"
            ),
            onboardingFolder && React.createElement("button", { type: "button", className: "email-tool-btn", onClick: function() {
              patchMessage({ folder_id: onboardingFolder.id }).then(function() { notify("Moved to Onboarding."); });
            }},
              React.createElement(Icon, { name: "layers", size: 14 }), " → Onboarding"
            )
          ),
          React.createElement("header", { className: "email-detail-head" },
            React.createElement("h1", null, detail.subject || "(no subject)"),
            React.createElement("div", { className: "email-detail-meta" },
              React.createElement("strong", null, detail.from_email),
              React.createElement("span", null, fmtWhen(detail.received_at)),
              detail.source === "gmail" && React.createElement("span", { className: "email-source-tag" }, "Gmail"),
              detail.source === "resend" && React.createElement("span", { className: "email-source-tag" }, "Resend")
            )
          ),
          React.createElement("div", {
            className: "email-detail-body",
            dangerouslySetInnerHTML: { __html: detail.body_html || ("<pre>" + (detail.body_text || detail.preview_text || "") + "</pre>") },
          })
        ),
        detail && view === "sent" && React.createElement("div", { className: "email-detail" },
          React.createElement("header", { className: "email-detail-head" },
            React.createElement("h1", null, detail.subject || "(no subject)"),
            React.createElement("div", { className: "email-detail-meta" },
              React.createElement("span", { className: "email-source-tag" }, sentTypeLabel(detail.email_type)),
              React.createElement("span", null, fmtWhen(detail.received_at))
            )
          ),
          React.createElement("div", {
            className: "email-detail-body",
            dangerouslySetInnerHTML: { __html: detail.body_html || "" },
          })
        )
      )
    ),

    composeOpen && React.createElement(React.Fragment, null,
      React.createElement("button", {
        type: "button",
        className: "email-compose-backdrop",
        "aria-label": "Close composer",
        onClick: function() { setComposeOpen(false); },
      }),
      React.createElement("section", { className: "email-compose-drawer", role: "dialog", "aria-label": "Compose email" },
        React.createElement("div", { className: "email-compose-drawer-head" },
          React.createElement("h3", null, "New message"),
          React.createElement("button", { type: "button", className: "email-icon-btn", onClick: function() { setComposeOpen(false); } },
            React.createElement(Icon, { name: "close", size: 18 })
          )
        ),
        React.createElement("div", { className: "email-compose-form" },
          React.createElement("label", { className: "email-compose-label" }, "From"),
          React.createElement("select", {
            className: "email-compose-input",
            value: compose.from,
            onChange: function(e) { setCompose(Object.assign({}, compose, { from: e.target.value })); },
          },
            fromOptions.map(function(opt) {
              return React.createElement("option", { key: opt.value, value: opt.value }, opt.label);
            })
          ),
          React.createElement("label", { className: "email-compose-label" }, "To"),
          React.createElement("input", {
            className: "email-compose-input",
            type: "email",
            value: compose.to,
            placeholder: "recipient@example.com",
            onChange: function(e) { setCompose(Object.assign({}, compose, { to: e.target.value })); },
          }),
          React.createElement("label", { className: "email-compose-label" }, "Subject"),
          React.createElement("input", {
            className: "email-compose-input",
            type: "text",
            value: compose.subject,
            onChange: function(e) { setCompose(Object.assign({}, compose, { subject: e.target.value })); },
          }),
          React.createElement("label", { className: "email-compose-label" }, "Message"),
          React.createElement("textarea", {
            className: "email-compose-area",
            value: compose.html,
            placeholder: "Write your message…",
            onChange: function(e) { setCompose(Object.assign({}, compose, { html: e.target.value })); },
          }),
          React.createElement("div", { className: "email-compose-actions" },
            React.createElement(Btn, { variant: "secondary", onClick: saveDraft }, "Save draft"),
            React.createElement(Btn, { disabled: busy, onClick: sendCompose }, busy ? "Sending…" : "Send")
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
      React.createElement(Input, {
        value: newFolderName,
        onChange: function(v) { setNewFolderName(v); },
        placeholder: "Folder name",
      }),
      React.createElement("div", { style: { marginTop: 16, display: "flex", justifyContent: "flex-end" } },
        React.createElement(Btn, { onClick: addFolder }, "Create folder")
      )
    )
  );
}
