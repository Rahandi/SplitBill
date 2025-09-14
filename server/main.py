import json

from controllers import BillController, ItemController
from flask import Flask, request

app = Flask(__name__)
bill_controller = BillController()
item_controller = ItemController()

def __success(data):
  return json.dumps({"status": "success", "data": data}), 200

def __error(message, code=400):
  return json.dumps({"status": "error", "error": message}), code

@app.route('/')
def home():
  return __success("Server is running")

# Bill routes
@app.route('/bill/submit', methods=['POST'])
def bill_submit():
  if request.method != 'POST':
    return __error("Invalid request method", 405)
  
  data = request.get_json()
  bill = bill_controller.create_bill(data)

  return __success(bill)

@app.route('/bill/<bill_id>', methods=['GET'])
def get_bill(bill_id):
  result = bill_controller.get_bill(bill_id)
  if not result:
    return __error("Bill not found", 404)
  return __success(result)

@app.route('/bill/<bill_id>/calculate', methods=['GET'])
def calculate_bill(bill_id):
  result = bill_controller.calculate_single_bill(bill_id)
  if isinstance(result, str) and result.startswith("Error"):
    return __error(result, 400)
  return __success(result)

@app.route('/bill/<bill_id>/settle', methods=['POST'])
def settle_bill(bill_id):
  result = bill_controller.settle_single_bill(bill_id)
  if not result:
    return __error("Bill not found", 404)
  return __success(result)

@app.route('/bills/unsettled', methods=['GET'])
def get_unsettled_bills():
  results = bill_controller.get_all_unsettled()
  return __success(results)

@app.route('/bills/calculate', methods=['GET'])
def calculate_all_bills():
  results = bill_controller.calculate_all_unsettled_bills()
  return __success(results)

@app.route('/bills/settle', methods=['GET'])
def settle_all_bills():
  results = bill_controller.settle_all_bills()
  return __success(results)

# Item routes
@app.route('/item/<item_id>', methods=['GET'])
def get_item(item_id):
  item = item_controller.get_item(item_id)
  if not item:
    return __error("Item not found", 404)
  return __success(item)

@app.route('/item/<item_id>/add_participant', methods=['POST'])
def add_participant(item_id):
  if request.method != 'POST':
    return __error("Invalid request method", 405)
  
  data = request.get_json()
  participant_name = data.get('participant_name')
  if not participant_name:
    return __error("Participant name is required", 400)
  
  item = item_controller.add_participant(item_id, participant_name)
  if not item:
    return __error("Item not found", 404)
  
  return __success(item)

@app.route('/item/<item_id>/remove_participant', methods=['POST'])
def remove_participant(item_id):
  if request.method != 'POST':
    return __error("Invalid request method", 405)

  data = request.get_json()
  participant_name = data.get('participant_name')
  if not participant_name:
    return __error("Participant name is required", 400)

  item = item_controller.remove_participant(item_id, participant_name)
  if not item:
    return __error("Item not found", 404)

  return __success(item)

if __name__ == '__main__':
  app.run(host='0.0.0.0', port=5000, debug=True)