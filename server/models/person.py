from database import Database


class Person:
  name: str
  bank_account: str

  def __init__(self, name, bank_account=None):
    self.db = Database().get_db()
    self.cursor = self.db.cursor()
    self.name = name
    self.bank_account = bank_account
    self.__get()

  def __get(self):
    self.cursor.execute("SELECT name, bank_account FROM persons WHERE name=%s", (self.name,))
    result = self.cursor.fetchone()
    if result:
      self.name, self.bank_account = result
      return True
    return False

  def save(self):
    self.cursor.execute(
      "INSERT INTO persons (name, bank_account) VALUES (%s, %s) ON DUPLICATE KEY UPDATE bank_account=%s",
      (self.name, self.bank_account, self.bank_account)
    )
    self.db.commit()
    self.__get()

  def delete(self):
    self.cursor.execute("DELETE FROM persons WHERE name=%s", (self.name,))
    self.db.commit()
    return self.cursor.rowcount > 0