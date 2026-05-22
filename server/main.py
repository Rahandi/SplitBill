import json

from controllers import BillController, GroupController, ItemController
from database.tables import BillsTable, GroupMembersTable, GroupsTable, ItemsTable
from controllers.receipt import parse_receipt
from flask import Flask, request

app = Flask(__name__)
bill_controller = BillController()
group_controller = GroupController()
item_controller = ItemController()

def __success(data):
  return json.dumps({"status": "success", "data": data}), 200

def __error(message, code=400):
  return json.dumps({"status": "error", "error": message}), code

def _passcode():
  return request.headers.get('X-Group-Passcode')

def _int_id(val):
  try:
    return int(val)
  except (TypeError, ValueError):
    return None

def _check_bill_auth(bill):
  """Returns error tuple if bill belongs to a group that denies access, else None."""
  if not bill.group_id:
    return None
  group = GroupsTable().get_by_id(bill.group_id)
  if not group:
    return None
  try:
    group_controller.check_access(group.join_code, _passcode())
  except ValueError:
    return __error("Invalid passcode", 403)
  return None

@app.route('/')
def home():
  return __success("Server is running")

@app.route('/stats', methods=['GET'])
def stats():
  return __success({
    'total_groups': GroupsTable().count(),
    'total_bills': BillsTable().count(),
  })

# Bill routes
@app.route('/bill/<bill_id>', methods=['GET'])
def get_bill(bill_id):
  bid = _int_id(bill_id)
  if bid is None:
    return __error("Invalid bill ID", 400)
  bill_entity = BillsTable().get_by_id(bid)
  if not bill_entity:
    return __error("Bill not found", 404)
  err = _check_bill_auth(bill_entity)
  if err:
    return err
  result = bill_controller.get_bill(bid)
  return __success(result)

@app.route('/bill/<bill_id>/calculate', methods=['GET'])
def calculate_bill(bill_id):
  bid = _int_id(bill_id)
  if bid is None:
    return __error("Invalid bill ID", 400)
  bill_entity = BillsTable().get_by_id(bid)
  if not bill_entity:
    return __error("Bill not found", 404)
  err = _check_bill_auth(bill_entity)
  if err:
    return err
  result = bill_controller.calculate_single_bill(bid)
  if isinstance(result, str) and result.startswith("Error"):
    return __error(result, 400)
  return __success(result)

@app.route('/bill/<bill_id>/settle', methods=['POST'])
def settle_bill(bill_id):
  bid = _int_id(bill_id)
  if bid is None:
    return __error("Invalid bill ID", 400)
  bill_entity = BillsTable().get_by_id(bid)
  if not bill_entity:
    return __error("Bill not found", 404)
  err = _check_bill_auth(bill_entity)
  if err:
    return err
  result = bill_controller.settle_single_bill(bid)
  return __success(result)

@app.route('/bill/<bill_id>', methods=['DELETE'])
def delete_bill(bill_id):
  bid = _int_id(bill_id)
  if bid is None:
    return __error("Invalid bill ID", 400)
  bill_entity = BillsTable().get_by_id(bid)
  if not bill_entity:
    return __error("Bill not found", 404)
  err = _check_bill_auth(bill_entity)
  if err:
    return err
  BillsTable().delete(bid)
  return __success(None)

# Receipt routes
@app.route('/receipt/parse', methods=['POST'])
def receipt_parse():
  if 'image' not in request.files:
    return __error("No image file provided", 400)
  image_bytes = request.files['image'].read()
  if not image_bytes:
    return __error("Empty image file", 400)
  try:
    result = parse_receipt(image_bytes)
  except Exception as e:
    return __error(f"OCR failed: {str(e)}", 500)
  return __success(result)

# Item routes
def _item_bill_auth(item_id):
  """Looks up the bill for an item and checks group access. Returns error tuple or None."""
  item_entity = ItemsTable().get_by_id(item_id)
  if not item_entity:
    return None
  bill_entity = BillsTable().get_by_id(item_entity.bill_id)
  if bill_entity:
    return _check_bill_auth(bill_entity)
  return None

@app.route('/item/<item_id>', methods=['GET'])
def get_item(item_id):
  iid = _int_id(item_id)
  if iid is None:
    return __error("Invalid item ID", 400)
  err = _item_bill_auth(iid)
  if err:
    return err
  item = item_controller.get_item(iid)
  if not item:
    return __error("Item not found", 404)
  return __success(item)

@app.route('/item/<item_id>/add_participant', methods=['POST'])
def add_participant(item_id):
  iid = _int_id(item_id)
  if iid is None:
    return __error("Invalid item ID", 400)
  data = request.get_json(force=True) or {}
  participant_name = data.get('participant_name')
  if not participant_name:
    return __error("Participant name is required", 400)
  err = _item_bill_auth(iid)
  if err:
    return err
  item = item_controller.add_participant(iid, participant_name)
  if not item:
    return __error("Item not found", 404)
  return __success(item)

@app.route('/item/<item_id>/remove_participant', methods=['POST'])
def remove_participant(item_id):
  iid = _int_id(item_id)
  if iid is None:
    return __error("Invalid item ID", 400)
  data = request.get_json(force=True) or {}
  participant_name = data.get('participant_name')
  if not participant_name:
    return __error("Participant name is required", 400)
  err = _item_bill_auth(iid)
  if err:
    return err
  result = item_controller.remove_participant(iid, participant_name)
  if not result:
    return __error("Item not found", 404)
  return __success(result)

# Group routes
@app.route('/group/create', methods=['POST'])
def group_create():
  data = request.get_json(force=True) or {}
  name = data.get('name')
  if not name:
    return __error("Group name is required", 400)
  passcode = data.get('passcode')
  group = group_controller.create_group(name, passcode=passcode)
  return __success(group)

@app.route('/group/<code>', methods=['GET'])
def get_group(code):
  try:
    group = group_controller.check_access(code, _passcode())
  except ValueError:
    return __error("Invalid passcode", 403)
  if not group:
    return __error("Group not found", 404)
  return __success(group.to_dict())

@app.route('/group/<code>/verify', methods=['POST'])
def verify_group(code):
  data = request.get_json() or {}
  passcode = data.get('passcode', '')
  valid = group_controller.verify_passcode(code, passcode)
  return __success({'valid': valid})

@app.route('/group/<code>', methods=['DELETE'])
def delete_group(code):
  try:
    group = group_controller.check_access(code, _passcode())
  except ValueError:
    return __error("Invalid passcode", 403)
  if not group:
    return __error("Group not found", 404)
  GroupsTable().delete(code)
  return __success(None)

@app.route('/group/<code>/bill/submit', methods=['POST'])
def group_bill_submit(code):
  data = request.get_json(force=True) or {}
  try:
    group = group_controller.check_access(code, _passcode())
  except ValueError:
    return __error("Invalid passcode", 403)
  if not group:
    return __error("Group not found", 404)
  name = (data.get('name') or '').strip()
  total = data.get('total')
  payer_name = (data.get('payer_name') or '').strip()
  items = data.get('items')
  if not name:
    return __error("Bill name is required", 400)
  if total is None:
    return __error("Total is required", 400)
  if not payer_name:
    return __error("Payer name is required", 400)
  if items is None:
    return __error("Items are required", 400)
  bill = bill_controller.create_bill(data, group_id=group.id)
  return __success(bill)

@app.route('/group/<code>/bills/unsettled', methods=['GET'])
def group_bills_unsettled(code):
  try:
    group = group_controller.check_access(code, _passcode())
  except ValueError:
    return __error("Invalid passcode", 403)
  if not group:
    return __error("Group not found", 404)
  results = bill_controller.get_all_unsettled(group_id=group.id)
  return __success(results)

@app.route('/group/<code>/bills/settled', methods=['GET'])
def group_bills_settled(code):
  try:
    group = group_controller.check_access(code, _passcode())
  except ValueError:
    return __error("Invalid passcode", 403)
  if not group:
    return __error("Group not found", 404)
  results = bill_controller.get_all_settled(group_id=group.id)
  return __success(results)

@app.route('/group/<code>/bills/calculate', methods=['GET'])
def group_bills_calculate(code):
  try:
    group = group_controller.check_access(code, _passcode())
  except ValueError:
    return __error("Invalid passcode", 403)
  if not group:
    return __error("Group not found", 404)
  results = bill_controller.calculate_all_unsettled_bills(group_id=group.id)
  return __success(results)

@app.route('/group/<code>/bills/settle', methods=['POST'])
def group_bills_settle(code):
  try:
    group = group_controller.check_access(code, _passcode())
  except ValueError:
    return __error("Invalid passcode", 403)
  if not group:
    return __error("Group not found", 404)
  results = bill_controller.settle_all_bills(group_id=group.id)
  return __success(results)

# Group member routes
@app.route('/group/<code>/members', methods=['GET'])
def group_members_list(code):
  try:
    group = group_controller.check_access(code, _passcode())
  except ValueError:
    return __error("Invalid passcode", 403)
  if not group:
    return __error("Group not found", 404)
  members = GroupMembersTable().get_by_group_id(group.id)
  return __success(members)

@app.route('/group/<code>/members', methods=['POST'])
def group_members_add(code):
  data = request.get_json() or {}
  try:
    group = group_controller.check_access(code, _passcode())
  except ValueError:
    return __error("Invalid passcode", 403)
  if not group:
    return __error("Group not found", 404)
  name = (data.get('name') or '').strip()
  if not name:
    return __error("Name is required", 400)
  ok = GroupMembersTable().add(group.id, name)
  if not ok:
    return __error(f"Could not add '{name}' — may already exist", 409)
  members = GroupMembersTable().get_by_group_id(group.id)
  return __success(members)

@app.route('/group/<code>/members/<name>', methods=['DELETE'])
def group_members_remove(code, name):
  try:
    group = group_controller.check_access(code, _passcode())
  except ValueError:
    return __error("Invalid passcode", 403)
  if not group:
    return __error("Group not found", 404)
  GroupMembersTable().remove(group.id, name)
  members = GroupMembersTable().get_by_group_id(group.id)
  return __success(members)

if __name__ == '__main__':
  app.run(host='0.0.0.0', port=5000, debug=False)
