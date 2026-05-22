import json

class BillEntity:
  id: int
  name: str
  total: int
  payer_id: int
  settled: bool
  group_id: int

  def __init__(self, id, name, total, payer_id, settled, group_id=None):
    self.id = id
    self.name = name
    self.total = total
    self.payer_id = payer_id
    self.settled = settled
    self.group_id = group_id

  def to_dict(self):
    return {
      "id": self.id,
      "name": self.name,
      "total": self.total,
      "payer_id": self.payer_id,
      "settled": self.settled,
      "group_id": self.group_id,
    }

  def __str__(self):
    return json.dumps(self.to_dict())
