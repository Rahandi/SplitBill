import json
from database import Database

class ItemEntity:
  id: int
  bill_id: int
  name: str
  price: int
  
  def __init__(self, id, bill_id, name, price):
    self.id = id
    self.bill_id = bill_id
    self.name = name
    self.price = price

  def get_participant_ids(self):
    db = Database().get_db()
    cursor = db.cursor()
    cursor.execute(
      "SELECT person_id FROM item_person WHERE item_id = %s",
      (self.id,)
    )
    results = cursor.fetchall()
    return [row[0] for row in results]

  def add_participant(self, person_id):
    db = Database().get_db()
    cursor = db.cursor()
    cursor.execute(
      "INSERT INTO item_person (item_id, person_id) VALUES (%s, %s)",
      (self.id, person_id)
    )
    db.commit()

  def remove_participant(self, person_id):
    db = Database().get_db()
    cursor = db.cursor()
    cursor.execute(
      "DELETE FROM item_person WHERE item_id = %s AND person_id = %s",
      (self.id, person_id)
    )
    db.commit()

  def to_dict(self):
    return {
      "id": self.id,
      "bill_id": self.bill_id,
      "name": self.name,
      "price": self.price
    }

  def __str__(self):
    return json.dumps(self.to_dict())