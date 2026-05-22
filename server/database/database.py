import os

import mysql.connector


class Database:
  _instance = None

  def __new__(cls):
    if cls._instance is None:
      cls._instance = super().__new__(cls)
      cls._instance.db = mysql.connector.connect(
        host=os.getenv("DB_HOST", "0.0.0.0"),
        user=os.getenv("DB_USER", "splitbill"),
        password=os.getenv("DB_PASSWORD", "splitbill"),
        database=os.getenv("DB_NAME", "splitbill")
      )
      cls._migrate(cls._instance.db)
    return cls._instance

  @staticmethod
  def _migrate(db):
    cursor = db.cursor()
    cursor.execute("""
      CREATE TABLE IF NOT EXISTS `groups` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        join_code VARCHAR(16) NOT NULL UNIQUE,
        passcode_hash VARCHAR(64) NULL
      )
    """)
    try:
      cursor.execute("ALTER TABLE bills ADD COLUMN group_id INT NULL")
    except Exception:
      pass  # Column already exists from a prior migration
    cursor.execute("""
      CREATE TABLE IF NOT EXISTS group_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        UNIQUE KEY uq_group_member (group_id, name)
      )
    """)
    db.commit()
    cursor.close()

  def get_db(self):
    try:
      self.db.ping(reconnect=True, attempts=3, delay=1)
    except Exception:
      self.db = mysql.connector.connect(
        host=os.getenv("DB_HOST", "0.0.0.0"),
        user=os.getenv("DB_USER", "splitbill"),
        password=os.getenv("DB_PASSWORD", "splitbill"),
        database=os.getenv("DB_NAME", "splitbill")
      )
    return self.db
