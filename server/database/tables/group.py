from database.entities import GroupEntity
from database import Database


class GroupsTable:
  def __init__(self):
    self.db = Database().get_db()
    self.cursor = self.db.cursor()

  def get_by_code(self, join_code):
    self.cursor.execute(
      "SELECT id, name, join_code, passcode_hash FROM `groups` WHERE join_code = %s",
      (join_code,)
    )
    result = self.cursor.fetchone()
    if result:
      return GroupEntity(id=result[0], name=result[1], join_code=result[2], passcode_hash=result[3])
    return None

  def count(self):
    self.cursor.execute("SELECT COUNT(*) FROM `groups`")
    return self.cursor.fetchone()[0]

  def create(self, name, join_code, passcode_hash=None):
    self.cursor.execute(
      "INSERT INTO `groups` (name, join_code, passcode_hash) VALUES (%s, %s, %s)",
      (name, join_code, passcode_hash)
    )
    self.db.commit()
    return self.get_by_code(join_code)
