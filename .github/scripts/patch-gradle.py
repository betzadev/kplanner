#!/usr/bin/env python3
"""
patch-gradle.py
Applies size optimizations and ProGuard configuration to Tauri Android Gradle project.
"""

import os
import shutil
from pathlib import Path

def patch_build_gradle():
    gradle_file = Path("src-tauri/gen/android/app/build.gradle.kts")
    if not gradle_file.exists():
        print(f"[!] Warning: {gradle_file} not found. Skipping gradle patch.")
        return False

    content = gradle_file.read_text(encoding="utf-8")

    # 1. Filter resource languages to reduce resources.arsc size
    if "resourceConfigurations" not in content:
        target_marker = 'versionName = "0.1.0"'
        if target_marker in content:
            replacement = 'versionName = "0.1.0"\n        resourceConfigurations += listOf("en", "es", "ko")'
            content = content.replace(target_marker, replacement, 1)
            print("[✓] Injected resourceConfigurations (en, es, ko) into defaultConfig.")
        else:
            print("[!] Could not locate versionName marker for resourceConfigurations.")

    # 2. Inject R8 Minification, Resource Shrinking, and Debug Signing Config for release
    if 'signingConfigs.getByName("debug")' not in content:
        release_marker = 'getByName("release") {'
        optimized_release_block = """getByName("release") {
            signingConfig = signingConfigs.getByName("debug")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )"""
        if release_marker in content:
            content = content.replace(release_marker, optimized_release_block, 1)
            print("[✓] Injected R8 minify, shrinkResources, and signingConfig into release buildType.")
        else:
            print("[!] Could not locate getByName(\"release\") block.")

    gradle_file.write_text(content, encoding="utf-8")
    print("[✓] Successfully wrote optimized build.gradle.kts.")
    return True

def install_proguard_rules():
    src_rules = Path("src-tauri/proguard-rules.pro")
    dest_dir = Path("src-tauri/gen/android/app")
    dest_rules = dest_dir / "proguard-rules.pro"

    if src_rules.exists() and dest_dir.exists():
        shutil.copy2(src_rules, dest_rules)
        print(f"[✓] Installed ProGuard rules from {src_rules} to {dest_rules}.")
    else:
        print(f"[!] Warning: Either {src_rules} or {dest_dir} does not exist.")

def clean_legacy_densities():
    res_dir = Path("src-tauri/gen/android/app/src/main/res")
    if not res_dir.exists():
        return

    legacy_folders = ["mipmap-ldpi", "mipmap-tvdpi"]
    for folder in legacy_folders:
        target = res_dir / folder
        if target.exists() and target.is_dir():
            shutil.rmtree(target)
            print(f"[✓] Removed legacy icon density folder: {target}")

if __name__ == "__main__":
    print("=== Optimizing Android Project for Minimum Artifact Size ===")
    patch_build_gradle()
    install_proguard_rules()
    clean_legacy_densities()
    print("=== Optimization Patching Complete ===")
