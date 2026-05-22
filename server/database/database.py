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
    cursor.execute("""
      SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'bills'
        AND COLUMN_NAME = 'group_id'
    """)
    if cursor.fetchone()[0] == 0:
      cursor.execute("ALTER TABLE bills ADD COLUMN group_id INT NULL")
    db.commit()
    cursor.close()

  def get_db(self):
    return self.db
