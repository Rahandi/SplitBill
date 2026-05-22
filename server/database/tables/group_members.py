from database import Database


class GroupMembersTable:
  def __init__(self):
    self.db = Database().get_db()
    self.cursor = self.db.cursor()

  def get_by_group_id(self, group_id):
    self.cursor.execute(
      "SELECT name FROM group_members WHERE group_id = %s ORDER BY name ASC",
      (group_id,)
    )
    return [row[0] for row in self.cursor.fetchall()]

  def add(self, group_id, name):
    try:
      self.cursor.execute(
        "INSERT INTO group_members (group_id, name) VALUES (%s, %s)",
        (group_id, name.lower())
      )
      self.db.commit()
      return True
    except Exception:
      return False

  def remove(self, group_id, name):
    self.cursor.execute(
      "DELETE FROM group_members WHERE group_id = %s AND name = %s",
      (group_id, name.lower())
    )
    self.db.commit()
    return self.cursor.rowcount > 0
