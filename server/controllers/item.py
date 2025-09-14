from database.tables import ItemsTable, PersonsTable

class ItemController:
  def get_item(self, item_id):
    item_object = {}
    item = ItemsTable().get_by_id(item_id)
    if not item:
      return None
    item_object['id'] = item.id
    item_object['name'] = item.name
    item_object['price'] = item.price
    participant_ids = item.get_participant_ids()
    participants = [PersonsTable().get_by_id(pid).to_dict() for pid in participant_ids]
    item_object['participants'] = participants
    return item_object

  def add_participant(self, item_id, participant_name):
    item = ItemsTable().get_by_id(item_id)
    if not item:
      return None
    existing_participants = item.get_participant_ids()
    for pid in existing_participants:
      person = PersonsTable().get_by_id(pid)
      if person and person.name == participant_name:
        return self.get_item(item_id)
    person = PersonsTable().get_by_name_or_create(participant_name)
    item.add_participant(person.id)
    return self.get_item(item_id)

  def remove_participant(self, item_id, participant_name):
    item = ItemsTable().get_by_id(item_id)
    if not item:
      return None
    person = PersonsTable().get_by_name(participant_name)
    if not person:
      return None
    item.remove_participant(person.id)
    return self.get_item(item_id)