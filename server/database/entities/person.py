import json

class PersonEntity:
  id: int
  name: str
  bank_account: str

  def __init__(self, id, name, bank_account):
    self.id = id
    self.name = name
    self.bank_account = bank_account

  def to_dict(self):
    return {
      "id": self.id,
      "name": self.name,
      "bank_account": self.bank_account
    }

  def __str__(self):
    return json.dumps(self.to_dict())