# test_csv.py
import csv
from pathlib import Path

def test_csv_parsing():
    csv_path = Path(__file__).parent / "app" / "core" / "pw.csv"
    print(f"CSV path: {csv_path}")
    print(f"Exists: {csv_path.exists()}")
    
    if csv_path.exists():
        with open(csv_path, 'r', encoding='utf-8') as file:
            content = file.read()
            print("File content:")
            print(content)
            
            file.seek(0)
            # Try different delimiters
            for delimiter in ['\t', ',']:
                file.seek(0)
                try:
                    reader = csv.DictReader(file, delimiter=delimiter)
                    rows = list(reader)
                    print(f"\nWith delimiter '{delimiter}':")
                    print(f"Headers: {reader.fieldnames}")
                    for i, row in enumerate(rows):
                        print(f"Row {i}: {row}")
                except Exception as e:
                    print(f"Error with delimiter '{delimiter}': {e}")

if __name__ == "__main__":
    test_csv_parsing()