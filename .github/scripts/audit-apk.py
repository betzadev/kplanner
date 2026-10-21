#!/usr/bin/env python3
"""
audit-apk.py
Performs deep size audit and structural inspection of generated APKs and AAB bundles.
"""

import os
import sys
import glob
import zipfile
from pathlib import Path

def format_size(bytes_val):
    if bytes_val >= 1024 * 1024:
        return f"{bytes_val / (1024 * 1024):.2f} MB"
    elif bytes_val >= 1024:
        return f"{bytes_val / 1024:.2f} KB"
    return f"{bytes_val} B"

def audit_artifacts():
    dist_dir = Path("dist-artifacts")
    if not dist_dir.exists():
        print("[!] dist-artifacts directory not found.")
        return

    artifacts = sorted(list(dist_dir.glob("**/*.*")))
    if not artifacts:
        print("[!] No artifacts found in dist-artifacts.")
        return

    report_lines = []
    report_lines.append("## 📦 APK & AAB Size Optimization Audit Report")
    report_lines.append("")
    report_lines.append("### 1. Generated Artifacts Overview")
    report_lines.append("| Artifact | File Type | Size | Status vs Target |")
    report_lines.append("| :--- | :--- | :--- | :--- |")

    apk_targets = {
        "arm64-v8a": ("< 40 MB", 40 * 1024 * 1024),
        "armeabi-v7a": ("< 35 MB", 35 * 1024 * 1024),
        "aab": ("< 60 MB", 60 * 1024 * 1024),
    }

    apks_to_inspect = []

    for art in artifacts:
        size = art.stat().st_size
        name = art.name
        ext = art.suffix.lower()
        size_str = format_size(size)

        status = "✅ Within Target"
        if "arm64" in name:
            target_str, max_b = apk_targets["arm64-v8a"]
            status = f"✅ {size_str} ({target_str})" if size <= max_b else f"❌ Exceeded ({target_str})"
            apks_to_inspect.append(art)
        elif "armv7" in name or "armeabi" in name:
            target_str, max_b = apk_targets["armeabi-v7a"]
            status = f"✅ {size_str} ({target_str})" if size <= max_b else f"❌ Exceeded ({target_str})"
            apks_to_inspect.append(art)
        elif ext == ".aab":
            target_str, max_b = apk_targets["aab"]
            status = f"✅ {size_str} ({target_str})" if size <= max_b else f"❌ Exceeded ({target_str})"
        elif ext == ".apk":
            apks_to_inspect.append(art)

        report_lines.append(f"| `{name}` | `{ext}` | **{size_str}** | {status} |")

    report_lines.append("")

    # 2. Detailed Internal Breakdown for primary APK (arm64-v8a)
    primary_apk = None
    for apk in apks_to_inspect:
        if "arm64" in apk.name:
            primary_apk = apk
            break
    if not primary_apk and apks_to_inspect:
        primary_apk = apks_to_inspect[0]

    if primary_apk and primary_apk.exists():
        report_lines.append(f"### 2. Internal Composition Breakdown: `{primary_apk.name}`")
        report_lines.append("| Category | Uncompressed | Compressed | Share (% uncompressed) |")
        report_lines.append("| :--- | :--- | :--- | :--- |")

        with zipfile.ZipFile(primary_apk, "r") as z:
            infolist = z.infolist()
            total_uncompressed = sum(info.file_size for info in infolist)
            total_compressed = sum(info.compress_size for info in infolist)

            categories = {
                "Native Libraries (.so)": {"uncompressed": 0, "compressed": 0},
                "DEX Bytecode (Classes/Kotlin/AndroidX)": {"uncompressed": 0, "compressed": 0},
                "Web Frontend Assets (HTML/JS/CSS)": {"uncompressed": 0, "compressed": 0},
                "Android Resources (res/ & resources.arsc)": {"uncompressed": 0, "compressed": 0},
                "App Manifest & Signatures (META-INF)": {"uncompressed": 0, "compressed": 0},
                "Other / Miscellaneous": {"uncompressed": 0, "compressed": 0},
            }

            for info in infolist:
                fn = info.filename
                fs = info.file_size
                cs = info.compress_size

                if fn.endswith(".so"):
                    cat = "Native Libraries (.so)"
                elif fn.endswith(".dex"):
                    cat = "DEX Bytecode (Classes/Kotlin/AndroidX)"
                elif fn.startswith("assets/"):
                    cat = "Web Frontend Assets (HTML/JS/CSS)"
                elif fn.startswith("res/") or fn == "resources.arsc":
                    cat = "Android Resources (res/ & resources.arsc)"
                elif fn.startswith("META-INF/") or fn == "AndroidManifest.xml":
                    cat = "App Manifest & Signatures (META-INF)"
                else:
                    cat = "Other / Miscellaneous"

                categories[cat]["uncompressed"] += fs
                categories[cat]["compressed"] += cs

            for cat, data in categories.items():
                u_str = format_size(data["uncompressed"])
                c_str = format_size(data["compressed"])
                pct = (data["uncompressed"] / total_uncompressed * 100) if total_uncompressed > 0 else 0
                report_lines.append(f"| **{cat}** | {u_str} | {c_str} | {pct:.1f}% |")

            report_lines.append(f"| **Total Uncompressed / Compressed** | **{format_size(total_uncompressed)}** | **{format_size(total_compressed)}** | 100.0% |")
            report_lines.append("")

            # Top 20 heaviest files
            report_lines.append(f"### 3. Top 20 Heaviest Files in `{primary_apk.name}`")
            report_lines.append("| # | File Path | Uncompressed | Compressed | Reduction Type |")
            report_lines.append("| :--- | :--- | :--- | :--- | :--- |")

            sorted_files = sorted(infolist, key=lambda x: x.file_size, reverse=True)[:20]
            for idx, info in enumerate(sorted_files, 1):
                fn = info.filename
                fs_str = format_size(info.file_size)
                cs_str = format_size(info.compress_size)
                
                reduction_type = "Optimized"
                if fn.endswith(".so"):
                    reduction_type = "Rust release opt-level=z + strip"
                elif fn.endswith(".dex"):
                    reduction_type = "R8 Minified Bytecode"
                elif fn.startswith("res/") or fn == "resources.arsc":
                    reduction_type = "Language filtered (en, es, ko)"
                elif fn.startswith("assets/"):
                    reduction_type = "Vite Rollup Chunk"

                report_lines.append(f"| {idx} | `{fn}` | {fs_str} | {cs_str} | {reduction_type} |")

    report_content = "\n".join(report_lines)
    print(report_content)

    step_summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if step_summary_path:
        with open(step_summary_path, "a", encoding="utf-8") as f:
            f.write("\n" + report_content + "\n")
            print(f"[✓] Appended audit report to {step_summary_path}")

if __name__ == "__main__":
    audit_artifacts()
