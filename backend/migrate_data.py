#!/usr/bin/env python3
"""
数据迁移脚本 - 从备份数据库恢复文章数据
"""
import sqlite3
import os

def migrate_posts():
    """迁移文章数据"""
    db_path = 'blog.db'
    backup_path = 'blog.db.backup'
    
    if not os.path.exists(backup_path):
        print("备份文件不存在")
        return
    
    # 连接两个数据库
    conn_new = sqlite3.connect(db_path)
    conn_old = sqlite3.connect(backup_path)
    
    cursor_new = conn_new.cursor()
    cursor_old = conn_old.cursor()
    
    # 检查旧表结构
    cursor_old.execute("PRAGMA table_info(posts)")
    old_columns = [col[1] for col in cursor_old.fetchall()]
    print(f"旧表字段: {old_columns}")
    
    # 获取所有文章
    cursor_old.execute("SELECT * FROM posts")
    posts = cursor_old.fetchall()
    print(f"找到 {len(posts)} 篇文章")
    
    # 清空新表并重新插入
    cursor_new.execute("DELETE FROM posts")
    
    for post in posts:
        # post: (id, title, content, summary, cover_image, is_published, is_draft, view_count, created_at, updated_at, category_id)
        cursor_new.execute("""
            INSERT INTO posts (id, title, content, summary, cover_image, is_published, is_draft, view_count, created_at, updated_at, category_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, post)
        print(f"  已恢复: {post[1][:30]}...")
    
    conn_new.commit()
    conn_new.close()
    conn_old.close()
    
    print(f"\n✅ 成功恢复 {len(posts)} 篇文章")

if __name__ == '__main__':
    migrate_posts()
