import os
import subprocess

config_path = "/root/.codex/config.toml"

# Backup config
with open(config_path, "r") as f:
    orig_config = f.read()

try:
    # Write config pointing to the local proxy on port 8085
    new_config = """model_provider = "zerog"
model = "gpt-5.6-sol"
disable_response_storage = true

[model_providers.zerog]
name = "0G Router Proxy"
base_url = "http://161.97.107.130:8085"
wire_api = "responses"
env_key = "ZEROG_API_KEY"
"""
    with open(config_path, "w") as f:
        f.write(new_config)
        
    print("New config written pointing to proxy base_url http://161.97.107.130:8085. Running codex exec...")
    
    # Run Codex command. Do not use the dangerous bypass flag here: Claude/Codex
    # reviewer environments commonly run as root, and privileged permission
    # bypass flags are rejected by agent CLIs for security reasons.
    env = os.environ.copy()
    env["ZEROG_API_KEY"] = os.environ.get("ZEROG_API_KEY", "")
    if not env["ZEROG_API_KEY"]:
        raise RuntimeError("Set ZEROG_API_KEY before running this script")
    
    cmd = ["codex", "exec", "--sandbox", "workspace-write", "Reply with the single word OK."]
    res = subprocess.run(cmd, env=env, capture_output=True, text=True)
    
    print("\n--- Codex CLI Execution Result ---")
    print("Exit code:", res.returncode)
    print("Stdout:", res.stdout)
    print("Stderr:", res.stderr)

finally:
    # Restore config
    with open(config_path, "w") as f:
        f.write(orig_config)
    print("Config restored.")
