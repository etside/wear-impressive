"""
Wear Impressive -- deployment script
=====================================
Builds the Next.js app, zips the output, uploads to the API domain
via SFTP, then triggers extraction via a PHP script served from
api.v2.wearimpressive.com (which runs PHP, unlike the main domain).

Usage:
    python deploy.py                # build + deploy everything
    python deploy.py --skip-build   # deploy without rebuilding
    python deploy.py --server-js-only   # just fix server.js (emergency)
"""

import os
import sys
import zipfile
import paramiko
import subprocess

# -- Config -------------------------------------------------------------------
HOST         = "wearimpressive.com"
USER         = "wearimp1"
KEY_PATH     = r"C:\Users\HP\wi_key_nopass"
REMOTE_FRONT = "/home/wearimp1/v2.wearimpressive.com/frontend"
REMOTE_API   = "/home/wearimp1/api.v2.wearimpressive.com/backend/public"
LOCAL_FRONT  = r"E:\nas\wear-impressive\frontend"
LOCAL_NEXT   = os.path.join(LOCAL_FRONT, ".next")
ZIP_PATH     = os.path.join(LOCAL_FRONT, "deploy.zip")

# NEXT_PUBLIC_* vars are baked into the build at compile time.
# These must match the live server -- NOT localhost.
PROD_ENV = {
    "NEXT_PUBLIC_API_URL": "https://api.v2.wearimpressive.com/api",
}

SKIP_DIRS = {"dev", "node_modules", "cache", "trace"}

# PHP script uploaded to API domain -- extracts zip into frontend/.next
EXTRACT_PHP = r"""<?php
$zip = new ZipArchive;
$zipFile = __DIR__ . '/wi-deploy.zip';
$extractTo = '/home/wearimp1/v2.wearimpressive.com/frontend/.next';
if ($zip->open($zipFile) === TRUE) {
    $zip->extractTo($extractTo);
    $zip->close();
    unlink($zipFile);
    unlink(__FILE__);
    echo 'OK: extracted to ' . $extractTo;
} else {
    echo 'ERROR: could not open zip at ' . $zipFile;
}
"""
# -----------------------------------------------------------------------------


def build():
    print("\n[1/3] Building Next.js app (with production env)...")
    env = os.environ.copy()
    env.update(PROD_ENV)
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=LOCAL_FRONT,
        env=env,
        shell=True
    )
    if result.returncode != 0:
        print("Build failed. Aborting.")
        sys.exit(1)
    print("Build complete.")


def make_zip():
    print("\n[2/3] Creating deploy.zip...")
    count = 0
    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
        for folder in ["server", "static"]:
            src = os.path.join(LOCAL_NEXT, folder)
            if not os.path.exists(src):
                continue
            for root, dirs, files in os.walk(src):
                dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
                for file in files:
                    full = os.path.join(root, file)
                    rel  = os.path.relpath(full, LOCAL_NEXT).replace("\\", "/")
                    zf.write(full, rel)
                    count += 1
        for name in ["BUILD_ID", "build-manifest.json",
                     "app-build-manifest.json",
                     "routes-manifest.json",
                     "prerender-manifest.json",
                     "react-loadable-manifest.json",
                     "images-manifest.json"]:
            fp = os.path.join(LOCAL_NEXT, name)
            if os.path.exists(fp):
                zf.write(fp, name)
                count += 1
    size_mb = os.path.getsize(ZIP_PATH) / 1024 / 1024
    print(f"Zipped {count} files ({size_mb:.1f} MB)")


def sftp_connect():
    key = paramiko.RSAKey.from_private_key_file(KEY_PATH)
    transport = paramiko.Transport((HOST, 22))
    transport.connect(username=USER, pkey=key)
    return paramiko.SFTPClient.from_transport(transport), transport


def upload_server_js(sftp):
    print("\n[*] Uploading server.js...")
    sftp.put(
        os.path.join(LOCAL_FRONT, "server.js"),
        f"{REMOTE_FRONT}/server.js"
    )
    print("    Done.")


def upload_zip_and_extractor(sftp):
    print("\n[3/3] Uploading zip to API domain...")
    sftp.put(ZIP_PATH, f"{REMOTE_API}/wi-deploy.zip")
    print("    wi-deploy.zip uploaded.")

    php_local = os.path.join(LOCAL_FRONT, "wi-extract.php")
    with open(php_local, "w") as f:
        f.write(EXTRACT_PHP)
    sftp.put(php_local, f"{REMOTE_API}/wi-extract.php")
    os.remove(php_local)
    print("    wi-extract.php uploaded.")


def main():
    args = sys.argv[1:]
    server_js_only = "--server-js-only" in args
    skip_build     = "--skip-build" in args or server_js_only

    if not skip_build:
        build()
    if not server_js_only:
        make_zip()

    print("\n[*] Connecting via SFTP...")
    sftp, transport = sftp_connect()

    upload_server_js(sftp)

    if not server_js_only:
        upload_zip_and_extractor(sftp)

    sftp.close()
    transport.close()

    if server_js_only:
        print("\nDone. cPanel > Setup Node.js App > Restart")
        return

    print("\nNow open to extract:")
    print("    https://api.v2.wearimpressive.com/wi-extract.php")
    print("\nThen: cPanel > Setup Node.js App > Restart")


if __name__ == "__main__":
    main()
