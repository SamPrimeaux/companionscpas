"""Local-only throwaway dashboard login. Never touches Cloudflare or remote D1."""
import glob
import hashlib
import pathlib
import secrets
import sqlite3

root = pathlib.Path(__file__).resolve().parents[2]
storage = root / ".wrangler" / "companions-local-cms"
files = [x for x in storage.glob("v3/d1/miniflare-D1DatabaseObject/*.sqlite") if x.name != "metadata.sqlite"]
if len(files) != 1:
    raise RuntimeError("Expected exactly one isolated local D1 database")
db = sqlite3.connect(files[0], timeout=10)
db.execute("PRAGMA foreign_keys=OFF")
db.executescript("""
CREATE TABLE IF NOT EXISTS tenants (
 id TEXT PRIMARY KEY,slug TEXT NOT NULL UNIQUE,name TEXT NOT NULL,domain TEXT,
 status TEXT NOT NULL DEFAULT 'active',created_at TEXT DEFAULT (datetime('now')),
 updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,full_name TEXT,display_name TEXT,avatar_url TEXT,
 status TEXT NOT NULL DEFAULT 'active',created_at TEXT DEFAULT (datetime('now')),
 updated_at TEXT DEFAULT (datetime('now')),last_login_at TEXT
);
CREATE TABLE IF NOT EXISTS user_credentials (
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL,provider TEXT NOT NULL DEFAULT 'password',
 provider_user_id TEXT,password_hash TEXT,password_salt TEXT,
 password_algo TEXT DEFAULT 'pbkdf2-sha256',created_at TEXT DEFAULT (datetime('now')),
 updated_at TEXT DEFAULT (datetime('now')),UNIQUE(user_id, provider),
 FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS tenant_memberships (
 id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,user_id TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'volunteer',status TEXT NOT NULL DEFAULT 'active',
 invited_by TEXT,invited_at TEXT,accepted_at TEXT,
 created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
 UNIQUE(tenant_id,user_id),FOREIGN KEY(tenant_id) REFERENCES tenants(id),
 FOREIGN KEY(user_id) REFERENCES users(id)
);
""")
db.execute("INSERT OR IGNORE INTO tenants (id,slug,name) VALUES ('tenant_companionscpas','companionscpas','Companions Local Studio')")
email = "studio-local@example.invalid"
user_id = "local_studio_editor"
secret_file = storage / "local-login.txt"
if secret_file.exists():
    print("Local login already exists:", secret_file.relative_to(root))
else:
    password = secrets.token_urlsafe(20)
    salt = secrets.token_bytes(24)
    digest = hashlib.pbkdf2_hmac("sha256",password.encode(),salt,100000,dklen=64).hex()
    db.execute("INSERT OR IGNORE INTO users (id,email,full_name,status) VALUES (?,?,?,'active')",
        (user_id,email,"Local Studio QA"))
    db.execute("INSERT OR REPLACE INTO user_credentials (id,user_id,provider,password_hash,password_salt,password_algo) VALUES (?,?, 'password',?,?,?)",
        ("local_studio_credential",user_id,digest,salt.hex(),"pbkdf2-sha256-100000"))
    db.execute("INSERT OR IGNORE INTO tenant_memberships (id,tenant_id,user_id,role,status) VALUES (?, ?, ?, 'admin','active')",
        ("local_studio_membership","tenant_companionscpas",user_id))
    db.commit()
    secret_file.write_text("Local-only test account (never a production login)\\nemail="+email+"\\npassword="+password+"\\n")
    secret_file.chmod(0o600)
    print("Local test login saved:", secret_file.relative_to(root))
print("Local-only user:", email)
