import os
import tarfile
from pydrive2.auth import GoogleAuth
from pydrive2.drive import GoogleDrive

# Initialize Google Drive authentication
def authenticate_gdrive():
    gauth = GoogleAuth()
    # Tries to load saved client credentials
    gauth.LoadCredentialsFile("mycreds.txt")
    if gauth.credentials is None:
        # Authenticate if they're not there
        gauth.LocalWebserverAuth()
    elif gauth.access_token_expired:
        # Refresh them if expired
        gauth.Refresh()
    else:
        # Initialize the saved creds
        gauth.Authorize()
    # Save the current credentials to a file
    gauth.SaveCredentialsFile("mycreds.txt")
    return GoogleDrive(gauth)

def compress_directory(dir_path, output_filename):
    print(f"Compressing {dir_path} to {output_filename}...")
    with tarfile.open(output_filename, "w:gz") as tar:
        tar.add(dir_path, arcname=os.path.basename(dir_path))
    print("Compression complete.")

def upload_file_to_drive(drive, file_path, folder_id=None):
    print(f"Uploading {file_path} to Google Drive...")
    file_metadata = {'title': os.path.basename(file_path)}
    if folder_id:
        file_metadata['parents'] = [{'id': folder_id}]
        
    f = drive.CreateFile(file_metadata)
    f.SetContentFile(file_path)
    f.Upload()
    print(f"Uploaded successfully. File ID: {f['id']}")
    return f['id']

def download_file_from_drive(drive, file_id, dest_path):
    print(f"Downloading file ID {file_id} to {dest_path}...")
    f = drive.CreateFile({'id': file_id})
    f.GetContentFile(dest_path)
    print("Download complete.")

if __name__ == "__main__":
    drive = authenticate_gdrive()
    
    # Example usage:
    # 1. Compress processed data
    data_dir = "../data/processed"
    archive_name = "processed_data.tar.gz"
    if os.path.exists(data_dir):
        compress_directory(data_dir, archive_name)
        # 2. Upload to Drive (Replace folder_id with your actual Drive folder ID)
        # upload_file_to_drive(drive, archive_name, folder_id="YOUR_FOLDER_ID")
