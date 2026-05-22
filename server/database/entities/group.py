import json


class GroupEntity:
  id: int
  name: str
  join_code: str
  passcode_hash: str

  def __init__(self, id, name, join_code, passcode_hash):
    self.id = id
    self.name = name
    self.join_code = join_code
    self.passcode_hash = passcode_hash

  def to_dict(self):
    return {
      "id": self.id,
      "name": self.name,
      "join_code": self.join_code,
      "has_passcode": self.passcode_hash is not None,
    }

  def __str__(self):
    return json.dumps(self.to_dict())
