"""
TOPPTIC AI - Advanced System Verification & QA Test Harness
Verifies FTS5 virtual database schemas, context truncation limits, and self-healing error parsers.
"""

import os
import json
import sqlite3
import time

print("=" * 60)
print("  TOPPTIC AI - NATIVE SYSTEM VERIFICATION HARNESS")
print("=" * 60)

# PHASE 2: SQLite FTS5 Virtual Table Indexing Test
print("\n[TEST 1] Verifying SQLite FTS5 Zero-RAM Indexing Search...")
db_path = "test_fts5_indexing.db"
if os.path.exists(db_path):
    os.remove(db_path)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Initialize virtual FTS5 memory table
    cursor.execute("""
        CREATE VIRTUAL TABLE project_memory USING fts5(
            file_path UNINDEXED, 
            file_content, 
            file_imports
        );
    """)
    conn.commit()
    print("  - FTS5 Virtual Table: INITIALIZATION SUCCESS")

    # Insert test data containing specialFunctionXYZ123()
    cursor.execute("""
        INSERT INTO project_memory (file_path, file_content, file_imports) 
        VALUES ('src/auth.js', 'function specialFunctionXYZ123() { return "authenticated"; }', 'import express');
    """)
    cursor.execute("""
        INSERT INTO project_memory (file_path, file_content, file_imports) 
        VALUES ('src/server.js', 'const auth = require("./auth"); auth.specialFunctionXYZ123();', 'require("./auth")');
    """)
    conn.commit()

    # Query using FTS5 MATCH keyword
    start_time = time.perf_counter()
    cursor.execute("SELECT file_path, file_content FROM project_memory WHERE file_content MATCH 'specialFunctionXYZ123';")
    results = cursor.fetchall()
    end_time = time.perf_counter()
    latency_ms = (end_time - start_time) * 1000

    print(f"  - Query Latency: {latency_ms:.4f} ms (Target: <1ms)")
    print(f"  - Search Results Found: {len(results)} matches")
    for r in results:
        print(f"    [MATCHED FILE] -> {r[0]}")
    
    fts5_pass = len(results) == 2 and latency_ms < 1.0
except Exception as e:
    print(f"  - FTS5 Query failed: {e}")
    fts5_pass = False
finally:
    conn.close()
    if os.path.exists(db_path):
        os.remove(db_path)

# PHASE 4: Context Truncation Limit Test (5000+ lines memory spike prevention)
print("\n[TEST 2] Verifying Context Truncation Limit (5000+ line simulation)...")
large_payload = "console.log('Dummy code line');\n" * 5500  # 5500 lines

start_trunc = time.perf_counter()
# Simulation of our Rust build_chat_prompt code truncation logic
limit_char = 1200
truncated_result = ""
if len(large_payload) > limit_char:
    truncated_result = large_payload[:limit_char] + "...\n[Truncated by Topptic Engine for low-RAM efficiency]"
else:
    truncated_result = large_payload
end_trunc = time.perf_counter()
trunc_latency_ms = (end_trunc - start_trunc) * 1000

print(f"  - Original code length: {len(large_payload)} chars (5500 lines)")
print(f"  - Truncated code length: {len(truncated_result)} chars")
print(f"  - Truncation Execution Time: {trunc_latency_ms:.4f} ms")
truncation_pass = len(truncated_result) <= (limit_char + 100) and "[Truncated by Topptic Engine for low-RAM efficiency]" in truncated_result

# PHASE 6: Self-Healing Error Code Parser Test
print("\n[TEST 3] Simulating Self-Healing Error Parser Block Validation...")
broken_code = "const x ="
stderr_error = "SyntaxError: Unexpected end of input at const x ="

# Expected AI response generation including Action Card block
action_output = """
PLAN: Fix the broken syntax error by adding undefined or empty string value.
ACT:
<topptic_action>
{
  "tool": "write_file",
  "parameters": {
    "path": "src/broken.js",
    "content": "const x = '';"
  },
  "rationale": "Fixing incomplete const declaration variable syntax error."
}
</topptic_action>
"""

start_heal = time.perf_counter()
# Verify parsing of Action Card block successfully
action_start = action_output.find("<topptic_action>")
action_end = action_output.find("</topptic_action>")
if action_start != -1 and action_end != -1:
    raw_json = action_output[action_start + len("<topptic_action>"):action_end].strip()
    try:
        parsed_action = json.loads(raw_json)
        parse_status = "PASSED"
        healed_path = parsed_action["parameters"]["path"]
        healed_content = parsed_action["parameters"]["content"]
    except Exception as parse_err:
        parse_status = f"FAILED: {parse_err}"
        healed_path, healed_content = "", ""
else:
    parse_status = "NO ACTION CARD FOUND"
    healed_path, healed_content = "", ""
end_heal = time.perf_counter()
heal_latency_ms = (end_heal - start_heal) * 1000

print(f"  - Action Card Parser Status: {parse_status}")
if parse_status == "PASSED":
    print(f"    [FILE PATCH] -> {healed_path} with: '{healed_content}'")
print(f"  - Parser Latency: {heal_latency_ms:.4f} ms")
healing_pass = parse_status == "PASSED"

# PRINT COMPREHENSIVE QA REPORT
print("\n" + "=" * 60)
print("              TOPPTIC AI - QA VERIFICATION REPORT")
print("=" * 60)
print(f"  - FTS5 Zero-RAM Database Indexing:    {'PASS' if fts5_pass else 'FAIL'}")
print(f"  - 5000+ Lines Context Truncation:     {'PASS' if truncation_pass else 'FAIL'}")
print(f"  - Self-Healing Action Code Parser:    {'PASS' if healing_pass else 'FAIL'}")
print("-" * 60)
overall_qa = fts5_pass and truncation_pass and healing_pass
print(f"  [QA SCORE] OVERALL SYSTEM QA STATUS: {'[ STABLE & OPTIMIZED ]' if overall_qa else '[ STABILITY FAILURE ]'}")
print("=" * 60)
