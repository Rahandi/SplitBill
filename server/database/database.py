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
      CREATE TABLE IF NOT EXISTS persons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        bank_account VARCHAR(255) NULL
      )
    """)
    cursor.execute("""
      CREATE TABLE IF NOT EXISTS `groups` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        join_code VARCHAR(16) NOT NULL UNIQUE,
        passcode_hash VARCHAR(64) NULL
      )
    """)
    cursor.execute("""
      CREATE TABLE IF NOT EXISTS bills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        total INT NOT NULL,
        payer_id INT NOT NULL,
        settled BOOLEAN NOT NULL DEFAULT FALSE,
        group_id INT NULL
      )
    """)
    cursor.execute("""
      CREATE TABLE IF NOT EXISTS items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bill_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        price INT NOT NULL
      )
    """)
    cursor.execute("""
      CREATE TABLE IF NOT EXISTS item_person (
        item_id INT NOT NULL,
        person_id INT NOT NULL,
        PRIMARY KEY (item_id, person_id)
      )
    """)
    cursor.execute("""
      CREATE TABLE IF NOT EXISTS group_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        UNIQUE KEY uq_group_member (group_id, name)
      )
    """)
    try:
      cursor.execute("ALTER TABLE bills ADD COLUMN group_id INT NULL")
    except Exception:
      pass  # Column already exists
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
