import os

import requests

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5000")

def bill_submit(name, total, payer_name, items):
  url = f"{API_BASE_URL}/bill/submit"
  payload = {
    "name": name,
    "total": total,
    "payer_name": payer_name,
    "items": items
  }
  response = requests.post(url, json=payload)
  return response.json()

def bill_get(bill_id):
  url = f"{API_BASE_URL}/bill/{bill_id}"
  response = requests.get(url)
  return response.json()

def bill_calculate(bill_id):
  url = f"{API_BASE_URL}/bill/{bill_id}/calculate"
  response = requests.get(url)
  return response.json()

def item_add_participant(item_id, participant_name):
  url = f"{API_BASE_URL}/item/{item_id}/add_participant"
  payload = {
    "participant_name": participant_name
  }
  response = requests.post(url, json=payload)
  return response.json()

def item_remove_participant(item_id, participant_name):
  url = f"{API_BASE_URL}/item/{item_id}/remove_participant"
  payload = {
    "participant_name": participant_name
  }
  response = requests.post(url, json=payload)
  return response.json()