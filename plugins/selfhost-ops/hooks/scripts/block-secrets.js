#!/usr/bin/env node
// PreToolUse guard: stop Claude from editing secrets files.
// Reads the hook event as JSON on stdin. Exit 2 blocks the tool call and
// feeds stderr back to Claude; exit 0 allows it.
// This is a guardrail against accidents, not a security boundary.

const SAFE_SUFFIX = /\.(example|sample|template|dist)$/i;
const SECRET_NAME = [
  /^\.env(\..+)?$/i,           // .env, .env.production, .env.local
  /\.(pem|key|p12|pfx)$/i,     // keys and certificates
  /^id_(rsa|ed25519|ecdsa)$/i, // ssh private keys
];

function isSecretPath(p) {
  const name = String(p || "").replace(/\\/g, "/").split("/").pop();
  if (!name || SAFE_SUFFIX.test(name)) return false;
  return SECRET_NAME.some((re) => re.test(name));
}

// Shell commands that write to a secrets file (redirects, tee, sed -i).
function bashWritesSecret(cmd) {
  const c = String(cmd || "");
  return /(>>?|\btee\b(\s+-a)?|\bsed\s+-i\S*)\s+[^|;&\n]*\.env(\.[\w-]+)?(\s|$|["'])/i.test(c)
    && !/\.env\.(example|sample|template|dist)/i.test(c);
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    process.exit(0); // never block on unreadable input
  }

  const tool = event.tool_name;
  const input = event.tool_input || {};
  let blocked = false;

  if (tool === "Bash") {
    blocked = bashWritesSecret(input.command);
  } else {
    blocked = isSecretPath(input.file_path || input.path);
  }

  if (blocked) {
    process.stderr.write(
      "Blocked by selfhost-ops: this would modify a secrets file (.env, key, or certificate). " +
        "Ask the user to edit it themselves, or edit the .example template instead.\n"
    );
    process.exit(2);
  }
  process.exit(0);
});
