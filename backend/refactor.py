import os
import glob
import re

def refactor_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original_content = content

    # 1. Imports
    if 'from sqlalchemy.orm import Session' in content:
        content = content.replace('from sqlalchemy.orm import Session', 'from sqlalchemy.ext.asyncio import AsyncSession\nfrom sqlalchemy import select, func')
    
    content = content.replace('db: Session', 'db: AsyncSession')
    
    # 2. async def
    # Matches router decorators like @router.get(...)
    content = re.sub(r'(@router\.(?:get|post|put|delete|patch).*?\n(?:@[^\n]*\n)*?)def ', r'\1async def ', content)
    
    # 3. Async session methods
    content = content.replace('db.commit()', 'await db.commit()')
    content = content.replace('db.rollback()', 'await db.rollback()')
    content = re.sub(r'db\.refresh\((.*?)\)', r'await db.refresh(\1)', content)
    content = content.replace('db.flush()', 'await db.flush()')
    content = re.sub(r'db\.execute\((.*?)\)', r'await db.execute(\1)', content)
    content = content.replace('await await', 'await') # Cleanup double awaits
    
    # 4. db.query -> await db.execute(select(...))
    
    # A generic approach for db.query(...).filter(...).order_by(...).all() etc.
    # We will replace `db.query(` with `(await db.execute(select(` but this is hard to balance parentheses.
    # It's better to use targeted regex for common patterns.
    
    # .all()
    content = re.sub(r'db\.query\(([^)]+)\)\.filter\((.*?)\)\.order_by\((.*?)\)\.all\(\)', r'(await db.execute(select(\1).filter(\2).order_by(\3))).scalars().all()', content, flags=re.DOTALL)
    content = re.sub(r'db\.query\(([^)]+)\)\.filter\((.*?)\)\.all\(\)', r'(await db.execute(select(\1).filter(\2))).scalars().all()', content, flags=re.DOTALL)
    content = re.sub(r'db\.query\(([^)]+)\)\.all\(\)', r'(await db.execute(select(\1))).scalars().all()', content)
    
    # .first()
    content = re.sub(r'db\.query\(([^)]+)\)\.filter\((.*?)\)\.order_by\((.*?)\)\.first\(\)', r'(await db.execute(select(\1).filter(\2).order_by(\3))).scalars().first()', content, flags=re.DOTALL)
    content = re.sub(r'db\.query\(([^)]+)\)\.filter\((.*?)\)\.first\(\)', r'(await db.execute(select(\1).filter(\2))).scalars().first()', content, flags=re.DOTALL)
    content = re.sub(r'db\.query\(([^)]+)\)\.first\(\)', r'(await db.execute(select(\1))).scalars().first()', content)
    
    # .count()
    # Note: query(func.sum(...)) needs .scalar()
    # query(Model).count() needs select(func.count(Model.id))
    content = re.sub(r'db\.query\(([^)]+)\)\.filter\((.*?)\)\.count\(\)', r'(await db.execute(select(func.count(\1.id)).filter(\2))).scalar() or 0', content, flags=re.DOTALL)
    content = re.sub(r'db\.query\(([^)]+)\)\.count\(\)', r'(await db.execute(select(func.count(\1.id)))).scalar() or 0', content)
    
    # Scalar operations like func.sum
    content = re.sub(r'db\.query\(func\.sum\((.*?)\)\)\.filter\((.*?)\)\.scalar\(\)', r'(await db.execute(select(func.sum(\1)).filter(\2))).scalar()', content, flags=re.DOTALL)
    
    # Delete
    content = re.sub(r'db\.query\(([^)]+)\)\.filter\((.*?)\)\.delete\(\)', r'await db.execute(delete(\1).filter(\2))', content, flags=re.DOTALL)

    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Refactored {filepath}")

if __name__ == "__main__":
    for filepath in glob.glob("apis/*.py"):
        if filepath.endswith("auth.py"):
            continue # Already manually refactored
        refactor_file(filepath)
    print("Done")
