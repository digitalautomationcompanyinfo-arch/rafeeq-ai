import pandas as pd
import os
import json
from sklearn.model_selection import train_test_split

def prepare_data(input_file, output_dir):
    """
    Reads raw data, cleans it, removes duplicates, unifies format, 
    and splits into train, validation, and test sets.
    """
    print(f"Loading raw data from {input_file}...")
    
    # Assuming JSONL format for raw data (prompt, completion)
    # If it's CSV, use pd.read_csv
    if input_file.endswith('.jsonl'):
        df = pd.read_json(input_file, lines=True)
    elif input_file.endswith('.csv'):
        df = pd.read_csv(input_file)
    else:
        raise ValueError("Unsupported file format. Please use CSV or JSONL.")

    initial_len = len(df)
    
    # 1. Remove duplicates
    df = df.drop_duplicates(subset=['prompt', 'completion'])
    print(f"Removed {initial_len - len(df)} duplicate rows.")
    
    # 2. Clean data (basic example: dropna)
    df = df.dropna(subset=['prompt', 'completion'])
    
    # 3. Format unified (ensure string type)
    df['prompt'] = df['prompt'].astype(str).str.strip()
    df['completion'] = df['completion'].astype(str).str.strip()
    
    # Remove empty prompts or completions
    df = df[(df['prompt'] != "") & (df['completion'] != "")]
    
    print(f"Total valid samples after cleaning: {len(df)}")
    
    # 4. Split data (80% Train, 10% Val, 10% Test)
    # Using small subset for MVP testing as requested (e.g., sample 1000 items if dataset is large)
    if len(df) > 1000:
        print("Sampling 1000 items for the MVP baseline...")
        df = df.sample(n=1000, random_state=42)

    train_df, temp_df = train_test_split(df, test_size=0.2, random_state=42)
    val_df, test_df = train_test_split(temp_df, test_size=0.5, random_state=42)
    
    print(f"Split sizes -> Train: {len(train_df)}, Val: {len(val_df)}, Test: {len(test_df)}")
    
    # 5. Save processed data
    os.makedirs(output_dir, exist_ok=True)
    
    train_file = os.path.join(output_dir, "train.jsonl")
    val_file = os.path.join(output_dir, "val.jsonl")
    test_file = os.path.join(output_dir, "test.jsonl")
    
    train_df.to_json(train_file, orient='records', lines=True, force_ascii=False)
    val_df.to_json(val_file, orient='records', lines=True, force_ascii=False)
    test_df.to_json(test_file, orient='records', lines=True, force_ascii=False)
    
    print(f"Saved processed data to {output_dir}")

if __name__ == "__main__":
    raw_file = "../data/raw/dataset.jsonl" # Replace with your actual raw data file
    processed_dir = "../data/processed"
    
    # Create dummy data for testing the pipeline if file doesn't exist
    if not os.path.exists(raw_file):
        print(f"Raw data file {raw_file} not found. Creating a dummy dataset for MVP...")
        os.makedirs(os.path.dirname(raw_file), exist_ok=True)
        dummy_data = [{"prompt": f"سؤال {i}", "completion": f"جواب {i}"} for i in range(1200)]
        pd.DataFrame(dummy_data).to_json(raw_file, orient='records', lines=True, force_ascii=False)
        
    prepare_data(raw_file, processed_dir)
