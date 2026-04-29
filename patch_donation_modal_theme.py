from pathlib import Path

files = [
  Path("public/adopt.html"),
  Path("public/donate.html"),
  Path("public/index.html"),
  Path("public/about.html"),
  Path("public/services.html"),
]

css = r'''
<style id="cpas-sitewide-donation-modal-contrast-v1">
.cpas-donate-modal,
.donation-modal,
#donateModal {
  color: #111827 !important;
}

.cpas-donate-panel,
.donation-modal .modal-content,
#donateModal .modal-content,
#donateModal form {
  background: #F8F7FF !important;
  color: #111827 !important;
  border: 1px solid rgba(15,23,42,.12) !important;
  box-shadow: 0 40px 140px rgba(0,0,0,.58) !important;
}

.cpas-donate-panel h1,
.cpas-donate-panel h2,
.cpas-donate-panel h3,
.cpas-donate-panel label,
.donation-modal h1,
.donation-modal h2,
.donation-modal h3,
.donation-modal label,
#donateModal h1,
#donateModal h2,
#donateModal h3,
#donateModal label {
  color: #111827 !important;
}

.cpas-donate-panel p,
.cpas-donate-panel span,
.cpas-donate-panel small,
.donation-modal p,
.donation-modal span,
.donation-modal small,
#donateModal p,
#donateModal span,
#donateModal small {
  color: #475569 !important;
}

.cpas-donate-form input,
.cpas-donate-form select,
.cpas-donate-form textarea,
#donateModal input,
#donateModal select,
#donateModal textarea {
  background: #FFFFFF !important;
  color: #111827 !important;
  border: 1px solid rgba(15,23,42,.16) !important;
}

.cpas-donate-form input::placeholder,
.cpas-donate-form textarea::placeholder,
#donateModal input::placeholder,
#donateModal textarea::placeholder {
  color: #64748B !important;
}

.cpas-amounts button,
.amount-button,
#donateModal .amount-btn {
  background: #FFFFFF !important;
  color: #111827 !important;
  border: 1px solid rgba(15,23,42,.16) !important;
}

.cpas-amounts button.active,
.amount-button.active,
#donateModal .amount-btn.active {
  background: #6D5593 !important;
  color: #FFFFFF !important;
  border-color: #6D5593 !important;
}

.cpas-donate-submit,
#donateModal button[type="submit"],
#donateModal .donate-submit {
  background: #6D5593 !important;
  color: #FFFFFF !important;
  border: 1px solid rgba(15,23,42,.08) !important;
}

.cpas-donate-close,
#donateModal .close,
#donateModal .modal-close {
  background: #6D5593 !important;
  color: #FFFFFF !important;
}

.cpas-donate-msg {
  color: #6D5593 !important;
}
</style>
'''

for p in files:
    if not p.exists():
        continue
    s = p.read_text()
    if "cpas-sitewide-donation-modal-contrast-v1" not in s:
        s = s.replace("</head>", css + "\n</head>")
    p.write_text(s)

print("Donation modal contrast theme patched sitewide.")
