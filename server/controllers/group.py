import hashlib
import secrets

import bcrypt

from database.tables import GroupsTable


def _hash(passcode):
  return bcrypt.hashpw(passcode.encode(), bcrypt.gensalt()).decode()


def _verify(passcode, stored_hash):
  if stored_hash.startswith('$2b$') or stored_hash.startswith('$2a$'):
    return bcrypt.checkpw(passcode.encode(), stored_hash.encode())
  # Legacy SHA-256 hash — accepts existing groups until their passcode is reset
  return hashlib.sha256(passcode.encode()).hexdigest() == stored_hash


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
    return _verify(passcode or '', group.passcode_hash)

  def check_access(self, join_code, passcode):
    """Returns group entity, raises ValueError on wrong passcode, returns None if not found."""
    group = GroupsTable().get_by_code(join_code)
    if not group:
      return None
    if group.passcode_hash is not None:
      if not passcode or not _verify(passcode, group.passcode_hash):
        raise ValueError("Invalid passcode")
    return group
