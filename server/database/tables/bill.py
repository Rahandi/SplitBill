from database.entities import BillEntity

from database import Database


class BillsTable:
  def __init__(self):
    self.db = Database().get_db()
    self.cursor = self.db.cursor()

  def _row_to_entity(self, row):
    return BillEntity(id=row[0], name=row[1], total=row[2], payer_id=row[3], settled=row[4], group_id=row[5])

  def all(self):
    self.cursor.execute("SELECT id, name, total, payer_id, settled, group_id FROM bills")
    return [self._row_to_entity(r) for r in self.cursor.fetchall()]

  def get_by_id(self, id):
    self.cursor.execute("SELECT id, name, total, payer_id, settled, group_id FROM bills WHERE id = %s", (id,))
    result = self.cursor.fetchone()
    return self._row_to_entity(result) if result else None

  def get_unsettled(self, group_id=None):
    if group_id is not None:
      self.cursor.execute(
        "SELECT id, name, total, payer_id, settled, group_id FROM bills WHERE settled = %s AND group_id = %s",
        (False, group_id)
      )
    else:
      self.cursor.execute(
        "SELECT id, name, total, payer_id, settled, group_id FROM bills WHERE settled = %s",
        (False,)
      )
    return [self._row_to_entity(r) for r in self.cursor.fetchall()]

  def get_settled(self, group_id=None):
    if group_id is not None:
      self.cursor.execute(
        "SELECT id, name, total, payer_id, settled, group_id FROM bills WHERE settled = %s AND group_id = %s",
        (True, group_id)
      )
    else:
      self.cursor.execute(
        "SELECT id, name, total, payer_id, settled, group_id FROM bills WHERE settled = %s",
        (True,)
      )
    return [self._row_to_entity(r) for r in self.cursor.fetchall()]

  def count(self):
    self.cursor.execute("SELECT COUNT(*) FROM bills")
    return self.cursor.fetchone()[0]

  def create(self, name, total, payer_id, group_id=None):
    self.cursor.execute(
      "INSERT INTO bills (name, total, payer_id, settled, group_id) VALUES (%s, %s, %s, %s, %s)",
      (name, total, payer_id, False, group_id)
    )
    self.db.commit()
    return self.get_by_id(self.cursor.lastrowid)

  def update(self, bill: BillEntity):
    self.cursor.execute(
      "UPDATE bills SET name = %s, total = %s, payer_id = %s, settled = %s WHERE id = %s",
      (bill.name, bill.total, bill.payer_id, bill.settled, bill.id)
    )
    self.db.commit()

  def delete(self, id):
    self.cursor.execute("DELETE FROM bills WHERE id = %s", (id,))
    self.db.commit()
