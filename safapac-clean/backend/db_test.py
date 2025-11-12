import psycopg2
import socket
import os

# --- UPDATE THESE WITH YOUR ACTUAL RDS CREDENTIALS ---
# NOTE: Using an IP address bypasses DNS issues, but if the IP is correct,
# the failure is almost certainly a Security Group/NACL block.
DB_HOST = "safapac-instance-dev-only.coh4oqko8ir5.us-east-1.rds.amazonaws.com"
DB_PORT = "5432"
DB_NAME = "safapac_db"
DB_USER = "postgres"
DB_PASSWORD = "Safapac2025" 

print(f"Attempting connection diagnostic for: {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
print("-" * 50)

# 1. Connectivity Check (Socket Test)
print(f"1. Pinging DB Host and Port ({DB_HOST}:{DB_PORT})...")
try:
    s = socket.create_connection((DB_HOST, int(DB_PORT)), timeout=5)
    s.close()
    print("   ✅ SUCCESS: TCP connection to port 5432 successful. Network path is OPEN.")
    print("   -> The issue is likely a PostgreSQL configuration issue (e.g., `pg_hba.conf`) or incorrect credentials/database name.")
except socket.timeout:
    print("   ❌ FAILURE: Connection timed out.")
    print("   -> The host exists, but the **Security Group** or **NACL** is blocking traffic to port 5432. Check Ingress/Egress rules.")
except socket.error as e:
    print(f"   ❌ FAILURE: Socket error: {e}")
    print("   -> Host is unreachable or firewall is blocking traffic. Check **Public Accessibility** and **Security Group/NACL**.")
print("-" * 50)


# 2. Database Connection Test (psycopg2)
print("2. Attempting Database Login and Connection...")
try:
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        connect_timeout=10
    )
    conn.close()
    print("\n\n✅ FINAL SUCCESS: Database connection established and closed correctly!")

except psycopg2.OperationalError as e:
    print(f"\n\n❌ FINAL FAILURE: Database connection failed.")
    print(f"   Error: {e}")
    
    # Check for specific common RDS errors
    if "fe_sendauth: no password supplied" in str(e):
        print("   -> Check: This specific error means your `pg_hba.conf` is using `trust` and not `md5` or `scram-sha-256`, or a similar auth mismatch. Usually not the case for RDS.")
    elif "could not translate host name" in str(e):
        print("   -> Check: DNS resolution failed. Use the IP or verify your network's DNS settings.")
    else:
        print("   -> Check: The most common remaining causes are **incorrect password/user**, **incorrect database name**, or a final **Security Group/NACL** blockage preventing the full handshake.")

except Exception as e:
    print(f"\n\n🚨 UNEXPECTED ERROR: {e}")