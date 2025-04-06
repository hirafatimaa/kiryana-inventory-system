"""
PostgreSQL User Check Tool
"""
import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_postgres_users():
    """Check PostgreSQL users and their privileges"""
    try:
        # Connect as postgres user
        conn = psycopg2.connect(
            host="localhost",
            port="5432",
            database="postgres",  # Default database
            user="postgres",      # Default admin user
            password="CHERRY718"  # Your postgres password
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("Successfully connected as postgres user")
        
        # Check all users
        print("\nListing all PostgreSQL users:")
        cursor.execute("SELECT usename, usecreatedb, usesuper FROM pg_catalog.pg_user")
        users = cursor.fetchall()
        
        print("Username | Can Create DB | Is Superuser")
        print("-" * 40)
        for user in users:
            print(f"{user[0]} | {user[1]} | {user[2]}")
            
        # Check if kiryana_user exists
        cursor.execute("SELECT 1 FROM pg_catalog.pg_user WHERE usename = 'kiryana_user'")
        user_exists = cursor.fetchone()
        
        if not user_exists:
            print("\nkiryana_user does not exist. Creating now...")
            cursor.execute("CREATE USER kiryana_user WITH PASSWORD 'CHERRY718'")
            cursor.execute("ALTER USER kiryana_user CREATEDB")
            print("Created kiryana_user with password CHERRY718 and CREATEDB permission")
        else:
            print("\nkiryana_user already exists. Updating password...")
            cursor.execute("ALTER USER kiryana_user WITH PASSWORD 'CHERRY718'")
            print("Updated kiryana_user password to CHERRY718")
        
        # Check databases
        print("\nListing all databases:")
        cursor.execute("SELECT datname FROM pg_database WHERE datistemplate = false")
        databases = cursor.fetchall()
        for db in databases:
            print(f"- {db[0]}")
        
        # Check if kiryana_db exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = 'kiryana_db'")
        db_exists = cursor.fetchone()
        
        if not db_exists:
            print("\nkiryana_db does not exist. Creating now...")
            cursor.execute("CREATE DATABASE kiryana_db")
            print("Created kiryana_db database")
        
        # Grant privileges
        print("\nGranting privileges to kiryana_user on kiryana_db...")
        cursor.execute("GRANT ALL PRIVILEGES ON DATABASE kiryana_db TO kiryana_user")
        
        # Connect to kiryana_db to grant schema privileges
        cursor.close()
        conn.close()
        
        conn = psycopg2.connect(
            host="localhost",
            port="5432",
            database="kiryana_db",
            user="postgres",
            password="CHERRY718"
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Grant schema privileges
        cursor.execute("GRANT ALL ON SCHEMA public TO kiryana_user")
        print("Granted schema privileges to kiryana_user")
        
        # Test connection as kiryana_user
        cursor.close()
        conn.close()
        
        # Test connecting as kiryana_user
        try:
            test_conn = psycopg2.connect(
                host="localhost",
                port="5432",
                database="kiryana_db",
                user="kiryana_user",
                password="CHERRY718"
            )
            test_cursor = test_conn.cursor()
            test_cursor.execute("SELECT 1")
            test_cursor.close()
            test_conn.close()
            print("\nSuccessfully connected as kiryana_user to kiryana_db!")
            print("\nYour working DATABASE_URL is:")
            print("postgresql://kiryana_user:CHERRY718@localhost:5432/kiryana_db")
        except Exception as e:
            print(f"\nError connecting as kiryana_user: {e}")
            print("\nFallback to using postgres user:")
            print("postgresql://postgres:CHERRY718@localhost:5432/kiryana_db")
        
        return True
        
    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == "__main__":
    print("Checking PostgreSQL users and privileges...")
    check_postgres_users()