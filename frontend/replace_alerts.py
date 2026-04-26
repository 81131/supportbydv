import os
import re

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip files that don't have 'alert('
    if 'alert(' not in content:
        return

    # Replace alert(...) with toast.success(...) or toast.error(...)
    # We will use a regex to capture the argument inside alert(...)
    # This is a bit tricky for multi-line or nested parentheses, but for this codebase it's mostly simple strings.
    def repl(m):
        arg = m.group(1)
        # If the argument contains the word "success", make it toast.success
        if 'success' in arg.lower() or 'copied' in arg.lower() or 'added' in arg.lower():
            return f"toast.success({arg})"
        else:
            return f"toast.error({arg})"
            
    new_content = re.sub(r'alert\((.*?)\)', repl, content, flags=re.DOTALL)
    
    # If we made changes and we don't have the import
    if new_content != content and "from 'react-hot-toast'" not in new_content:
        # insert import at top
        new_content = "import toast from 'react-hot-toast';\n" + new_content
        
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file_path}")

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            # App.tsx is already done
            if file == 'App.tsx':
                continue
            process_file(os.path.join(root, file))
