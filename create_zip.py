import zipfile, os

# === EDIT THIS PATH to match your project location ===
src = r'C:\Users\Nathanim\Documents\gebeya'
zip_path = r'C:\Users\Nathanim\Documents\gebeya\erq-project.zip'

exclude_dirs = {'node_modules', 'client/node_modules', '.git', 'server/generated-projects', 'client/dist'}
exclude_exts = {'.log', '.db', '.db-shm', '.db-wal', '.pid'}
exclude_files = {'.env', '.env.production'}

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(src):
        rel_root = os.path.relpath(root, src)
        if rel_root == '.':
            rel_root = ''
        
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in exclude_dirs and 
                   not any(rel_root.startswith(ex) for ex in exclude_dirs)]
        
        for file in files:
            if any(file.endswith(ext) for ext in exclude_exts):
                continue
            if file in exclude_files:
                continue
            file_path = os.path.join(root, file)
            arcname = os.path.join(os.path.basename(src), rel_root, file) if rel_root else os.path.join(os.path.basename(src), file)
            zf.write(file_path, arcname)

size = os.path.getsize(zip_path)
print(f'✅ Zip created: {zip_path}')
print(f'   Size: {size / 1024 / 1024:.1f} MB')
print(f'   Ready to copy to your Ubuntu server!')
