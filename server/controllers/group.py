import hashlib
import secrets

from database.tables import GroupsTable


def _hash(passcode):
  return hashlib.sha256(passcode.encode()).hexdigest()


class GroupController:
  def create_group(self, name, passcode=None):
    join_code = secrets.token_urlsafe(6)[:8]
    passcode_hash = _hash(passcode) if passcode else None
    group = GroupsTable().create(name, join_code, passcode_hash)
    return group.to_dict()

  def get_group(self, join_code):
    group = GroupsTable().get_by_code(join_code)
    if not group:
      return None
    return group.to_dict()

  def verify_passcode(self, join_code, passcode):
    group = GroupsTable().get_by_code(join_code)
    if not group:
      return False
    if group.passcode_hash is None:
      return True
    return group.passcode_hash == _hash(passcode or '')

  def check_access(self, join_code, passcode):
    """Returns group entity dict, raises ValueError on wrong passcode, returns None if not found."""
    group = GroupsTable().get_by_code(join_code)
    if not group:
      return None
    if group.passcode_hash is not None:
      if not passcode or group.passcode_hash != _hash(passcode):
        raise ValueError("Invalid passcode")
    return group
