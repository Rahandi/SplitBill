import json

class BillEntity:
  id: int
  name: str
  total: int
  payer_id: int
  settled: bool

  def __init__(self, id, name, total, payer_id, settled):
    self.id = id
    self.name = name
    self.total = total
    self.payer_id = payer_id
    self.settled = settled

  def to_dict(self):
    return {
      "id": self.id,
      "name": self.name,
      "total": self.total,
      "payer_id": self.payer_id,
      "settled": self.settled
    }

  def __str__(self):
    return json.dumps(self.to_dict())