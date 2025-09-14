from database.entities import PersonEntity

from database import Database


class PersonsTable:
  def __init__(self):
    self.db = Database().get_db()
    self.cursor = self.db.cursor()

  def all(self):
    self.cursor.execute("SELECT id, name, bank_account FROM persons")
    results = self.cursor.fetchall()
    persons = []
    for row in results:
      persons.append(PersonEntity(id=row[0], name=row[1], bank_account=row[2]))
    return persons

  def get_by_id(self, id):
    self.cursor.execute("SELECT id, name, bank_account FROM persons WHERE id = %s", (id,))
    result = self.cursor.fetchone()
    if result:
      return PersonEntity(id=result[0], name=result[1], bank_account=result[2])
    return None

  def get_by_name(self, name):
    self.cursor.execute("SELECT id, name, bank_account FROM persons WHERE name = %s", (name,))
    result = self.cursor.fetchone()
    if result:
      return PersonEntity(id=result[0], name=result[1], bank_account=result[2])
    return None

  def create(self, name, bank_account=None):
    self.cursor.execute(
      "INSERT INTO persons (name, bank_account) VALUES (%s, %s)",
      (name, bank_account)
    )
    self.db.commit()
    return self.get_by_id(self.cursor.lastrowid)

  def update(self, person: PersonEntity):
    self.cursor.execute(
      "UPDATE persons SET name = %s, bank_account = %s WHERE id = %s",
      (person.name, person.bank_account, person.id)
    )
    self.db.commit()

  def delete(self, id):
    self.cursor.execute("DELETE FROM persons WHERE id = %s", (id,))
    self.db.commit()

  # Business Logic
  def get_by_name_or_create(self, name, bank_account=None):
    person = self.get_by_name(name)
    if person:
      return person
    person = self.create(name, bank_account)
    return person