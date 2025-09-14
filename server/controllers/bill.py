from database.tables import BillsTable, ItemsTable, PersonsTable


class BillController:
  def get_bill(self, bill_id):
    bill_object = {}
    bill = BillsTable().get_by_id(bill_id)
    if not bill:
      return None
    bill_object['id'] = bill.id
    bill_object['name'] = bill.name
    bill_object['total'] = bill.total
    bill_object['settled'] = bill.settled
    bill_object['items'] = []
    items = ItemsTable().get_by_bill_id(bill.id)
    for item in items:
      item_object = {}
      item_object['id'] = item.id
      item_object['name'] = item.name
      item_object['price'] = item.price
      participant_ids = item.get_participant_ids()
      participants = [PersonsTable().get_by_id(pid).to_dict() for pid in participant_ids]
      item_object['participants'] = participants
      bill_object['items'].append(item_object)
    bill_object['payer'] = PersonsTable().get_by_id(bill.payer_id).to_dict()
    return bill_object

  def get_all_unsettled(self):
    return [self.get_bill(bill.id) for bill in BillsTable().get_unsettled()]

  def create_bill(self, data):
    bill_name = data['name']
    items = data['items']
    total = data['total']
    payer_name = data['payer_name'].lower()

    payer = PersonsTable().get_by_name_or_create(payer_name)
    bill = BillsTable().create(bill_name, total, payer.id)
    for item in items:
      item_name = item['name']
      item_price = item['price']
      participants = item['participants']

      item = ItemsTable().create(bill.id, item_name, item_price)
      for participant_name in participants:
        participant = PersonsTable().get_by_name_or_create(participant_name)
        item.add_participant(participant.id)

    return self.get_bill(bill.id)

  def calculate_single_bill(self, bill_id):
    bill = BillsTable().get_by_id(bill_id)
    if not bill:
      return None

    items = ItemsTable().get_by_bill_id(bill.id)
    person_totals = {}
    for item in items:
      participant_ids = item.get_participant_ids()
      if not participant_ids:
        return f"Error: One or more items in {bill.id} has no participants"
      split_price = item.price / len(participant_ids)
      for pid in participant_ids:
        if pid not in person_totals:
          person_totals[pid] = 0
        person_totals[pid] += split_price
    
    item_total = sum(item.price for item in items)
    for pid in person_totals:
      person_totals[pid] = person_totals[pid] * (bill.total / item_total)

    result = {}
    result['payer'] = PersonsTable().get_by_id(bill.payer_id).to_dict()
    result['shares'] = []
    for pid, amount in person_totals.items():
      person = PersonsTable().get_by_id(pid)
      result['shares'].append({
        'name': person.name,
        'amount': int(round(amount, 0))
      })

    return result

  def calculate_all_unsettled_bills(self):
    bills = BillsTable().get_unsettled()
    debt_map = {}  # person -> {to_whom -> amount}
    
    # Calculate raw debts from all bills
    for bill in bills:
      result = self.calculate_single_bill(bill.id)
      if isinstance(result, str) and result.startswith("Error"):
        continue
        
      payer = result['payer']['name']
      for share in result['shares']:
        debtor = share['name']
        amount = share['amount']
        
        if debtor == payer:
          continue
          
        # Initialize nested dictionaries if needed
        if debtor not in debt_map:
          debt_map[debtor] = {}
        if payer not in debt_map[debtor]:
          debt_map[debtor][payer] = 0
          
        debt_map[debtor][payer] += amount
    
    # Simplify debts by canceling out mutual debts
    for debtor in list(debt_map.keys()):
      for creditor in list(debt_map.get(debtor, {}).keys()):
        # Check if there's a reverse debt (creditor owes debtor)
        if creditor in debt_map and debtor in debt_map[creditor]:
          # Get amounts owed in both directions
          debt_amount = debt_map[debtor][creditor]
          reverse_amount = debt_map[creditor][debtor]
          
          # Cancel out the smaller debt against the larger one
          if debt_amount >= reverse_amount:
            debt_map[debtor][creditor] -= reverse_amount
            del debt_map[creditor][debtor]
            if not debt_map[creditor]:  # Remove empty dictionary
              del debt_map[creditor]
          else:
            debt_map[creditor][debtor] -= debt_amount
            del debt_map[debtor][creditor]
            if not debt_map[debtor]:  # Remove empty dictionary
              del debt_map[debtor]
              
        # Remove zero debts
        if debtor in debt_map and creditor in debt_map.get(debtor, {}) and debt_map[debtor][creditor] == 0:
          del debt_map[debtor][creditor]
          if not debt_map[debtor]:
            del debt_map[debtor]
    
    return debt_map

  def settle_single_bill(self, bill_id):
    bill = BillsTable().get_by_id(bill_id)
    if not bill:
      return None
    bill.settled = True
    BillsTable().update(bill)
    return self.get_bill(bill.id)

  def settle_all_bills(self):
    bills = BillsTable().get_unsettled()
    settled_bills = []
    for bill in bills:
      bill.settled = True
      BillsTable().update(bill)
      settled_bills.append(self.get_bill(bill.id))
    return settled_bills