from database.entities import ItemEntity

from database import Database


class ItemsTable:
  def __init__(self):
    self.db = Database().get_db()
    self.cursor = self.db.cursor()

  def all(self):
    self.cursor.execute("SELECT id, bill_id, name, price FROM items")
    results = self.cursor.fetchall()
    items = []
    for row in results:
      items.append(ItemEntity(id=row[0], bill_id=row[1], name=row[2], price=row[3]))
    return items

  def get_by_id(self, id):
    self.cursor.execute("SELECT id, bill_id, name, price FROM items WHERE id = %s", (id,))
    result = self.cursor.fetchone()
    if result:
      return ItemEntity(id=result[0], bill_id=result[1], name=result[2], price=result[3])
    return None

  def get_by_bill_id(self, bill_id):
    self.cursor.execute("SELECT id, bill_id, name, price FROM items WHERE bill_id = %s", (bill_id,))
    results = self.cursor.fetchall()
    items = []
    for row in results:
      items.append(ItemEntity(id=row[0], bill_id=row[1], name=row[2], price=row[3]))
    return items

  def create(self, bill_id, name, price):
    self.cursor.execute(
      "INSERT INTO items (bill_id, name, price) VALUES (%s, %s, %s)",
      (bill_id, name, price)
    )
    self.db.commit()
    return self.get_by_id(self.cursor.lastrowid)

  def update(self, item: ItemEntity):
    self.cursor.execute(
      "UPDATE items SET bill_id = %s, name = %s, price = %s WHERE id = %s",
      (item.bill_id, item.name, item.price, item.id)
    )
    self.db.commit()

  def delete(self, id):
    self.cursor.execute("DELETE FROM items WHERE id = %s", (id,))
    self.db.commit()