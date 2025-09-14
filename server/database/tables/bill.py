from database.entities import BillEntity

from database import Database


class BillsTable:
  def __init__(self):
    self.db = Database().get_db()
    self.cursor = self.db.cursor()

  def all(self):
    self.cursor.execute("SELECT id, name, total, payer_id, settled FROM bills")
    results = self.cursor.fetchall()
    bills = []
    for row in results:
      bills.append(BillEntity(id=row[0], name=row[1], total=row[2], payer_id=row[3], settled=row[4]))
    return bills

  def get_by_id(self, id):
    self.cursor.execute("SELECT id, name, total, payer_id, settled FROM bills WHERE id = %s", (id,))
    result = self.cursor.fetchone()
    if result:
      return BillEntity(id=result[0], name=result[1], total=result[2], payer_id=result[3], settled=result[4])
    return None

  def get_unsettled(self):
    self.cursor.execute("SELECT id, name, total, payer_id, settled FROM bills WHERE settled = %s", (False,))
    results = self.cursor.fetchall()
    bills = []
    for row in results:
      bills.append(BillEntity(id=row[0], name=row[1], total=row[2], payer_id=row[3], settled=row[4]))
    return bills

  def create(self, name, total, payer_id):
    self.cursor.execute(
      "INSERT INTO bills (name, total, payer_id, settled) VALUES (%s, %s, %s, %s)",
      (name, total, payer_id, False)
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