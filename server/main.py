import json

import mysql.connector
from flask import Flask, request

app = Flask(__name__)

def __success(data):
  return json.dumps({"status": "success", "data": data}), 200

def __error(message, code=400):
  return json.dumps({"status": "error", "error": message}), code

@app.route('/')
def home():
  return __success("Server is running")

@app.route('/bill/submit', methods=['POST'])
def bill_submit():
  if request.method != 'POST':
    return __error("Invalid request method", 405)
  
  data = request.get_json()
  app.logger.info(data)
  return __success("Bill submitted successfully")

if __name__ == '__main__':
  app.run(host='0.0.0.0', port=5000, debug=True)