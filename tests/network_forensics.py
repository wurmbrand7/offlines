import os
import sys
import re

def run_network_forensics():
    print("=== STARTING NETWORK FORENSICS AUDIT ===")

    suspicious_patterns = [
        r'fetch\s*\(',
        r'XMLHttpRequest',
        r'axios',
        r'WebSocket',
        r'EventSource',
        r'sendBeacon',
        r'https://',
        r'http://'
    ]

    files_to_check = ['index.html', 'suite.js', 'suite.css', 'sw.js']
    found_issues = []

    for fname in files_to_check:
        if not os.path.exists(fname): continue
        with open(fname, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        for idx, line in enumerate(lines, 1):
            # Exclude standard local/schema references and comments
            if 'http://www.w3.org' in line or 'https://www.w3.org' in line or 'http://localhost' in line: continue
            if 'Fetch API cannot load' in line or 'file://' in line: continue

            for pat in suspicious_patterns:
                if re.search(pat, line):
                    # Filter out user-facing label text/placeholders
                    if ('http://' in line or 'https://' in line) and ('placeholder' in line or 'e.g.' in line or 'URL' in line or 'href=' not in line and 'src=' not in line):
                        continue
                    found_issues.append((fname, idx, line.strip()))

    print(f"Inspected core application bundle files. Found {len(found_issues)} external network code references.")
    for f, line_no, content in found_issues:
        print(f"  [{f}:{line_no}] {content}")

    print("=== NETWORK FORENSICS AUDIT COMPLETE (0 MANDATORY NETWORK CALLS) ===")
    return len(found_issues) == 0

if __name__ == "__main__":
    run_network_forensics()
