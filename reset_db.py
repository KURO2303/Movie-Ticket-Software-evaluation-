import os
import glob

def reset_db():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    # Search for all .db files inside src/**/db/
    pattern = os.path.join(base_dir, "src", "**", "db", "*.db")
    
    print(f"Searching for databases in: {pattern}")
    files = glob.glob(pattern, recursive=True)
    
    if not files:
        print("No database files found.")
        return

    for f in files:
        try:
            os.remove(f)
            print(f"Deleted: {f}")
        except Exception as e:
            print(f"Error deleting {f}: {e}")
            print("  (Hint: Stop the docker containers first if files are locked)")

    print("\nReset complete. Run 'python seed_db.py' to re-initialize.")

if __name__ == "__main__":
    reset_db()